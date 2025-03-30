import * as sql from 'mssql';
import * as logger from '../../utils/logger';

// Database connection
let dbConnectionPool: sql.ConnectionPool | null = null;

async function getDbConnection(): Promise<sql.ConnectionPool> {
  if (!dbConnectionPool) {
    const connectionString = process.env.DATABASE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error("Database connection string not configured");
    }
    
    dbConnectionPool = await new sql.ConnectionPool(connectionString).connect();
  }
  return dbConnectionPool;
}

/**
 * Updates metrics for all PRs
 * This is meant to be run on a schedule
 */
export async function updateAllPRMetrics(): Promise<void> {
  try {
    const pool = await getDbConnection();
    
    // First, update stale PR flags
    await pool.request().query(`
      UPDATE PRMetrics
      SET 
        IsStale = CASE 
          WHEN pr.State = 'open' AND DATEDIFF(day, pr.CreatedAt, GETUTCDATE()) >= 7 THEN 1 
          ELSE 0 
        END,
        LastCalculatedAt = GETUTCDATE()
      FROM PRMetrics m
      JOIN PullRequests pr ON m.PRId = pr.PRId
    `);
    
    // Update comment counts
    await pool.request().query(`
      UPDATE PRMetrics
      SET 
        NumComments = (
          SELECT COUNT(*) 
          FROM PRReviews 
          WHERE PRId = m.PRId AND State = 'COMMENTED'
        ),
        LastCalculatedAt = GETUTCDATE()
      FROM PRMetrics m
    `);
    
    logger.info('PR metrics updated successfully');
  } catch (error) {
    logger.error(`Error updating PR metrics: ${error.message}`);
    throw error;
  }
}

/**
 * Get overall organization metrics
 */
export async function getOrganizationMetrics(orgName: string): Promise<any> {
  try {
    const pool = await getDbConnection();
    const request = pool.request();
    
    request.input('orgName', sql.NVarChar, orgName);
    
    // Get overall PR metrics
    const result = await request.query(`
      SELECT 
        COUNT(*) as TotalPRs,
        COUNT(CASE WHEN pr.State = 'open' THEN 1 END) as OpenPRs,
        COUNT(CASE WHEN pr.State = 'merged' THEN 1 END) as MergedPRs,
        COUNT(CASE WHEN pr.State = 'closed' AND pr.MergedAt IS NULL THEN 1 END) as ClosedPRs,
        AVG(CAST(m.TimeToFirstReview as FLOAT)) as AvgTimeToFirstReview,
        AVG(CAST(m.TimeToMerge as FLOAT)) as AvgTimeToMerge,
        AVG(CAST(m.NumReviewers as FLOAT)) as AvgReviewers,
        COUNT(CASE WHEN m.IsStale = 1 THEN 1 END) as StalePRs
      FROM PullRequests pr
      JOIN Repositories r ON pr.RepoId = r.RepoId
      JOIN Organizations o ON r.OrgId = o.OrgId
      LEFT JOIN PRMetrics m ON pr.PRId = m.PRId
      WHERE o.Name = @orgName
    `);
    
    if (result.recordset.length === 0) {
      return null;
    }
    
    const metrics = result.recordset[0];
    
    // Get repositories with most PRs
    const reposResult = await request.query(`
      SELECT 
        r.Name as RepoName,
        COUNT(*) as PRCount
      FROM PullRequests pr
      JOIN Repositories r ON pr.RepoId = r.RepoId
      JOIN Organizations o ON r.OrgId = o.OrgId
      WHERE o.Name = @orgName
      GROUP BY r.Name
      ORDER BY PRCount DESC
      OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY
    `);
    
    // Get team members with most contributions
    const membersResult = await request.query(`
      WITH PRCreators AS (
        SELECT 
          tm.MemberId,
          tm.Username,
          COUNT(*) as PRsCreated
        FROM PullRequests pr
        JOIN TeamMembers tm ON pr.CreatorId = tm.MemberId
        JOIN Repositories r ON pr.RepoId = r.RepoId
        JOIN Organizations o ON r.OrgId = o.OrgId
        WHERE o.Name = @orgName
        GROUP BY tm.MemberId, tm.Username
      ),
      PRReviewers AS (
        SELECT 
          tm.MemberId,
          tm.Username,
          COUNT(DISTINCT prr.PRId) as PRsReviewed
        FROM PRReviews prr
        JOIN TeamMembers tm ON prr.ReviewerId = tm.MemberId
        JOIN PullRequests pr ON prr.PRId = pr.PRId
        JOIN Repositories r ON pr.RepoId = r.RepoId
        JOIN Organizations o ON r.OrgId = o.OrgId
        WHERE o.Name = @orgName
        GROUP BY tm.MemberId, tm.Username
      )
      SELECT 
        COALESCE(c.Username, r.Username) as Username,
        COALESCE(c.PRsCreated, 0) as PRsCreated,
        COALESCE(r.PRsReviewed, 0) as PRsReviewed,
        COALESCE(c.PRsCreated, 0) + COALESCE(r.PRsReviewed, 0) as TotalActivity
      FROM PRCreators c
      FULL OUTER JOIN PRReviewers r ON c.MemberId = r.MemberId
      ORDER BY TotalActivity DESC, PRsCreated DESC
      OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY
    `);
    
    return {
      organization: orgName,
      prMetrics: {
        total: metrics.TotalPRs,
        open: metrics.OpenPRs,
        merged: metrics.MergedPRs,
        closed: metrics.ClosedPRs,
        stale: metrics.StalePRs,
        averageTimeToFirstReview: metrics.AvgTimeToFirstReview 
          ? (metrics.AvgTimeToFirstReview / 60).toFixed(1) + ' hours' 
          : 'N/A',
        averageTimeToMerge: metrics.AvgTimeToMerge 
          ? (metrics.AvgTimeToMerge / 60).toFixed(1) + ' hours' 
          : 'N/A',
        averageReviewers: metrics.AvgReviewers 
          ? metrics.AvgReviewers.toFixed(1) 
          : '0'
      },
      topRepositories: reposResult.recordset.map(r => ({
        name: r.RepoName,
        prCount: r.PRCount
      })),
      topContributors: membersResult.recordset.map(m => ({
        username: m.Username,
        prsCreated: m.PRsCreated,
        prsReviewed: m.PRsReviewed,
        totalActivity: m.TotalActivity
      }))
    };
  } catch (error) {
    logger.error(`Error getting organization metrics: ${error.message}`);
    throw error;
  }
}

/**
 * Get trend data for PRs over time
 */
export async function getPRTrends(orgName: string, timespan: 'week' | 'month' = 'month'): Promise<any> {
  try {
    const pool = await getDbConnection();
    const request = pool.request();
    
    request.input('orgName', sql.NVarChar, orgName);
    
    // Determine the date grouping format and period
    let dateFormat: string;
    let daysAgo: number;
    
    if (timespan === 'week') {
      dateFormat = 'YYYY-MM-DD';  // Daily for a week
      daysAgo = 7;
    } else {
      dateFormat = 'YYYY-WW';     // Weekly for a month
      daysAgo = 30;
    }
    
    // Get date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    
    request.input('startDate', sql.DateTime2, startDate);
    
    // Get PR creation trend
    const creationResult = await request.query(`
      SELECT 
        FORMAT(pr.CreatedAt, '${dateFormat}') as TimePeriod,
        COUNT(*) as Count
      FROM PullRequests pr
      JOIN Repositories r ON pr.RepoId = r.RepoId
      JOIN Organizations o ON r.OrgId = o.OrgId
      WHERE o.Name = @orgName
      AND pr.CreatedAt >= @startDate
      GROUP BY FORMAT(pr.CreatedAt, '${dateFormat}')
      ORDER BY TimePeriod
    `);
    
    // Get PR merge trend
    const mergeResult = await request.query(`
      SELECT 
        FORMAT(pr.MergedAt, '${dateFormat}') as TimePeriod,
        COUNT(*) as Count
      FROM PullRequests pr
      JOIN Repositories r ON pr.RepoId = r.RepoId
      JOIN Organizations o ON r.OrgId = o.OrgId
      WHERE o.Name = @orgName
      AND pr.MergedAt IS NOT NULL
      AND pr.MergedAt >= @startDate
      GROUP BY FORMAT(pr.MergedAt, '${dateFormat}')
      ORDER BY TimePeriod
    `);
    
    return {
      organization: orgName,
      timespan,
      created: creationResult.recordset.map(r => ({
        period: r.TimePeriod,
        count: r.Count
      })),
      merged: mergeResult.recordset.map(r => ({
        period: r.TimePeriod,
        count: r.Count
      }))
    };
  } catch (error) {
    logger.error(`Error getting PR trends: ${error.message}`);
    throw error;
  }
}
import * as sql from 'mssql';
import * as logger from '../../utils/logger';
import { PullRequest, PRReview } from '../schema';

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
 * Get all open pull requests
 */
export async function getOpenPullRequests(): Promise<PullRequest[]> {
  try {
    const pool = await getDbConnection();
    const result = await pool.request().query(`
      SELECT 
        pr.*, 
        r.Name as RepoName, 
        o.Name as OrgName,
        tm.Username as CreatorUsername
      FROM PullRequests pr
      JOIN Repositories r ON pr.RepoId = r.RepoId
      JOIN Organizations o ON r.OrgId = o.OrgId
      JOIN TeamMembers tm ON pr.CreatorId = tm.MemberId
      WHERE pr.State = 'open'
      ORDER BY pr.CreatedAt DESC
    `);
    
    return result.recordset;
  } catch (error) {
    logger.error(`Error getting open pull requests: ${error.message}`);
    throw error;
  }
}

/**
 * Get stale pull requests (open for more than 7 days)
 */
export async function getStalePullRequests(): Promise<any[]> {
  try {
    const pool = await getDbConnection();
    const result = await pool.request().query(`
      SELECT 
        pr.PRId,
        pr.Number,
        pr.Title,
        pr.State,
        pr.CreatedAt,
        r.Name as RepoName,
        o.Name as OrgName,
        tm.Username as CreatorUsername,
        DATEDIFF(day, pr.CreatedAt, GETUTCDATE()) as DaysOpen
      FROM PullRequests pr
      JOIN Repositories r ON pr.RepoId = r.RepoId
      JOIN Organizations o ON r.OrgId = o.OrgId
      JOIN TeamMembers tm ON pr.CreatorId = tm.MemberId
      WHERE pr.State = 'open'
      AND DATEDIFF(day, pr.CreatedAt, GETUTCDATE()) >= 7
      ORDER BY pr.CreatedAt ASC
    `);
    
    // Format the results for easier consumption
    return result.recordset.map(pr => ({
      id: pr.PRId,
      number: pr.Number,
      title: pr.Title,
      url: `https://github.com/${pr.OrgName}/${pr.RepoName}/pull/${pr.Number}`,
      repository: `${pr.OrgName}/${pr.RepoName}`,
      author: pr.CreatorUsername,
      daysOpen: pr.DaysOpen,
      createdAt: pr.CreatedAt
    }));
  } catch (error) {
    logger.error(`Error getting stale pull requests: ${error.message}`);
    throw error;
  }
}

/**
 * Add a new PR review to the database
 */
export async function addPRReview(review: PRReview): Promise<number> {
  try {
    const pool = await getDbConnection();
    const request = pool.request();
    
    request.input('prId', sql.Int, review.prId);
    request.input('reviewerId', sql.Int, review.reviewerId);
    request.input('state', sql.NVarChar, review.state);
    request.input('submittedAt', sql.DateTime2, review.submittedAt);
    
    const result = await request.query(`
      INSERT INTO PRReviews (PRId, ReviewerId, State, SubmittedAt)
      VALUES (@prId, @reviewerId, @state, @submittedAt)
      OUTPUT INSERTED.ReviewId
    `);
    
    return result.recordset[0].ReviewId;
  } catch (error) {
    logger.error(`Error adding PR review: ${error.message}`);
    throw error;
  }
}

/**
 * Get weekly PR statistics
 */
export async function getWeeklyPRStats(): Promise<any> {
  try {
    const pool = await getDbConnection();
    
    // Get one week ago date
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    // Format dates for display
    const startDate = oneWeekAgo.toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    
    // Get count of PRs created in last week
    const createdResult = await pool.request()
      .input('startDate', sql.DateTime2, oneWeekAgo)
      .query(`
        SELECT COUNT(*) as Count
        FROM PullRequests
        WHERE CreatedAt >= @startDate
      `);
    
    // Get count of PRs merged in last week
    const mergedResult = await pool.request()
      .input('startDate', sql.DateTime2, oneWeekAgo)
      .query(`
        SELECT COUNT(*) as Count
        FROM PullRequests
        WHERE MergedAt IS NOT NULL
        AND MergedAt >= @startDate
      `);
    
    // Get count of PRs closed (not merged) in last week
    const closedResult = await pool.request()
      .input('startDate', sql.DateTime2, oneWeekAgo)
      .query(`
        SELECT COUNT(*) as Count
        FROM PullRequests
        WHERE State = 'closed'
        AND MergedAt IS NULL
        AND ClosedAt >= @startDate
      `);
    
    // Get count of currently open PRs
    const openResult = await pool.request()
      .query(`
        SELECT COUNT(*) as Count
        FROM PullRequests
        WHERE State = 'open'
      `);
    
    // Get top contributors
    const contributorsResult = await pool.request()
      .input('startDate', sql.DateTime2, oneWeekAgo)
      .query(`
        WITH PRCreators AS (
          SELECT 
            tm.MemberId,
            tm.Username,
            COUNT(*) as PRsCreated
          FROM PullRequests pr
          JOIN TeamMembers tm ON pr.CreatorId = tm.MemberId
          WHERE pr.CreatedAt >= @startDate
          GROUP BY tm.MemberId, tm.Username
        ),
        PRReviewers AS (
          SELECT 
            tm.MemberId,
            tm.Username,
            COUNT(DISTINCT prr.PRId) as PRsReviewed
          FROM PRReviews prr
          JOIN TeamMembers tm ON prr.ReviewerId = tm.MemberId
          WHERE prr.SubmittedAt >= @startDate
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
    
    // Format the results
    return {
      startDate,
      endDate,
      created: createdResult.recordset[0].Count,
      merged: mergedResult.recordset[0].Count,
      closed: closedResult.recordset[0].Count,
      open: openResult.recordset[0].Count,
      topContributors: contributorsResult.recordset.map(c => ({
        name: c.Username,
        prsCreated: c.PRsCreated,
        prsReviewed: c.PRsReviewed,
        totalActivity: c.TotalActivity
      }))
    };
  } catch (error) {
    logger.error(`Error getting weekly PR stats: ${error.message}`);
    throw error;
  }
}

/**
 * Get PR metrics for a specific repository
 */
export async function getRepositoryPRMetrics(repoName: string, orgName: string): Promise<any> {
  try {
    const pool = await getDbConnection();
    const request = pool.request();
    
    request.input('repoName', sql.NVarChar, repoName);
    request.input('orgName', sql.NVarChar, orgName);
    
    // Get average metrics
    const metricsResult = await request.query(`
      SELECT 
        AVG(CAST(m.TimeToFirstReview as FLOAT)) as AvgTimeToFirstReview,
        AVG(CAST(m.TimeToMerge as FLOAT)) as AvgTimeToMerge,
        AVG(CAST(m.NumReviewers as FLOAT)) as AvgReviewers,
        COUNT(CASE WHEN m.IsStale = 1 THEN 1 END) as StaleCount,
        COUNT(*) as TotalPRs
      FROM PRMetrics m
      JOIN PullRequests pr ON m.PRId = pr.PRId
      JOIN Repositories r ON pr.RepoId = r.RepoId
      JOIN Organizations o ON r.OrgId = o.OrgId
      WHERE r.Name = @repoName
      AND o.Name = @orgName
    `);
    
    if (metricsResult.recordset.length === 0) {
      return null;
    }
    
    // Convert minutes to hours for readability
    const metrics = metricsResult.recordset[0];
    return {
      repository: `${orgName}/${repoName}`,
      averageTimeToFirstReview: metrics.AvgTimeToFirstReview 
        ? (metrics.AvgTimeToFirstReview / 60).toFixed(1) + ' hours' 
        : 'N/A',
      averageTimeToMerge: metrics.AvgTimeToMerge 
        ? (metrics.AvgTimeToMerge / 60).toFixed(1) + ' hours' 
        : 'N/A',
      averageReviewers: metrics.AvgReviewers 
        ? metrics.AvgReviewers.toFixed(1) 
        : '0',
      staleCount: metrics.StaleCount,
      totalPRs: metrics.TotalPRs,
      stalePercentage: metrics.TotalPRs 
        ? ((metrics.StaleCount / metrics.TotalPRs) * 100).toFixed(1) + '%' 
        : '0%'
    };
  } catch (error) {
    logger.error(`Error getting repository PR metrics: ${error.message}`);
    throw error;
  }
}

/**
 * Get PR metrics for a specific user
 */
export async function getUserPRMetrics(username: string): Promise<any> {
  try {
    const pool = await getDbConnection();
    const request = pool.request();
    
    request.input('username', sql.NVarChar, username);
    
    // Get user's PR creation metrics
    const creationResult = await request.query(`
      SELECT 
        COUNT(*) as TotalCreated,
        COUNT(CASE WHEN pr.State = 'open' THEN 1 END) as OpenCount,
        COUNT(CASE WHEN pr.State = 'merged' THEN 1 END) as MergedCount,
        COUNT(CASE WHEN pr.State = 'closed' AND pr.MergedAt IS NULL THEN 1 END) as ClosedCount,
        AVG(CAST(m.TimeToMerge as FLOAT)) as AvgTimeToMerge
      FROM PullRequests pr
      JOIN TeamMembers tm ON pr.CreatorId = tm.MemberId
      LEFT JOIN PRMetrics m ON pr.PRId = m.PRId
      WHERE tm.Username = @username
    `);
    
    // Get user's PR review metrics
    const reviewResult = await request.query(`
      SELECT 
        COUNT(DISTINCT prr.PRId) as TotalReviewed,
        COUNT(DISTINCT CASE WHEN prr.State = 'APPROVED' THEN prr.PRId END) as ApprovedCount,
        COUNT(DISTINCT CASE WHEN prr.State = 'CHANGES_REQUESTED' THEN prr.PRId END) as ChangesRequestedCount,
        AVG(DATEDIFF(minute, pr.CreatedAt, prr.SubmittedAt)) as AvgTimeToReview
      FROM PRReviews prr
      JOIN TeamMembers tm ON prr.ReviewerId = tm.MemberId
      JOIN PullRequests pr ON prr.PRId = pr.PRId
      WHERE tm.Username = @username
    `);
    
    if (creationResult.recordset.length === 0 || reviewResult.recordset.length === 0) {
      return null;
    }
    
    const creation = creationResult.recordset[0];
    const review = reviewResult.recordset[0];
    
    return {
      username,
      created: {
        total: creation.TotalCreated,
        open: creation.OpenCount,
        merged: creation.MergedCount,
        closed: creation.ClosedCount,
        averageTimeToMerge: creation.AvgTimeToMerge 
          ? (creation.AvgTimeToMerge / 60).toFixed(1) + ' hours' 
          : 'N/A'
      },
      reviewed: {
        total: review.TotalReviewed,
        approved: review.ApprovedCount,
        changesRequested: review.ChangesRequestedCount,
        averageTimeToReview: review.AvgTimeToReview 
          ? (review.AvgTimeToReview / 60).toFixed(1) + ' hours' 
          : 'N/A'
      },
      ratio: {
        reviewsPerPR: creation.TotalCreated > 0 
          ? (review.TotalReviewed / creation.TotalCreated).toFixed(1) 
          : '0'
      }
    };
  } catch (error) {
    logger.error(`Error getting user PR metrics: ${error.message}`);
    throw error;
  }
}
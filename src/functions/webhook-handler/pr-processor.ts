import { Context } from "@azure/functions";
import * as sql from 'mssql';
import { sendSlackNotification } from '../../notification/slack-service';

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
 * Process a pull request event
 * 
 * @param payload - The webhook payload
 * @param context - Azure function context for logging
 */
export async function processPREvent(payload: any, context: Context): Promise<void> {
  const action = payload.action;
  const pr = payload.pull_request;
  const repository = payload.repository;
  const organization = payload.organization;

  context.log(`Processing PR action: ${action} for PR #${pr.number} in ${repository.full_name}`);

  try {
    // Connect to database
    const pool = await getDbConnection();

    // Handle different PR actions
    switch (action) {
      case 'opened':
        await handlePrOpened(pool, pr, repository, organization, context);
        break;
      case 'closed':
        await handlePrClosed(pool, pr, repository, context);
        break;
      case 'edited':
        await handlePrEdited(pool, pr, repository, context);
        break;
      default:
        context.log.info(`Ignoring PR action: ${action}`);
    }
  } catch (error) {
    context.log.error(`Error processing PR event: ${error.message}`);
    throw error;
  }
}

/**
 * Handle a new PR being opened
 */
async function handlePrOpened(
  pool: sql.ConnectionPool,
  pr: any,
  repository: any,
  organization: any,
  context: Context
): Promise<void> {
  // Ensure organization exists
  let orgId = await ensureOrganization(pool, organization);
  
  // Ensure repository exists
  let repoId = await ensureRepository(pool, repository, orgId);
  
  // Ensure team member exists
  let creatorId = await ensureTeamMember(pool, pr.user, orgId);
  
  // Insert the PR
  await insertPullRequest(pool, pr, repoId, creatorId);
  
  // Send notification
  await sendPrNotification(pr, repository, 'opened');
  
  context.log(`PR #${pr.number} stored in database`);
}

/**
 * Handle a PR being closed
 */
async function handlePrClosed(
  pool: sql.ConnectionPool,
  pr: any,
  repository: any,
  context: Context
): Promise<void> {
  // Update the PR status
  const request = pool.request();
  request.input('repoName', sql.NVarChar, repository.name);
  request.input('repoOwner', sql.NVarChar, repository.owner.login);
  request.input('prNumber', sql.Int, pr.number);
  request.input('state', sql.NVarChar, pr.merged ? 'merged' : 'closed');
  request.input('closedAt', sql.DateTime2, new Date());
  request.input('mergedAt', sql.DateTime2, pr.merged_at ? new Date(pr.merged_at) : null);
  
  await request.query(`
    UPDATE pr
    SET 
      State = @state,
      ClosedAt = @closedAt,
      MergedAt = @mergedAt,
      UpdatedAt = GETUTCDATE()
    FROM PullRequests pr
    JOIN Repositories r ON pr.RepoId = r.RepoId
    JOIN Organizations o ON r.OrgId = o.OrgId
    WHERE r.Name = @repoName
    AND o.Name = @repoOwner
    AND pr.Number = @prNumber
  `);

  // Calculate and store metrics
  await calculatePrMetrics(pool, pr, repository);
  
  // Send notification
  await sendPrNotification(pr, repository, pr.merged ? 'merged' : 'closed');
  
  context.log(`PR #${pr.number} marked as ${pr.merged ? 'merged' : 'closed'}`);
}

/**
 * Handle a PR being edited
 */
async function handlePrEdited(
  pool: sql.ConnectionPool,
  pr: any,
  repository: any,
  context: Context
): Promise<void> {
  const request = pool.request();
  request.input('repoName', sql.NVarChar, repository.name);
  request.input('repoOwner', sql.NVarChar, repository.owner.login);
  request.input('prNumber', sql.Int, pr.number);
  request.input('title', sql.NVarChar, pr.title);
  request.input('description', sql.NVarChar, pr.body || '');
  
  await request.query(`
    UPDATE pr
    SET 
      Title = @title,
      Description = @description,
      UpdatedAt = GETUTCDATE()
    FROM PullRequests pr
    JOIN Repositories r ON pr.RepoId = r.RepoId
    JOIN Organizations o ON r.OrgId = o.OrgId
    WHERE r.Name = @repoName
    AND o.Name = @repoOwner
    AND pr.Number = @prNumber
  `);
  
  context.log(`PR #${pr.number} updated`);
}

/**
 * Ensure organization exists in database
 */
async function ensureOrganization(
  pool: sql.ConnectionPool,
  organization: any
): Promise<number> {
  if (!organization) {
    throw new Error("Organization data is missing");
  }
  
  const request = pool.request();
  request.input('name', sql.NVarChar, organization.login);
  request.input('githubId', sql.NVarChar, organization.id.toString());
  
  const result = await request.query(`
    MERGE INTO Organizations AS target
    USING (SELECT @name AS Name, @githubId AS GitHubId) AS source
    ON target.GitHubId = source.GitHubId
    WHEN MATCHED THEN
      UPDATE SET Name = source.Name, UpdatedAt = GETUTCDATE()
    WHEN NOT MATCHED THEN
      INSERT (Name, GitHubId)
      VALUES (source.Name, source.GitHubId)
    OUTPUT INSERTED.OrgId;
  `);
  
  return result.recordset[0].OrgId;
}

/**
 * Ensure repository exists in database
 */
async function ensureRepository(
  pool: sql.ConnectionPool,
  repository: any,
  orgId: number
): Promise<number> {
  const request = pool.request();
  request.input('orgId', sql.Int, orgId);
  request.input('name', sql.NVarChar, repository.name);
  request.input('githubId', sql.NVarChar, repository.id.toString());
  request.input('isPrivate', sql.Bit, repository.private ? 1 : 0);
  
  const result = await request.query(`
    MERGE INTO Repositories AS target
    USING (SELECT @orgId AS OrgId, @name AS Name, @githubId AS GitHubId, @isPrivate AS IsPrivate) AS source
    ON target.GitHubId = source.GitHubId
    WHEN MATCHED THEN
      UPDATE SET 
        Name = source.Name, 
        IsPrivate = source.IsPrivate, 
        UpdatedAt = GETUTCDATE()
    WHEN NOT MATCHED THEN
      INSERT (OrgId, Name, GitHubId, IsPrivate)
      VALUES (source.OrgId, source.Name, source.GitHubId, source.IsPrivate)
    OUTPUT INSERTED.RepoId;
  `);
  
  return result.recordset[0].RepoId;
}

/**
 * Ensure team member exists in database
 */
async function ensureTeamMember(
  pool: sql.ConnectionPool,
  user: any,
  orgId: number
): Promise<number> {
  const request = pool.request();
  request.input('orgId', sql.Int, orgId);
  request.input('username', sql.NVarChar, user.login);
  request.input('displayName', sql.NVarChar, user.name || null);
  request.input('githubId', sql.NVarChar, user.id.toString());
  
  const result = await request.query(`
    MERGE INTO TeamMembers AS target
    USING (SELECT @orgId AS OrgId, @username AS Username, @displayName AS DisplayName, @githubId AS GitHubId) AS source
    ON target.GitHubId = source.GitHubId
    WHEN MATCHED THEN
      UPDATE SET 
        Username = source.Username, 
        DisplayName = source.DisplayName, 
        UpdatedAt = GETUTCDATE()
    WHEN NOT MATCHED THEN
      INSERT (OrgId, Username, DisplayName, GitHubId)
      VALUES (source.OrgId, source.Username, source.DisplayName, source.GitHubId)
    OUTPUT INSERTED.MemberId;
  `);
  
  return result.recordset[0].MemberId;
}

/**
 * Insert a new pull request
 */
async function insertPullRequest(
  pool: sql.ConnectionPool,
  pr: any,
  repoId: number,
  creatorId: number
): Promise<number> {
  const request = pool.request();
  request.input('repoId', sql.Int, repoId);
  request.input('number', sql.Int, pr.number);
  request.input('title', sql.NVarChar, pr.title);
  request.input('description', sql.NVarChar, pr.body || '');
  request.input('creatorId', sql.Int, creatorId);
  request.input('state', sql.NVarChar, pr.state);
  request.input('createdAt', sql.DateTime2, new Date(pr.created_at));
  request.input('updatedAt', sql.DateTime2, new Date(pr.updated_at));
  
  const result = await request.query(`
    INSERT INTO PullRequests 
      (RepoId, Number, Title, Description, CreatorId, State, CreatedAt, UpdatedAt)
    VALUES 
      (@repoId, @number, @title, @description, @creatorId, @state, @createdAt, @updatedAt)
    OUTPUT INSERTED.PRId;
  `);
  
  // Initialize metrics record
  const prId = result.recordset[0].PRId;
  await initializePrMetrics(pool, prId, pr);
  
  return prId;
}

/**
 * Initialize metrics for a new PR
 */
async function initializePrMetrics(
  pool: sql.ConnectionPool,
  prId: number,
  pr: any
): Promise<void> {
  const request = pool.request();
  request.input('prId', sql.Int, prId);
  request.input('numFileChanges', sql.Int, pr.changed_files || 0);
  request.input('numLinesAdded', sql.Int, pr.additions || 0);
  request.input('numLinesRemoved', sql.Int, pr.deletions || 0);
  
  await request.query(`
    INSERT INTO PRMetrics 
      (PRId, NumFileChanges, NumLinesAdded, NumLinesRemoved)
    VALUES 
      (@prId, @numFileChanges, @numLinesAdded, @numLinesRemoved);
  `);
}

/**
 * Calculate metrics for a PR and store them
 */
async function calculatePrMetrics(
  pool: sql.ConnectionPool,
  pr: any,
  repository: any
): Promise<void> {
  const request = pool.request();
  request.input('repoName', sql.NVarChar, repository.name);
  request.input('repoOwner', sql.NVarChar, repository.owner.login);
  request.input('prNumber', sql.Int, pr.number);
  
  // Get PR ID
  const prResult = await request.query(`
    SELECT pr.PRId 
    FROM PullRequests pr
    JOIN Repositories r ON pr.RepoId = r.RepoId
    JOIN Organizations o ON r.OrgId = o.OrgId
    WHERE r.Name = @repoName
    AND o.Name = @repoOwner
    AND pr.Number = @prNumber
  `);
  
  if (prResult.recordset.length === 0) {
    throw new Error(`PR #${pr.number} not found in database`);
  }
  
  const prId = prResult.recordset[0].PRId;
  
  // Get first review time
  const reviewRequest = pool.request();
  reviewRequest.input('prId', sql.Int, prId);
  const reviewResult = await reviewRequest.query(`
    SELECT MIN(SubmittedAt) AS FirstReviewTime 
    FROM PRReviews 
    WHERE PRId = @prId
  `);
  
  const firstReviewTime = reviewResult.recordset[0].FirstReviewTime;
  
  // Calculate time to merge if merged
  let timeToMerge = null;
  if (pr.merged_at) {
    const createdAt = new Date(pr.created_at);
    const mergedAt = new Date(pr.merged_at);
    timeToMerge = Math.floor((mergedAt.getTime() - createdAt.getTime()) / (1000 * 60)); // minutes
  }
  
  // Calculate time to first review if reviewed
  let timeToFirstReview = null;
  if (firstReviewTime) {
    const createdAt = new Date(pr.created_at);
    const reviewedAt = new Date(firstReviewTime);
    timeToFirstReview = Math.floor((reviewedAt.getTime() - createdAt.getTime()) / (1000 * 60)); // minutes
  }
  
  // Count reviewers
  const reviewersRequest = pool.request();
  reviewersRequest.input('prId', sql.Int, prId);
  const reviewersResult = await reviewersRequest.query(`
    SELECT COUNT(DISTINCT ReviewerId) AS NumReviewers 
    FROM PRReviews 
    WHERE PRId = @prId
  `);
  
  const numReviewers = reviewersResult.recordset[0].NumReviewers;
  
  // Update metrics
  const updateRequest = pool.request();
  updateRequest.input('prId', sql.Int, prId);
  updateRequest.input('timeToFirstReview', sql.Int, timeToFirstReview);
  updateRequest.input('timeToMerge', sql.Int, timeToMerge);
  updateRequest.input('numReviewers', sql.Int, numReviewers);
  updateRequest.input('numFileChanges', sql.Int, pr.changed_files || 0);
  updateRequest.input('numLinesAdded', sql.Int, pr.additions || 0);
  updateRequest.input('numLinesRemoved', sql.Int, pr.deletions || 0);
  
  await updateRequest.query(`
    UPDATE PRMetrics
    SET 
      TimeToFirstReview = @timeToFirstReview,
      TimeToMerge = @timeToMerge,
      NumReviewers = @numReviewers,
      NumFileChanges = @numFileChanges,
      NumLinesAdded = @numLinesAdded,
      NumLinesRemoved = @numLinesRemoved,
      LastCalculatedAt = GETUTCDATE()
    WHERE PRId = @prId;
  `);
}

/**
 * Send a notification about a PR event
 */
async function sendPrNotification(
  pr: any,
  repository: any,
  eventType: 'opened' | 'closed' | 'merged'
): Promise<void> {
  // Construct notification message
  let message = '';
  const prLink = pr.html_url;
  const prTitle = pr.title;
  const repoName = repository.full_name;
  const author = pr.user.login;
  
  switch (eventType) {
    case 'opened':
      message = `*New PR Created*: <${prLink}|#${pr.number} ${prTitle}> in *${repoName}* by *${author}*`;
      break;
    case 'closed':
      message = `*PR Closed*: <${prLink}|#${pr.number} ${prTitle}> in *${repoName}* by *${author}*`;
      break;
    case 'merged':
      message = `*PR Merged* 🎉: <${prLink}|#${pr.number} ${prTitle}> in *${repoName}* by *${author}*`;
      break;
  }
  
  // Send to Slack
  await sendSlackNotification(message);
}
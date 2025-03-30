import * as sql from 'mssql';
import * as logger from '../../utils/logger';

/**
 * Migration to add indexes to optimize database performance
 */
export async function up(): Promise<void> {
  try {
    logger.info("Running migration: Add indexes");
    
    // Get connection string from environment
    const connectionString = process.env.DATABASE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error("Database connection string not configured");
    }
    
    // Connect to database
    const pool = await new sql.ConnectionPool(connectionString).connect();
    
    // Add indexes for performance
    await pool.request().query(`
      -- Index for Organization lookup by GitHub ID
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Organizations_GitHubId')
      BEGIN
        CREATE INDEX IX_Organizations_GitHubId ON Organizations(GitHubId);
      END
      
      -- Index for Repository lookup by GitHub ID
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Repositories_GitHubId')
      BEGIN
        CREATE INDEX IX_Repositories_GitHubId ON Repositories(GitHubId);
        CREATE INDEX IX_Repositories_OrgId ON Repositories(OrgId);
      END
      
      -- Index for TeamMember lookup by GitHub ID
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TeamMembers_GitHubId')
      BEGIN
        CREATE INDEX IX_TeamMembers_GitHubId ON TeamMembers(GitHubId);
        CREATE INDEX IX_TeamMembers_Username ON TeamMembers(Username);
        CREATE INDEX IX_TeamMembers_OrgId ON TeamMembers(OrgId);
      END
      
      -- Indexes for PullRequests
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PullRequests_RepoId_Number')
      BEGIN
        CREATE INDEX IX_PullRequests_RepoId_Number ON PullRequests(RepoId, Number);
        CREATE INDEX IX_PullRequests_CreatorId ON PullRequests(CreatorId);
        CREATE INDEX IX_PullRequests_State ON PullRequests(State);
        CREATE INDEX IX_PullRequests_CreatedAt ON PullRequests(CreatedAt);
      END
      
      -- Indexes for PRReviews
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PRReviews_PRId')
      BEGIN
        CREATE INDEX IX_PRReviews_PRId ON PRReviews(PRId);
        CREATE INDEX IX_PRReviews_ReviewerId ON PRReviews(ReviewerId);
        CREATE INDEX IX_PRReviews_SubmittedAt ON PRReviews(SubmittedAt);
      END
      
      -- Indexes for PRMetrics
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PRMetrics_PRId')
      BEGIN
        CREATE INDEX IX_PRMetrics_PRId ON PRMetrics(PRId);
        CREATE INDEX IX_PRMetrics_IsStale ON PRMetrics(IsStale);
      END
    `);
    
    // Record this migration
    await pool.request()
      .input('name', sql.NVarChar, '002_add_indexes')
      .query(`
        INSERT INTO MigrationHistory (Name)
        VALUES (@name)
      `);
    
    await pool.close();
    
    logger.info("Migration completed: Add indexes");
  } catch (error) {
    logger.error(`Migration failed: ${error.message}`);
    throw error;
  }
}

/**
 * Migration to drop indexes (rollback)
 */
export async function down(): Promise<void> {
  try {
    logger.info("Running migration rollback: Drop indexes");
    
    // Get connection string from environment
    const connectionString = process.env.DATABASE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error("Database connection string not configured");
    }
    
    // Connect to database
    const pool = await new sql.ConnectionPool(connectionString).connect();
    
    // Drop indexes
    await pool.request().query(`
      -- Drop Indexes for Organizations
      IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Organizations_GitHubId')
        DROP INDEX IX_Organizations_GitHubId ON Organizations;
      
      -- Drop Indexes for Repositories
      IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Repositories_GitHubId')
        DROP INDEX IX_Repositories_GitHubId ON Repositories;
      IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Repositories_OrgId')
        DROP INDEX IX_Repositories_OrgId ON Repositories;
      
      -- Drop Indexes for TeamMembers
      IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TeamMembers_GitHubId')
        DROP INDEX IX_TeamMembers_GitHubId ON TeamMembers;
      IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TeamMembers_Username')
        DROP INDEX IX_TeamMembers_Username ON TeamMembers;
      IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TeamMembers_OrgId')
        DROP INDEX IX_TeamMembers_OrgId ON TeamMembers;
      
      -- Drop Indexes for PullRequests
      IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PullRequests_RepoId_Number')
        DROP INDEX IX_PullRequests_RepoId_Number ON PullRequests;
      IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PullRequests_CreatorId')
        DROP INDEX IX_PullRequests_CreatorId ON PullRequests;
      IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PullRequests_State')
        DROP INDEX IX_PullRequests_State ON PullRequests;
      IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PullRequests_CreatedAt')
        DROP INDEX IX_PullRequests_CreatedAt ON PullRequests;
      
      -- Drop Indexes for PRReviews
      IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PRReviews_PRId')
        DROP INDEX IX_PRReviews_PRId ON PRReviews;
      IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PRReviews_ReviewerId')
        DROP INDEX IX_PRReviews_ReviewerId ON PRReviews;
      IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PRReviews_SubmittedAt')
        DROP INDEX IX_PRReviews_SubmittedAt ON PRReviews;
      
      -- Drop Indexes for PRMetrics
      IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PRMetrics_PRId')
        DROP INDEX IX_PRMetrics_PRId ON PRMetrics;
      IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PRMetrics_IsStale')
        DROP INDEX IX_PRMetrics_IsStale ON PRMetrics;
    `);
    
    // Remove migration record
    await pool.request()
      .input('name', sql.NVarChar, '002_add_indexes')
      .query(`
        DELETE FROM MigrationHistory
        WHERE Name = @name
      `);
    
    await pool.close();
    
    logger.info("Migration rollback completed: Drop indexes");
  } catch (error) {
    logger.error(`Migration rollback failed: ${error.message}`);
    throw error;
  }
}

/**
 * Check if this migration has been applied
 */
export async function isApplied(): Promise<boolean> {
  try {
    // Get connection string from environment
    const connectionString = process.env.DATABASE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error("Database connection string not configured");
    }
    
    // Connect to database
    const pool = await new sql.ConnectionPool(connectionString).connect();
    
    // Check if migration history table exists
    const tableResult = await pool.request().query(`
      SELECT CASE 
        WHEN EXISTS (SELECT * FROM sys.tables WHERE name = 'MigrationHistory') 
        THEN 1 ELSE 0 
      END as TableExists
    `);
    
    const tableExists = tableResult.recordset[0].TableExists === 1;
    
    if (!tableExists) {
      await pool.close();
      return false;
    }
    
    // Check if this migration has been applied
    const result = await pool.request()
      .input('name', sql.NVarChar, '002_add_indexes')
      .query(`
        SELECT COUNT(*) as Count
        FROM MigrationHistory
        WHERE Name = @name
      `);
    
    const isApplied = result.recordset[0].Count > 0;
    
    await pool.close();
    
    return isApplied;
  } catch (error) {
    logger.error(`Error checking migration status: ${error.message}`);
    return false;
  }
}
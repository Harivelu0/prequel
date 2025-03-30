import * as sql from 'mssql';
import * as logger from '../../utils/logger';
import { createTablesScript } from '../schema';

/**
 * Migration to create initial database tables
 */
export async function up(): Promise<void> {
  try {
    logger.info("Running migration: Create tables");
    
    // Get connection string from environment
    const connectionString = process.env.DATABASE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error("Database connection string not configured");
    }
    
    // Connect to database
    const pool = await new sql.ConnectionPool(connectionString).connect();
    
    // Run create tables script
    await pool.request().query(createTablesScript);
    
    // Create migration history table if it doesn't exist
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MigrationHistory')
      BEGIN
        CREATE TABLE MigrationHistory (
          Id INT IDENTITY(1,1) PRIMARY KEY,
          Name NVARCHAR(255) NOT NULL,
          AppliedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
        )
      END
    `);
    
    // Record this migration
    await pool.request()
      .input('name', sql.NVarChar, '001_create_tables')
      .query(`
        INSERT INTO MigrationHistory (Name)
        VALUES (@name)
      `);
    
    await pool.close();
    
    logger.info("Migration completed: Create tables");
  } catch (error) {
    logger.error(`Migration failed: ${error.message}`);
    throw error;
  }
}

/**
 * Migration to drop all tables (rollback)
 */
export async function down(): Promise<void> {
  try {
    logger.info("Running migration rollback: Drop tables");
    
    // Get connection string from environment
    const connectionString = process.env.DATABASE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error("Database connection string not configured");
    }
    
    // Connect to database
    const pool = await new sql.ConnectionPool(connectionString).connect();
    
    // Drop tables in reverse order of creation (respecting foreign keys)
    await pool.request().query(`
      IF EXISTS (SELECT * FROM sys.tables WHERE name = 'PRMetrics')
        DROP TABLE PRMetrics;
      IF EXISTS (SELECT * FROM sys.tables WHERE name = 'PRReviews')
        DROP TABLE PRReviews;
      IF EXISTS (SELECT * FROM sys.tables WHERE name = 'PullRequests')
        DROP TABLE PullRequests;
      IF EXISTS (SELECT * FROM sys.tables WHERE name = 'TeamMembers')
        DROP TABLE TeamMembers;
      IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Repositories')
        DROP TABLE Repositories;
      IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Organizations')
        DROP TABLE Organizations;
    `);
    
    // Remove migration record
    await pool.request()
      .input('name', sql.NVarChar, '001_create_tables')
      .query(`
        DELETE FROM MigrationHistory
        WHERE Name = @name
      `);
    
    await pool.close();
    
    logger.info("Migration rollback completed: Drop tables");
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
      .input('name', sql.NVarChar, '001_create_tables')
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
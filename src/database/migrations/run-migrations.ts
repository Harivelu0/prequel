// bin/database/migrations/run-migrations.js
const sql = require('mssql');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    
    // Get connection string from environment
    const connectionString = process.env.DATABASE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('DATABASE_CONNECTION_STRING environment variable is not set');
    }
    
    // Connect to database
    const pool = await new sql.ConnectionPool(connectionString).connect();
    console.log('Connected to database');
    
    // Get migration files
    const migrationsDir = path.join(__dirname);
    const migrationFiles = fs.readdirSync(migrationsDir)
    .filter((file: string) => file.endsWith('.js') && file !== 'run-migrations.js')
      .sort();
    
    console.log(`Found ${migrationFiles.length} migration files`);
    
    // Run each migration
    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const migration = require(path.join(migrationsDir, file));
      
      // Check if migration was already applied
      if (migration.isApplied && await migration.isApplied()) {
        console.log(`Migration ${file} already applied, skipping`);
        continue;
      }
      
      // Run the migration
      await migration.up();
      console.log(`Migration ${file} completed successfully`);
    }
    
    await pool.close();
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

runMigrations();
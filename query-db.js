const sql = require('mssql');

async function queryDatabase() {
  try {
    console.log('Connecting to database...');
    await sql.connect(process.env.DATABASE_CONNECTION_STRING);
    console.log('Connected! Running query...');
    
    // List all tables
    const tablesResult = await sql.query`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_type = 'BASE TABLE'
    `;
    console.log('Tables in database:');
    console.log(tablesResult.recordset);
    
    // Check if PullRequests table has any data
    const prResult = await sql.query`
      SELECT COUNT(*) as count FROM PullRequests
    `;
    console.log('Number of PRs in database:', prResult.recordset[0].count);
    
    // Check migrations
    const migrationsResult = await sql.query`
      SELECT * FROM MigrationHistory
    `;
    console.log('Migrations applied:');
    console.log(migrationsResult.recordset);
    
  } catch (err) {
    console.error('Error querying database:', err);
  }
}

queryDatabase();

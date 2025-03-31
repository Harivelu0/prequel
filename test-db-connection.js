// save as test-db-connection.js
const sql = require('mssql');

async function testDatabaseConnection() {
  try {
    console.log("Testing database connection...");
    const connectionString = process.env.DATABASE_CONNECTION_STRING;
    
    console.log("Connecting to SQL Server...");
    const pool = await new sql.ConnectionPool(connectionString).connect();
    console.log("Connected successfully!");
    
    console.log("Testing a simple insert...");
    // Try inserting a test organization
    const request = pool.request();
    request.input('name', sql.NVarChar, 'TestOrg');
    request.input('githubId', sql.NVarChar, '12345');
    
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
    
    console.log("Insert result:", result);
    console.log("Record inserted with ID:", result.recordset[0].OrgId);
    
    // Check if it was inserted
    const checkResult = await pool.request().query(`
      SELECT * FROM Organizations WHERE GitHubId = '12345'
    `);
    
    console.log("Retrieved test record:", checkResult.recordset);
    
    await pool.close();
    console.log("Test completed successfully!");
  } catch (error) {
    console.error("Database test failed:", error);
  }
}

testDatabaseConnection();
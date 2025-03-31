import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import * as sql from "@pulumi/azure-native/sql";

// Get configuration
const config = new pulumi.Config();
const stack = pulumi.getStack();


// Add a firewall rule for your client IP
const clientIpRule = new sql.FirewallRule("allow-my-ip", {
  resourceGroupName: resourceGroup.name,
  serverName: sqlServer.name,
  startIpAddress: "106.208.104.109",  // Your IP address
  endIpAddress: "106.208.104.109",
});
export function createDatabase(
  resourceGroupName: string,
  location: string = "East US"
): {
  server: sql.Server;
  database: sql.Database;
  connectionString: pulumi.Output<string>;
} {
  // Create a unique name for the SQL server
  const sqlServerName = `prequel-sql-${stack}`;
  const dbName = "prequeldb";

  // Get the SQL admin credentials from config
  const sqlAdminUsername = config.require("sqlAdminUsername");
  const sqlAdminPassword = config.requireSecret("sqlAdminPassword");

  // Create a SQL server
  const sqlServer = new sql.Server(sqlServerName, {
    resourceGroupName: resourceGroupName,
    location: location,
    administratorLogin: sqlAdminUsername,
    administratorLoginPassword: sqlAdminPassword,
    version: "12.0",
  });

  // Create a firewall rule to allow Azure services
  const firewallRule = new sql.FirewallRule("allow-azure-services", {
    resourceGroupName: resourceGroupName,
    serverName: sqlServer.name,
    startIpAddress: "0.0.0.0",
    endIpAddress: "0.0.0.0",
  });

  // Create a SQL database
  const database = new sql.Database(dbName, {
    resourceGroupName: resourceGroupName,
    location: location,
    serverName: sqlServer.name,
    sku: {
      name: "Basic",
      tier: "Basic",
    },
  });

  // Create the connection string
  const connectionString = pulumi.interpolate`Server=tcp:${sqlServer.name}.database.windows.net,1433;Initial Catalog=${dbName};Persist Security Info=False;User ID=${sqlAdminUsername};Password=${sqlAdminPassword};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;`;

  return {
    server: sqlServer,
    database: database,
    connectionString: connectionString,
  };
}
import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import * as sql from "@pulumi/azure-native/sql";

// Configuration
const config = new pulumi.Config();

/**
 * Creates a SQL Server and Database for the PR Management System
 */
export function createDatabase(
  resourceGroup: azure.resources.ResourceGroup,
  options: {
    location?: string;
    sqlAdminUsername?: string;
    sqlAdminPassword?: string;
    databaseSku?: string;
    databaseTier?: string;
  } = {}
) {
  // Set defaults
  const location = options.location || resourceGroup.location;
  const sqlAdminUsername = options.sqlAdminUsername || config.require("sqlAdminUsername");
  const sqlAdminPassword = options.sqlAdminPassword || config.requireSecret("sqlAdminPassword");
  const databaseSku = options.databaseSku || "Basic";
  const databaseTier = options.databaseTier || "Basic";

  // Create SQL Server
  const sqlServer = new sql.Server("prequel-sql-server", {
    resourceGroupName: resourceGroup.name,
    location: location,
    administratorLogin: sqlAdminUsername,
    administratorLoginPassword: sqlAdminPassword,
    version: "12.0",
    publicNetworkAccess: "Enabled",
    minimalTlsVersion: "1.2",
  });

  // Allow Azure services to access the SQL server
  const firewallRule = new sql.FirewallRule("allow-azure-services", {
    resourceGroupName: resourceGroup.name,
    serverName: sqlServer.name,
    startIpAddress: "0.0.0.0",
    endIpAddress: "0.0.0.0",
  });

  // Create SQL Database
  const database = new sql.Database("prequel-db", {
    resourceGroupName: resourceGroup.name,
    location: location,
    serverName: sqlServer.name,
    sku: {
      name: databaseSku,
      tier: databaseTier,
    },
    maxSizeBytes: 1073741824, // 1GB
  });

  // Create connection string for SQL database
  const sqlConnectionString = pulumi.interpolate`Server=tcp:${sqlServer.name}.database.windows.net,1433;Initial Catalog=${database.name};Persist Security Info=False;User ID=${sqlAdminUsername};Password=${sqlAdminPassword};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;`;

  // Return all created resources
  return {
    sqlServer,
    database,
    sqlConnectionString,
    // Generate database connection parameters for Python app
    dbParams: {
      host: pulumi.interpolate`${sqlServer.name}.database.windows.net`,
      database: database.name,
      user: sqlAdminUsername,
      password: sqlAdminPassword,
    }
  };
}

/**
 * Adds a firewall rule to allow specific IP addresses to access the SQL server
 */
export function addSqlFirewallRule(
  resourceGroup: azure.resources.ResourceGroup,
  sqlServer: sql.Server,
  name: string,
  startIpAddress: pulumi.Input<string>,
  endIpAddress?: pulumi.Input<string>
) {
  return new sql.FirewallRule(`${name}-rule`, {
    resourceGroupName: resourceGroup.name,
    serverName: sqlServer.name,
    startIpAddress: startIpAddress,
    endIpAddress: endIpAddress || startIpAddress,
  });
}
import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import * as azureStorage from "@pulumi/azure-native/storage";
import * as sql from "@pulumi/azure-native/sql";

// Define config
const config = new pulumi.Config();
const stack = pulumi.getStack();

// Get the organization name from config
const organizationName = config.get("organizationName") || "Shetchuko";

// Create a resource group
const resourceGroup = new azure.resources.ResourceGroup("prequel-rg", {
  location: "Central India"
});

// Create storage account
const storageAccount = new azureStorage.StorageAccount("prequalstorage", {
  resourceGroupName: resourceGroup.name,
  location: resourceGroup.location,
  sku: {
    name: azureStorage.SkuName.Standard_LRS,
  },
  kind: azureStorage.Kind.StorageV2,
});

// Get storage account keys
const storageAccountKeys = pulumi.all([resourceGroup.name, storageAccount.name])
  .apply(([resourceGroupName, accountName]) => {
    return azureStorage.listStorageAccountKeys({
      resourceGroupName: resourceGroupName,
      accountName: accountName,
    });
  });

const primaryStorageKey = storageAccountKeys.keys[0].value;

// Create App Service plan
const appServicePlan = new azure.web.AppServicePlan("prequel-plan", {
  resourceGroupName: resourceGroup.name,
  location: resourceGroup.location,
  sku: {
    name: "Y1",
    tier: "Dynamic",
  },
});

// Create Function App
const functionApp = new azure.web.WebApp("prequel-function-new", {
  resourceGroupName: resourceGroup.name,
  location: resourceGroup.location,
  serverFarmId: appServicePlan.id,
  kind: "functionapp",
  identity: {
    type: "SystemAssigned",
  },
  siteConfig: {
    appSettings: [
      { name: "AzureWebJobsStorage", value: pulumi.interpolate`DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${primaryStorageKey};EndpointSuffix=core.windows.net` },
      { name: "WEBSITE_NODE_DEFAULT_VERSION", value: "~18" },
      { name: "FUNCTIONS_EXTENSION_VERSION", value: "~4" },
      { name: "FUNCTIONS_WORKER_RUNTIME", value: "node" },
      { name: "WEBSITE_RUN_FROM_PACKAGE", value: "1" },
      { name: "GITHUB_WEBHOOK_SECRET", value: config.requireSecret("githubWebhookSecret") },
    ],
  },
});

// Create SQL Server
const sqlServer = new sql.Server("prequel-sql-server", {
  resourceGroupName: resourceGroup.name,
  location: resourceGroup.location,
  administratorLogin: config.require("sqlAdminUsername"),
  administratorLoginPassword: config.requireSecret("sqlAdminPassword"),
  version: "12.0",
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
  location: resourceGroup.location,
  serverName: sqlServer.name,
  sku: {
    name: "Basic",
    tier: "Basic",
  },
});

// Export the outputs
export const resourceGroupName = resourceGroup.name;
export const functionAppName = functionApp.name;
export const webhookUrl = "https://prequel-webhook-174350.azurewebsites.net/api/webhook";
export const sqlServerName = sqlServer.name;
export const databaseName = database.name;
export const storageAccountName = storageAccount.name;

// Create connection string for SQL database
export const sqlConnectionString = pulumi.interpolate`Server=tcp:${sqlServer.name}.database.windows.net,1433;Initial Catalog=${database.name};Persist Security Info=False;User ID=${config.require("sqlAdminUsername")};Password=${config.requireSecret("sqlAdminPassword")};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;`;
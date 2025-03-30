import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import * as azureStorage from "@pulumi/azure-native/storage";

// Get configuration
const config = new pulumi.Config();
const stack = pulumi.getStack();

// Create a resource group for all our Azure resources
export function createFunctionApp(
  resourceGroupName: string,
  location: string = "East US"
): {
  functionApp: azure.web.WebApp;
  functionUrl: pulumi.Output<string>;
} {
  // Create a unique name for the function app
  const appName = `prequel-webhook-${stack}`;

  // Create a storage account for the function app
  const storageAccount = new azureStorage.StorageAccount(`${appName}sa`, {
    resourceGroupName: resourceGroupName,
    location: location,
    sku: {
      name: azureStorage.SkuName.Standard_LRS,
    },
    kind: azureStorage.Kind.StorageV2,
  });

  // Get storage account keys
  const storageAccountKeys = pulumi.all([resourceGroupName, storageAccount.name])
    .apply(([resourceGroupName, accountName]) => {
      return azureStorage.listStorageAccountKeys({
        resourceGroupName: resourceGroupName,
        accountName: accountName,
      });
    });

  const primaryStorageKey = storageAccountKeys.keys[0].value;

  // Create an App Service plan
  const appServicePlan = new azure.web.AppServicePlan(`${appName}-plan`, {
    resourceGroupName: resourceGroupName,
    location: location,
    sku: {
      name: "Y1",
      tier: "Dynamic",
    },
  });

  // Create a Function App
  const functionApp = new azure.web.WebApp(`${appName}`, {
    resourceGroupName: resourceGroupName,
    location: location,
    serverFarmId: appServicePlan.id,
    kind: "functionapp",
    identity: {
      type: "SystemAssigned",
    },
    siteConfig: {
      appSettings: [
        { name: "AzureWebJobsStorage", value: pulumi.interpolate`DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${primaryStorageKey};EndpointSuffix=core.windows.net` },
        { name: "WEBSITE_NODE_DEFAULT_VERSION", value: "~14" },
        { name: "FUNCTIONS_EXTENSION_VERSION", value: "~4" },
        { name: "FUNCTIONS_WORKER_RUNTIME", value: "node" },
        { name: "WEBSITE_RUN_FROM_PACKAGE", value: "1" },
        { name: "GITHUB_WEBHOOK_SECRET", value: config.requireSecret("githubWebhookSecret") },
        { name: "DATABASE_CONNECTION_STRING", value: config.requireSecret("databaseConnectionString") },
        { name: "SLACK_WEBHOOK_URL", value: config.requireSecret("slackWebhookUrl") },
      ],
      cors: {
        allowedOrigins: ["*"],
      },
      nodeVersion: "~14",
    },
  });

  // Get the function URL
  const functionUrl = pulumi.interpolate`https://${functionApp.defaultHostName}/api/webhook`;

  return {
    functionApp,
    functionUrl,
  };
}
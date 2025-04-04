import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import * as azureStorage from "@pulumi/azure-native/storage";

// Get configuration
const config = new pulumi.Config();
const stack = pulumi.getStack();

/**
 * Creates Azure Storage resources for function app data and metrics
 */
export function createStorage(
  resourceGroupName: string,
  location: string = "East US"
): {
  storageAccount: azureStorage.StorageAccount;
  metricsContainer: azureStorage.BlobContainer;
  connectionString: pulumi.Output<string>;
} {
  // Create a unique name for the storage account
  const storageAccountName = `prequal${stack.replace(/[^a-z0-9]/g, '')}`;

  // Create a storage account
  const storageAccount = new azureStorage.StorageAccount(`${storageAccountName}`, {
    resourceGroupName: resourceGroupName,
    location: location,
    sku: {
      name: azureStorage.SkuName.Standard_LRS,
    },
    kind: azureStorage.Kind.StorageV2,
    enableHttpsTrafficOnly: true,
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

  // Create a blob container for metrics data
  const metricsContainer = new azureStorage.BlobContainer("metrics", {
    resourceGroupName: resourceGroupName,
    accountName: storageAccount.name,
    publicAccess: azureStorage.PublicAccess.None,
  });

  // Create connection string
  const connectionString = pulumi.interpolate`DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${primaryStorageKey};EndpointSuffix=core.windows.net`;

  return {
    storageAccount,
    metricsContainer,
    connectionString,
  };
}

/**
 * Creates static website hosting on the storage account
 */
export function createStaticWebsite(
  resourceGroupName: string,
  storageAccount: azureStorage.StorageAccount
): {
  endpoint: pulumi.Output<string>;
} {
  // Enable static website hosting
  const staticWebsite = new azureStorage.StorageAccountStaticWebsite("static-website", {
    resourceGroupName: resourceGroupName,
    accountName: storageAccount.name,
    indexDocument: "index.html",
    error404Document: "404.html",
  });

  // Get the primary endpoint
  const endpoint = storageAccount.primaryEndpoints.web;

  return {
    endpoint,
  };
}
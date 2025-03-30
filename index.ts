import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";

// Define config
const config = new pulumi.Config();

// Get the organization name from config
const organizationName = config.get("organizationName") || "Shetchuko";

// Create a simple resource group for Phase 2
const resourceGroup = new azure.resources.ResourceGroup("prequel-rg", {
  location: "East US"
});

// Export the resource group name and a placeholder webhook URL
export const resourceGroupName = resourceGroup.name;
export const webhookUrl = pulumi.interpolate`https://${organizationName}-webhook.azurewebsites.net/api/webhook`;

// Log successful initialization
console.log(`Initialized PR monitoring infrastructure for ${organizationName}`);
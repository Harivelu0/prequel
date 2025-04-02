import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import * as github from "@pulumi/github";
import * as fs from "fs";
import * as path from "path";

// Import our infrastructure modules
import { createVirtualMachine } from "./src/azure/vm";
import { createDatabase, addSqlFirewallRule } from "./src/azure/database";
import { createNetworkInfrastructure } from "./src/azure/network";

// Configuration
const config = new pulumi.Config();
const stack = pulumi.getStack();
const organizationName = config.get("organizationName") || "Shetchuko";
const githubToken = config.requireSecret("githubToken");
const githubWebhookSecret = config.requireSecret("githubWebhookSecret");
const slackWebhookUrl = config.requireSecret("slackWebhookUrl");

// Create resource group
const rgName = `prequel-rg-${stack}`; // Use the stack name for uniqueness
const resourceGroup = new azure.resources.ResourceGroup(rgName, {
  // Remove the explicit name property as it's not valid in ResourceGroupArgs
  location: config.get("location") || "Central India"
});

// Add logging to help debug
console.log(`Creating resource group: ${rgName}`);

// Create network infrastructure
const network = createNetworkInfrastructure(resourceGroup);

// Create database infrastructure
const db = createDatabase(resourceGroup);

// Create VM for webhook handler
const vm = createVirtualMachine(resourceGroup, network, {
  githubWebhookSecret: githubWebhookSecret,
  slackWebhookUrl: slackWebhookUrl,
  sqlConnectionString: db.sqlConnectionString,
});

// Allow VM to access SQL Database
const vmIp = network.publicIp.ipAddress.apply(ip => ip || "0.0.0.0");
const vmSqlFirewallRule = addSqlFirewallRule(
  resourceGroup,
  db.sqlServer,
  "webhook-vm",
  vmIp
);

// Setup GitHub provider for managing repositories
const githubProvider = new github.Provider("github", {
  token: githubToken,
  owner: organizationName,
});

// Set up webhook at the organization level
function setupOrganizationWebhook(webhookUrl: pulumi.Input<string>) {
  console.log(`Setting up organization webhook for ${organizationName}`);
  
  // Create a webhook with a unique name to avoid conflicts
  const uniqueName = `webhook-${organizationName}-${Date.now()}`;
  
  // Create a webhook for the organization
  const webhook = new github.OrganizationWebhook(uniqueName, {
    configuration: {
      url: webhookUrl,
      contentType: "json",
      insecureSsl: false,
      secret: githubWebhookSecret,
    },
    events: ["pull_request", "pull_request_review"],
    active: true,
  }, { 
    provider: githubProvider,
  });

  return webhook;
}

// Call the function to create the organization webhook
const orgWebhook = setupOrganizationWebhook(network.webhookUrl);

// Export the webhook ID
export const organizationWebhookId = orgWebhook.id;
// Function to setup a repository with webhook and branch protection
function setupRepository(repoName: string, webhookUrl: pulumi.Input<string>) {
  // Create a webhook for the repository
  const webhook = new github.RepositoryWebhook(`webhook-${repoName}`, {
    repository: repoName,
    configuration: {
      url: webhookUrl,
      contentType: "json",
      insecureSsl: false,
      secret: githubWebhookSecret,
    },
    events: ["pull_request", "pull_request_review"],
    active: true,
  }, { provider: githubProvider });

  // Set up branch protection
  const branchProtection = new github.BranchProtection(`branch-protection-${repoName}`, {
    repositoryId: `${organizationName}/${repoName}`,
    pattern: "main",
    enforceAdmins: false,
    requiredPullRequestReviews: [{
      dismissStaleReviews: true,
      restrictDismissals: false,
      requiredApprovingReviewCount: 1,
    }],
  }, { provider: githubProvider });

  return {
    webhook,
    branchProtection,
  };
}

// Export outputs
export const resourceGroupName = resourceGroup.name; // This is the export, not a redeclaration
export const vmName = vm.vm.name;
export const vmIpAddress = network.publicIp.ipAddress;
export const vmFqdn = network.fqdn;
export const webhookUrl = network.webhookUrl;
export const sqlServerName = db.sqlServer.name;
export const databaseName = db.database.name;
export const sqlConnectionString = pulumi.interpolate`Server=tcp:${db.sqlServer.name}.database.windows.net,1433;Initial Catalog=${db.database.name};Persist Security Info=False;User ID=${config.require("sqlAdminUsername")};Password=${config.requireSecret("sqlAdminPassword")};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;`;
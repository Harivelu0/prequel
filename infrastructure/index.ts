import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import * as github from "@pulumi/github";
import * as fs from "fs";
import * as path from "path";

// Import our infrastructure modules
import { createVirtualMachine } from "./src/azure/vm";
import { createDatabase, addSqlFirewallRule } from "./src/azure/database";
import { createNetworkInfrastructure } from "./src/azure/network";

console.log("Starting Pulumi program execution");

// Configuration
const config = new pulumi.Config();
const stack = pulumi.getStack();

console.log("Testing access to required configuration values");
try {
  const organizationName = config.get("organizationName") || "Shetchuko";
  console.log(`Using organization: ${organizationName}`);
  
  const githubToken = config.requireSecret("githubToken");
  console.log("GitHub token is available");
  
  const githubWebhookSecret = config.requireSecret("githubWebhookSecret");
  console.log("GitHub webhook secret is available");
  
  const slackWebhookUrl = config.requireSecret("slackWebhookUrl");
  console.log("Slack webhook URL is available");
  
  // Create resource group
  console.log("Creating Azure resource group");
  const rgName = `prequel-rg-${stack}`; // Use the stack name for uniqueness
  const resourceGroup = new azure.resources.ResourceGroup(rgName, {
    location: config.get("location") || "Central India"
  });
  console.log(`Resource group created: ${rgName}`);

  // Create network infrastructure
  console.log("Creating network infrastructure");
  const network = createNetworkInfrastructure(resourceGroup);
  console.log("Network infrastructure created successfully");

  // Create database infrastructure
  console.log("Creating database infrastructure");
  const db = createDatabase(resourceGroup);
  console.log("Database infrastructure created successfully");

  // Create VM for webhook handler
  console.log("Creating VM for webhook handler");
  const vm = createVirtualMachine(resourceGroup, network, {
    githubWebhookSecret: githubWebhookSecret,
    slackWebhookUrl: slackWebhookUrl,
    sqlConnectionString: db.sqlConnectionString,
  });
  console.log("VM created successfully");

  // Allow VM to access SQL Database
  console.log("Setting up SQL firewall rule for VM");
  const vmIp = network.publicIp.ipAddress.apply(ip => ip || "0.0.0.0");
  const vmSqlFirewallRule = addSqlFirewallRule(
    resourceGroup,
    db.sqlServer,
    "webhook-vm",
    vmIp
  );
  console.log("SQL firewall rule created");

  // Setup GitHub provider
  console.log("Setting up GitHub provider");
  let githubProvider: github.Provider;
try {
  githubProvider = new github.Provider("github", {
    token: githubToken,
    owner: organizationName,
  });
  console.log("GitHub provider created successfully");
} catch (error) {
  console.error("Error setting up GitHub provider:", error);
  throw error;
}

  // Get the webhook URL from the network setup
  console.log("Getting webhook URL from network setup");
  const webhookUrl = network.webhookUrl;
  console.log("Webhook URL retrieved");

  // Create organization webhook
  console.log("Creating GitHub organization webhook");
  let orgWebhook;
  try {
    orgWebhook = new github.OrganizationWebhook(`webhook-${organizationName}`, {
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
      // Add this to maintain the same resource across updates:
      deleteBeforeReplace: true,
      // This tells Pulumi which properties should not trigger recreation
      ignoreChanges: ["configuration.secret"]
    });
    console.log("GitHub organization webhook created successfully");
  } catch (error) {
    console.error("Error creating GitHub organization webhook:", error);
    throw error;
  }

  // Define function to setup repository
  function setupRepository(repoName: string, webhookUrl: pulumi.Input<string>) {
    console.log(`Setting up repository: ${repoName}`);
    
    try {
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
      console.log(`Repository webhook created for ${repoName}`);

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
      console.log(`Branch protection created for ${repoName}`);

      return {
        webhook,
        branchProtection,
      };
    } catch (error) {
      console.error(`Error setting up repository ${repoName}:`, error);
      throw error;
    }
  }

  // Export outputs
  console.log("Setting up exports");
  const resourceGroupName = resourceGroup.name;
  const vmName = vm.vm.name;
  const vmIpAddress = network.publicIp.ipAddress;
  const vmFqdn = network.fqdn;
  const webhookEndpoint = network.webhookUrl;
  const sqlServerName = db.sqlServer.name;
  const databaseName = db.database.name;
  const sqlConnectionString = pulumi.interpolate`Server=tcp:${db.sqlServer.name}.database.windows.net,1433;Initial Catalog=${db.database.name};Persist Security Info=False;User ID=${config.require("sqlAdminUsername")};Password=${config.requireSecret("sqlAdminPassword")};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;`;
  console.log("Exports configured successfully");

  // Now export them
  exports.resourceGroupName = resourceGroupName;
  exports.vmName = vmName;
  exports.vmIpAddress = vmIpAddress;
  exports.vmFqdn = vmFqdn;
  exports.webhookEndpoint = webhookEndpoint;
  exports.sqlServerName = sqlServerName;
  exports.databaseName = databaseName;
  exports.sqlConnectionString = sqlConnectionString;
  exports.organizationWebhookId = orgWebhook.id;

  console.log("Pulumi program execution completed successfully");
} catch (error) {
  console.error("Error in Pulumi program execution:", error);
  throw error;
}

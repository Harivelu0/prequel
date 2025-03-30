import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import { createFunctionApp } from "../azure/function-app";
import { createDatabase } from "../azure/database";
import { deployer } from "../automation/deployer";
import {logger} from "../utils/logger"
/**
 * Deploys the Azure infrastructure and updates GitHub webhook configurations
 */
export async function deployInfrastructure(
  organizationName: string,
  repositoryNames: string[]
): Promise<{
  webhookUrl: string;
  resourceGroupName: string;
  functionAppName: string;
}> {
  try {
    logger.info(`Starting deployment for organization: ${organizationName}`);
    
    // Get configuration
    const config = new pulumi.Config();
    const stack = pulumi.getStack();
    
    // Create Azure resource group
    const resourceGroupName = `prequel-rg-${stack}`;
    const location = config.get("location") || "East US";
    
    const resourceGroup = new azure.resources.ResourceGroup(resourceGroupName, {
      location: location,
    });
    
    // Create Function App
    const { functionApp, functionUrl } = createFunctionApp(
      resourceGroupName,
      location
    );
    
    // Create Database
    const { connectionString } = createDatabase(
      resourceGroupName,
      location
    );
    
    // Store connection string in Function App settings
    const appSettings = new azure.web.WebAppApplicationSettings(`${functionApp.name}-settings`, {
      resourceGroupName: resourceGroupName,
      name: functionApp.name,
      properties: {
        "DATABASE_CONNECTION_STRING": connectionString,
      },
    });
    
    // After resources are deployed, use the webhook URL to configure repositories
    const webhookUrl = functionUrl.apply(url => url);
    
    // After Azure resources are deployed, configure GitHub repositories
    await configureGitHubRepositories(
      organizationName,
      repositoryNames,
      webhookUrl
    );
    
    logger.info(`Deployment complete for organization: ${organizationName}`);
    
    return {
      webhookUrl: webhookUrl.get(),
      resourceGroupName: resourceGroupName,
      functionAppName: functionApp.name.get(),
    };
  } catch (error) {
    logger.error(`Deployment failed: ${error.message}`);
    throw error;
  }
}

/**
 * Configures GitHub repositories with webhooks
 */
async function configureGitHubRepositories(
  organizationName: string,
  repositoryNames: string[],
  webhookUrl: pulumi.Output<string>
): Promise<void> {
  try {
    logger.info(`Configuring ${repositoryNames.length} repositories for organization: ${organizationName}`);
    
    // Get webhook secret from config
    const config = new pulumi.Config();
    const webhookSecret = config.requireSecret("githubWebhookSecret");
    
    // Create config for each repository
    for (const repoName of repositoryNames) {
      const fullRepoName = `${organizationName}/${repoName}`;
      
      logger.info(`Configuring repository: ${fullRepoName}`);
      
      // Create webhook configuration
      const webhookConfig = {
        url: webhookUrl,
        secret: webhookSecret,
        contentType: "json",
        insecureSsl: false,
      };
      
      // Configure events to receive
      const events = [
        "pull_request",
        "pull_request_review",
        "pull_request_review_comment"
      ];
      
      // Deploy repository configuration using the deployer from Phase 1
      await deployer.deployRepositoryConfig({
        repositoryName: fullRepoName,
        webhookConfig: webhookConfig,
        webhookEvents: events,
        branchProtection: {
          requirePullRequestReviews: true,
          requiredApprovingReviewCount: 1,
          dismissStaleReviews: true,
          requireLastPushApproval: true,
        }
      });
    }
    
    logger.info(`Successfully configured ${repositoryNames.length} repositories`);
  } catch (error) {
    logger.error(`Repository configuration failed: ${error.message}`);
    throw error;
  }
}

/**
 * Main entry point for deploying PR monitoring infrastructure
 */
export async function deployPRMonitoring(
  organizationName: string,
  repositoryNames: string[]
): Promise<void> {
  try {
    logger.info(`Starting PR monitoring deployment for ${organizationName}`);
    
    // Step 1: Deploy Azure infrastructure (Function App, Database)
    const { webhookUrl, resourceGroupName, functionAppName } = await deployInfrastructure(
      organizationName,
      repositoryNames
    );
    
    logger.info(`Infrastructure deployed successfully`);
    logger.info(`Webhook URL: ${webhookUrl}`);
    logger.info(`Resource Group: ${resourceGroupName}`);
    logger.info(`Function App: ${functionAppName}`);
    
    // Step 2: Check database migration status
    await checkDatabaseMigrations();
    
    // Step 3: Set up scheduled tasks
    await setupScheduledTasks(functionAppName, resourceGroupName);
    
    logger.info(`PR monitoring deployment completed successfully`);
  } catch (error) {
    logger.error(`PR monitoring deployment failed: ${error.message}`);
    throw error;
  }
}

/**
 * Check database migrations
 */
async function checkDatabaseMigrations(): Promise<void> {
  // This would normally check if migrations need to be run
  // For now we just log that we'd run them
  logger.info(`Database migrations would be executed here`);
}

/**
 * Set up scheduled tasks in the function app
 */
async function setupScheduledTasks(
  functionAppName: string,
  resourceGroupName: string
): Promise<void> {
  try {
    logger.info(`Setting up scheduled tasks`);
    
    // Configure stale PR detector to run daily
    const stalePRSchedule = new azure.web.WebAppFunction("stale-pr-detector", {
      name: "stale-pr-detector",
      resourceGroupName: resourceGroupName,
      functionAppName: functionAppName,
      config: {
        bindings: [
          {
            name: "myTimer",
            type: "timerTrigger",
            direction: "in",
            schedule: "0 0 9 * * *" // Run at 9 AM every day
          }
        ],
        disabled: false
      }
    });
    
    // Configure weekly report generator to run on Monday
    const weeklyReportSchedule = new azure.web.WebAppFunction("weekly-report", {
      name: "weekly-report",
      resourceGroupName: resourceGroupName,
      functionAppName: functionAppName,
      config: {
        bindings: [
          {
            name: "myTimer",
            type: "timerTrigger",
            direction: "in",
            schedule: "0 0 10 * * 1" // Run at 10 AM every Monday
          }
        ],
        disabled: false
      }
    });
    
    logger.info(`Scheduled tasks set up successfully`);
  } catch (error) {
    logger.error(`Setting up scheduled tasks failed: ${error.message}`);
    throw error;
  }
}
import * as pulumi from "@pulumi/pulumi";
import * as logger from "../utils/logger";
import { WebhookManager } from "./webhook_magaer";
import { deployPRMonitoring } from "./config_deployer";

/**
 * Class that handles the setup of PR monitoring
 */
export class MonitoringSetup {
  private webhookManager: WebhookManager;
  private config: pulumi.Config;

  constructor() {
    this.webhookManager = new WebhookManager();
    this.config = new pulumi.Config();
  }

  /**
   * Sets up PR monitoring for an organization
   */
  async setupOrganizationMonitoring(
    organizationName: string,
    options: {
      excludeRepos?: string[];
      useExistingInfrastructure?: boolean;
      resourceGroupName?: string;
      functionAppName?: string;
    } = {}
  ): Promise<void> {
    try {
      logger.info(`Setting up PR monitoring for organization: ${organizationName}`);
      
      const { 
        excludeRepos = [], 
        useExistingInfrastructure = false,
        resourceGroupName,
        functionAppName
      } = options;
      
      let webhookUrl: string;
      
      if (useExistingInfrastructure) {
        // Use existing infrastructure
        if (!resourceGroupName || !functionAppName) {
          throw new Error("Resource group name and function app name are required for existing infrastructure");
        }
        
        // Get the webhook URL from the existing function app
        webhookUrl = await this.getExistingWebhookUrl(resourceGroupName, functionAppName);
        
        logger.info(`Using existing infrastructure with webhook URL: ${webhookUrl}`);
      } else {
        // Deploy new infrastructure
        logger.info(`Deploying new infrastructure for PR monitoring`);
        
        // Get repository names for this organization
        const repoNames = await this.getRepositoryNames(organizationName, excludeRepos);
        
        // Deploy PR monitoring infrastructure
        await deployPRMonitoring(organizationName, repoNames);
        
        // Get the webhook URL from config (would be stored during deployment)
        webhookUrl = this.config.require("webhookUrl");
      }
      
      // Set up webhooks for all repositories in the organization
      await this.webhookManager.setupOrganizationWebhooks(
        organizationName,
        webhookUrl,
        excludeRepos
      );
      
      logger.info(`PR monitoring setup completed for organization: ${organizationName}`);
    } catch (error) {
      logger.error(`Error setting up PR monitoring: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gets repository names for an organization
   */
  private async getRepositoryNames(
    organizationName: string,
    excludeRepos: string[] = []
  ): Promise<string[]> {
    try {
      logger.info(`Getting repository names for organization: ${organizationName}`);
      
      // This would typically use the GitHub API to get repositories
      // For now, we'll just return some hardcoded names
      const repos = ["repo1", "repo2", "repo3"];
      
      // Filter out excluded repositories
      const filteredRepos = repos.filter(repo => !excludeRepos.includes(repo));
      
      logger.info(`Found ${filteredRepos.length} repositories`);
      return filteredRepos;
    } catch (error) {
      logger.error(`Error getting repository names: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gets the webhook URL from an existing function app
   */
  private async getExistingWebhookUrl(
    resourceGroupName: string,
    functionAppName: string
  ): Promise<string> {
    try {
      logger.info(`Getting webhook URL from existing function app: ${functionAppName}`);
      
      // In a real implementation, this would get the URL from Azure
      // For now, we'll just build it based on the function app name
      const webhookUrl = `https://${functionAppName}.azurewebsites.net/api/webhook`;
      
      logger.info(`Retrieved webhook URL: ${webhookUrl}`);
      return webhookUrl;
    } catch (error) {
      logger.error(`Error getting webhook URL: ${error.message}`);
      throw error;
    }
  }

  /**
   * Updates monitoring setup with a new webhook URL
   */
  async updateWebhookUrl(
    organizationName: string,
    newWebhookUrl: string,
    excludeRepos: string[] = []
  ): Promise<void> {
    try {
      logger.info(`Updating webhook URL for organization: ${organizationName}`);
      
      // Update config
      this.config.set("webhookUrl", newWebhookUrl);
      
      // Update all webhooks
      await this.webhookManager.setupOrganizationWebhooks(
        organizationName,
        newWebhookUrl,
        excludeRepos
      );
      
      logger.info(`Webhook URL updated successfully`);
    } catch (error) {
      logger.error(`Error updating webhook URL: ${error.message}`);
      throw error;
    }
  }

  /**
   * Adds monitoring to a single repository
   */
  async addRepositoryMonitoring(
    ownerName: string,
    repoName: string
  ): Promise<void> {
    try {
      logger.info(`Adding PR monitoring for repository: ${ownerName}/${repoName}`);
      
      // Get the webhook URL from config
      const webhookUrl = this.config.require("webhookUrl");
      
      // Set up webhook for this repository
      await this.webhookManager.setupRepositoryWebhook(
        ownerName,
        repoName,
        webhookUrl
      );
      
      logger.info(`PR monitoring added for repository: ${ownerName}/${repoName}`);
    } catch (error) {
      logger.error(`Error adding repository monitoring: ${error.message}`);
      throw error;
    }
  }

  /**
   * Removes monitoring from a single repository
   */
  async removeRepositoryMonitoring(
    ownerName: string,
    repoName: string
  ): Promise<void> {
    try {
      logger.info(`Removing PR monitoring for repository: ${ownerName}/${repoName}`);
      
      // Delete webhook for this repository
      await this.webhookManager.deleteRepositoryWebhook(
        ownerName,
        repoName
      );
      
      logger.info(`PR monitoring removed for repository: ${ownerName}/${repoName}`);
    } catch (error) {
      logger.error(`Error removing repository monitoring: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validates that monitoring is working correctly
   */
  async validateMonitoring(
    organizationName: string
  ): Promise<{ success: boolean; errors: string[] }> {
    try {
      logger.info(`Validating PR monitoring for organization: ${organizationName}`);
      
      // Validate webhooks
      const webhookValidation = await this.webhookManager.validateWebhooks(organizationName);
      
      // In a real implementation, we would also check:
      // 1. Database connectivity
      // 2. Function app status
      // 3. Permissions
      
      logger.info(`PR monitoring validation ${webhookValidation.success ? 'passed' : 'failed'}`);
      
      return webhookValidation;
    } catch (error) {
      logger.error(`Error validating monitoring: ${.message}`);
      return {
        success: false,
        errors: [error.message]
      };
    }
  }
}
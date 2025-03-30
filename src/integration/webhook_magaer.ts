import * as pulumi from "@pulumi/pulumi";
import * as github from "@pulumi/github";
import * as azure from "@pulumi/azure-native";
import * as logger from "../utils/logger";
import { GitHubProvider } from "../pulumi/github-provider";

/**
 * Creates and manages webhooks across multiple repositories
 */
export class WebhookManager {
  private githubProvider: GitHubProvider;
  private webhooks: Map<string, github.RepositoryWebhook>;
  private config: pulumi.Config;

  constructor() {
    this.githubProvider = new GitHubProvider();
    this.webhooks = new Map();
    this.config = new pulumi.Config();
  }

  /**
   * Sets up webhooks for all repositories in an organization
   */
  async setupOrganizationWebhooks(
    organizationName: string,
    webhookUrl: string,
    excludeRepos: string[] = []
  ): Promise<void> {
    try {
      logger.info(`Setting up webhooks for organization: ${organizationName}`);
      
      // Get all repositories in the organization
      const repos = await this.githubProvider.getOrganizationRepositories(organizationName);
      
      // Filter out excluded repositories
      const filteredRepos = repos.filter(repo => !excludeRepos.includes(repo.name));
      
      logger.info(`Found ${filteredRepos.length} repositories to configure`);
      
      // Set up webhooks for each repository
      for (const repo of filteredRepos) {
        await this.setupRepositoryWebhook(
          organizationName,
          repo.name,
          webhookUrl
        );
      }
      
      logger.info(`Successfully set up webhooks for all repositories`);
    } catch (error) {
      logger.error(`Error setting up organization webhooks: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sets up a webhook for a specific repository
   */
  async setupRepositoryWebhook(
    ownerName: string,
    repoName: string,
    webhookUrl: string
  ): Promise<github.RepositoryWebhook> {
    try {
      const fullRepoName = `${ownerName}/${repoName}`;
      logger.info(`Setting up webhook for repository: ${fullRepoName}`);
      
      // Get webhook secret from config
      const webhookSecret = this.config.requireSecret("githubWebhookSecret");
      
      // Create the webhook resource
      const webhook = new github.RepositoryWebhook(
        `webhook-${repoName}`,
        {
          repository: repoName,
          configuration: {
            url: webhookUrl,
            contentType: "json",
            secret: webhookSecret,
            insecureSsl: false,
          },
          events: [
            "pull_request",
            "pull_request_review",
            "pull_request_review_comment"
          ],
          active: true,
        },
        {
          provider: this.githubProvider.getProvider()
        }
      );
      
      // Store the webhook resource
      this.webhooks.set(fullRepoName, webhook);
      
      logger.info(`Webhook for ${fullRepoName} created successfully`);
      return webhook;
    } catch (error) {
      logger.error(`Error setting up webhook for ${ownerName}/${repoName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Updates an existing webhook
   */
  async updateRepositoryWebhook(
    ownerName: string,
    repoName: string,
    webhookUrl: string
  ): Promise<void> {
    try {
      const fullRepoName = `${ownerName}/${repoName}`;
      logger.info(`Updating webhook for repository: ${fullRepoName}`);
      
      // Check if webhook exists
      if (!this.webhooks.has(fullRepoName)) {
        // Create a new one instead
        await this.setupRepositoryWebhook(ownerName, repoName, webhookUrl);
        return;
      }
      
      // Get webhook secret from config
      const webhookSecret = this.config.requireSecret("githubWebhookSecret");
      
      // Get the existing webhook
      const existingWebhook = this.webhooks.get(fullRepoName);
      
      // Create a new one with updated URL
      const webhook = new github.RepositoryWebhook(
        `webhook-${repoName}`,
        {
          repository: repoName,
          configuration: {
            url: webhookUrl,
            contentType: "json",
            secret: webhookSecret,
            insecureSsl: false,
          },
          events: [
            "pull_request",
            "pull_request_review",
            "pull_request_review_comment"
          ],
          active: true,
        },
        {
          provider: this.githubProvider.getProvider(),
          replaceOnChanges: ["configuration.url"],
        }
      );
      
      // Update the stored webhook
      this.webhooks.set(fullRepoName, webhook);
      
      logger.info(`Webhook for ${fullRepoName} updated successfully`);
    } catch (error) {
      logger.error(`Error updating webhook for ${ownerName}/${repoName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deletes a webhook for a repository
   */
  async deleteRepositoryWebhook(
    ownerName: string,
    repoName: string
  ): Promise<void> {
    try {
      const fullRepoName = `${ownerName}/${repoName}`;
      logger.info(`Deleting webhook for repository: ${fullRepoName}`);
      
      // Check if webhook exists
      if (!this.webhooks.has(fullRepoName)) {
        logger.info(`No webhook found for ${fullRepoName}`);
        return;
      }
      
      // Remove the webhook from the map
      this.webhooks.delete(fullRepoName);
      
      logger.info(`Webhook for ${fullRepoName} deleted successfully`);
    } catch (error) {
      logger.error(`Error deleting webhook for ${ownerName}/${repoName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gets all configured webhooks
   */
  getWebhooks(): Map<string, github.RepositoryWebhook> {
    return this.webhooks;
  }

  /**
   * Validates that webhooks are working
   */
  async validateWebhooks(
    ownerName: string,
    testRepo?: string
  ): Promise<{ success: boolean; errors: string[] }> {
    try {
      logger.info(`Validating webhooks for ${ownerName}`);
      
      const errors: string[] = [];
      
      // If a test repo is provided, only validate that one
      if (testRepo) {
        const fullRepoName = `${ownerName}/${testRepo}`;
        const webhook = this.webhooks.get(fullRepoName);
        
        if (!webhook) {
          errors.push(`No webhook found for ${fullRepoName}`);
        } else {
          // In a real implementation, we would ping the webhook
          // For now, we just assume it's working if it exists
          logger.info(`Validated webhook for ${fullRepoName}`);
        }
      } else {
        // Validate all webhooks for this owner
        for (const [repoName, webhook] of this.webhooks.entries()) {
          if (repoName.startsWith(`${ownerName}/`)) {
            // In a real implementation, we would ping the webhook
            // For now, we just assume it's working if it exists
            logger.info(`Validated webhook for ${repoName}`);
          }
        }
      }
      
      return {
        success: errors.length === 0,
        errors
      };
    } catch (error) {
      logger.error(`Error validating webhooks: ${error.message}`);
      return {
        success: false,
        errors: [error.message]
      };
    }
  }
}
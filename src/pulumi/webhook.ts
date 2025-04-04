import * as pulumi from '@pulumi/pulumi';
import * as github from '@pulumi/github';
import { RepositoryConfig } from '../config/templates/standard';
import * as logger from "../utils/logger";

export function createWebhook(
  config: RepositoryConfig,
  repository: github.Repository
): github.RepositoryWebhook {
  // Get the webhook URL from config
  const pulumiConfig = new pulumi.Config();
  const webhookUrl = pulumiConfig.get("webhookUrl") || config.webhookUrl;
  
  if (!webhookUrl) {
    logger.info(`No webhook URL found for repository ${config.name}. Using empty URL.`);
  } else {
    logger.info(`Using webhook URL for repository ${config.name}: ${webhookUrl}`);
  }
  
  // Configure GitHub provider with the organization as owner
  const provider = config.organization
    ? new github.Provider(`${config.name}-webhook-provider`, {
        owner: config.organization,
      })
    : undefined;
    
  return new github.RepositoryWebhook(
    `${config.name}-webhook`,
    {
      // Just use the repository name, not the full path
      repository: repository.name,
      
      configuration: {
        url: webhookUrl || "", // Use the URL from config or empty string
        contentType: 'json',
        insecureSsl: false,
        secret: config.webhookSecret,
      },
      
      events: [
        'pull_request',
        'pull_request_review',
        'pull_request_review_comment'
      ],
      
      active: !!webhookUrl, // Only active if we have a URL
    },
    provider ? { provider } : undefined
  );
}
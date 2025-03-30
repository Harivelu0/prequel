import * as pulumi from '@pulumi/pulumi';
import * as github from '@pulumi/github';
import { RepositoryConfig } from '../config/templates/standard';

export function createWebhook(
  config: RepositoryConfig,
  repository: github.Repository
): github.RepositoryWebhook {
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
        url: config.webhookUrl,
        contentType: 'json',
        insecureSsl: false,
        secret: config.webhookSecret,
      },
      
      events: [
        'pull_request',
        'pull_request_review',
        'pull_request_review_comment'
      ],
      
      active: true,
    },
    provider ? { provider } : undefined
  );
}
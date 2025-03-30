import * as pulumi from '@pulumi/pulumi';
import * as automation from '@pulumi/pulumi/automation';
import * as github from '@pulumi/github';

import { RepositoryConfig, createStandardConfig, standardDefaults } from '../config/templates/standard';
import { createRepository } from '../pulumi/repostory';
import { createBranchProtection } from '../pulumi/branch-protection';
import { createWebhook } from '../pulumi/webhook';
import { verifyBranchProtection, verifyRepositoryWebhooks } from '../utils/github-api';

// Main deployment function using Automation API
export async function deployRepositoryConfig(
  config: RepositoryConfig,
  stackName: string = 'dev'
): Promise<automation.OutputMap> {
  // Final configuration with defaults applied
  const finalConfig: RepositoryConfig = {
    ...standardDefaults,
    ...config,
  };

  console.log('Starting deployment with configuration:');
  console.log(JSON.stringify(finalConfig, null, 2));

  // Create a program that deploys the repository configuration
  const program = async () => {
    // Create the repository
    console.log(`Creating repository: ${finalConfig.name}`);
    const repo = createRepository(finalConfig);

    // Create branch protection (dependent on the repository)
    console.log(`Setting up branch protection for: ${finalConfig.name}`);
    const branchProtection = createBranchProtection(finalConfig, repo);

    // Create webhook (dependent on the repository)
    console.log(`Setting up webhook for: ${finalConfig.name}`);
    const webhook = createWebhook(finalConfig, repo);

    // Export important values
    return {
      repositoryName: repo.name,
      repositoryUrl: repo.htmlUrl,
      defaultBranch: pulumi.output(finalConfig.defaultBranch),
      webhookUrl: pulumi.output(finalConfig.webhookUrl),
    };
  };

  // Unique stack name based on repository name and org
  const stackIdentifier = finalConfig.organization
    ? `${finalConfig.organization}-${finalConfig.name}`
    : finalConfig.name;

  // Configure and create the stack
  const stackArgs: automation.InlineProgramArgs = {
    stackName: `${stackName}-${stackIdentifier}`,
    projectName: 'prequel-repo-config',
    program,
  };

  // Create or select the stack
  console.log(`Initializing stack ${stackArgs.stackName}`);
  const stack = await automation.LocalWorkspace.createOrSelectStack(stackArgs);

  // Set GitHub token from environment
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }
  
  console.log('Setting GitHub token configuration...');
  await stack.setConfig('github:token', { value: githubToken });

  // Deploy the stack
  console.log(`Deploying configuration to ${finalConfig.name}`);
  const result = await stack.up({
    onOutput: console.log,
  });

  console.log(`Deployment complete for ${finalConfig.name}`);
  
  // Verify resources were created correctly
  const owner = finalConfig.organization || '';
  if (owner && githubToken) {
    try {
      // Allow time for GitHub API to process changes
      console.log('Waiting for GitHub API to process changes...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Verify branch protection
      const branchProtectionVerified = await verifyBranchProtection(
        owner,
        finalConfig.name,
        finalConfig.defaultBranch,
        githubToken
      );
      
      // Verify webhooks
      const webhooksVerified = await verifyRepositoryWebhooks(
        owner,
        finalConfig.name,
        githubToken
      );
      
      console.log('Verification complete:');
      console.log(`- Branch protection: ${branchProtectionVerified ? 'VERIFIED' : 'FAILED'}`);
      console.log(`- Webhooks: ${webhooksVerified ? 'VERIFIED' : 'FAILED'}`);
      
      if (!branchProtectionVerified) {
        console.warn('WARNING: Branch protection rules may not have been applied correctly.');
        console.warn('Please check GitHub repository settings manually.');
      }
    } catch (error) {
      console.error('Error during verification:', error);
    }
  }
  
  return result.outputs;
}

// Deploy to multiple repositories
export async function deployMultipleRepositories(
  configs: RepositoryConfig[],
  stackName: string = 'dev'
): Promise<Record<string, automation.OutputMap>> {
  const results: Record<string, automation.OutputMap> = {};

  // Deploy to each repository sequentially
  for (const config of configs) {
    console.log(`Starting deployment for ${config.name}`);
    results[config.name] = await deployRepositoryConfig(config, stackName);
  }

  return results;
}
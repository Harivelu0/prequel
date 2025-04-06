#!/usr/bin/env node
import { Command } from 'commander';
import * as dotenv from 'dotenv';
import { RepositoryConfig, standardDefaults } from './config/templates/standard';
import { deployRepositoryConfig, deployMultipleRepositories } from './automation/deployer';
import { createRepositoryDirectly } from './utils/github-api'; // Add this import

// Load environment variables
dotenv.config();

// Define the CLI
const program = new Command();

program
  .name('prequel')
  .description('PR Quality Management System CLI')
  .version('0.1.0');

// Command to set up a single repository
program
  .command('setup-repo')
  .description('Set up a repository with standard configuration')
  .requiredOption('-n, --name <name>', 'Repository name')
  .option('-o, --org <organization>', 'GitHub organization name')
  .option('-d, --description <description>', 'Repository description')
  .option('-v, --visibility <visibility>', 'Repository visibility (public, private, internal)')
  .option('-b, --branch <branch>', 'Default branch name')
  .option('-a, --approvals <number>', 'Number of required approvals', parseInt)
  .option('-s, --self-approvals', 'Allow self-approvals')
  .option('-w, --webhook-url <url>', 'Webhook URL')
  .option('--webhook-secret <secret>', 'Webhook secret')
  .action(async (options) => {
    // Get webhook details from env vars if not provided
    const webhookUrl = options.webhookUrl || process.env.WEBHOOK_URL;
    const webhookSecret = options.webhookSecret || process.env.WEBHOOK_SECRET;

    if (!webhookUrl || !webhookSecret) {
      console.error('Error: Webhook URL and secret must be provided via options or environment variables');
      process.exit(1);
    }

    // Create repository configuration
    const config: RepositoryConfig = {
      name: options.name,
      description: options.description || `Repository for ${options.name}`,
      organization: options.org, // Pass organization from CLI
      visibility: (options.visibility || standardDefaults.visibility) as 'public' | 'private' | 'internal',
      defaultBranch: options.branch || standardDefaults.defaultBranch as string,
      webhookUrl,
      webhookSecret,
      requiredApprovals: options.approvals || standardDefaults.requiredApprovals as number,
      allowSelfApprovals: options.selfApprovals || standardDefaults.allowSelfApprovals as boolean
    };

    try {
      console.log(`Setting up repository: ${config.name}`);
      const result = await deployRepositoryConfig(config); // Ensure this calls createRepository internally
      console.log('Repository setup complete!');
      console.log('Outputs:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Error setting up repository:', error);
      process.exit(1);
    }
  });

program
  .command('create-repo-only')
  .description('Create a repository directly using GitHub API (no Pulumi)')
  .requiredOption('-n, --name <name>', 'Repository name')
  .requiredOption('-o, --org <organization>', 'GitHub organization name')
  .option('-d, --description <description>', 'Repository description', '')
  .option('-v, --visibility <visibility>', 'Repository visibility (public, private)', 'private')
  .option('-b, --branch <branch>', 'Default branch name', 'main')
  .action(async (options) => {
    try {
      // Get GitHub token from Pulumi config or environment
      let token: string;
      const githubToken = process.env.GITHUB_TOKEN;
      
      if (!githubToken) {
        // Try to get token from Pulumi config
        const { spawnSync } = require('child_process');
        const result = spawnSync('pulumi', ['config', 'get', 'githubToken', '--show-secrets'], { 
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'] 
        });
        
        if (result.status !== 0 || !result.stdout) {
          console.error('Error: GitHub token not found in environment or Pulumi config');
          console.error('Set GITHUB_TOKEN environment variable or configure in Pulumi');
          process.exit(1);
        }
        
        token = result.stdout.trim();
      } else {
        token = githubToken;
      }
      
      console.log(`Creating repository ${options.org}/${options.name} directly via GitHub API...`);
      
      const repo = await createRepositoryDirectly({
        name: options.name,
        org: options.org,
        token: token,
        description: options.description,
        visibility: options.visibility as 'public' | 'private',
        defaultBranch: options.branch
      });
      
      console.log('Repository created successfully!');
      console.log(JSON.stringify({
        name: repo.name,
        full_name: repo.full_name,
        html_url: repo.html_url
      }, null, 2));
      
    } catch (error: any) {  
      if (error && error.message && (
        typeof error.message === 'string' &&
        (error.message.includes('branch protection') ||
        error.message.includes('GitHub Pro'))
      )) {
        console.log('WARNING: Repository created but branch protection requires GitHub Pro or a public repository');
        // Still exit with success code as the repository was created
        process.exit(0);
      } else {
        console.error('Error creating repository:', error && error.message ? error.message : error);
        process.exit(1);
      }
    }
  });

// Command to set up multiple repositories from a config file
program
  .command('setup-multiple')
  .description('Set up multiple repositories from a configuration file')
  .requiredOption('-f, --file <path>', 'Path to configuration JSON file')
  .action(async (options) => {
    try {
      // Load repository configurations from file
      const configsFile = require(options.file);
      
      if (!Array.isArray(configsFile)) {
        throw new Error('Configuration file must contain an array of repository configurations');
      }

      // Ensure all required fields are present
      const configs: RepositoryConfig[] = configsFile.map(config => {
        // Apply defaults and environment variables where needed
        return {
          ...standardDefaults as RepositoryConfig,
          ...config,
          webhookUrl: config.webhookUrl || process.env.WEBHOOK_URL,
          webhookSecret: config.webhookSecret || process.env.WEBHOOK_SECRET
        };
      });

      // Validate configs
      configs.forEach(config => {
        if (!config.name) {
          throw new Error(`Repository name is required for all repositories`);
        }
        if (!config.webhookUrl || !config.webhookSecret) {
          throw new Error(`Webhook URL and secret are required for repository: ${config.name}`);
        }
      });

      console.log(`Setting up ${configs.length} repositories...`);
      const results = await deployMultipleRepositories(configs);
      console.log('All repositories set up successfully!');
      console.log('Results:', JSON.stringify(results, null, 2));
    } catch (error) {
      console.error('Error setting up repositories:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);
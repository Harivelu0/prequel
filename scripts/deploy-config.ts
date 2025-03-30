#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { RepositoryConfig } from '../src/config/templates/standard';
import { deployMultipleRepositories } from '../src/automation/deployer';

// Load environment variables
dotenv.config();

// Validate environment variables
if (!process.env.WEBHOOK_URL || !process.env.WEBHOOK_SECRET) {
  console.error('Error: WEBHOOK_URL and WEBHOOK_SECRET environment variables must be set');
  process.exit(1);
}

async function main() {
  try {
    // Check if configuration file is provided
    const configFile = process.argv[2];
    if (!configFile) {
      console.error('Error: Configuration file path is required');
      console.log('Usage: npm run deploy <config-file.json>');
      process.exit(1);
    }

    // Read configuration file
    const configPath = path.resolve(process.cwd(), configFile);
    if (!fs.existsSync(configPath)) {
      console.error(`Error: Configuration file not found: ${configPath}`);
      process.exit(1);
    }

    // Parse configuration
    const configsRaw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!Array.isArray(configsRaw)) {
      console.error('Error: Configuration file must contain an array of repository configurations');
      process.exit(1);
    }

    // Apply defaults and environment variables
    const configs: RepositoryConfig[] = configsRaw.map(config => ({
      ...config,
      webhookUrl: config.webhookUrl || process.env.WEBHOOK_URL,
      webhookSecret: config.webhookSecret || process.env.WEBHOOK_SECRET
    }));

    // Validate configurations
    configs.forEach(config => {
      if (!config.name) {
        throw new Error(`Repository name is required for all repositories`);
      }
    });

    console.log(`Starting deployment for ${configs.length} repositories...`);
    
    // Deploy configurations to repositories
    const results = await deployMultipleRepositories(configs);
    
    console.log(`Deployment completed successfully!`);
    console.log(`Deployed ${Object.keys(results).length} repositories.`);
    
    // Display repository URLs
    Object.entries(results).forEach(([repo, outputs]) => {
      console.log(`- ${repo}: ${outputs.repositoryUrl.value}`);
    });
  } catch (error) {
    console.error('Error during deployment:', error);
    process.exit(1);
  }
}

// Run the script
main();
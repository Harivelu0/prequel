#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const dotenv = __importStar(require("dotenv"));
const standard_1 = require("./config/templates/standard");
const deployer_1 = require("./automation/deployer");
// Load environment variables
dotenv.config();
// Define the CLI
const program = new commander_1.Command();
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
    const config = {
        name: options.name,
        description: options.description || `Repository for ${options.name}`,
        organization: options.org,
        visibility: (options.visibility || standard_1.standardDefaults.visibility),
        defaultBranch: options.branch || standard_1.standardDefaults.defaultBranch,
        webhookUrl,
        webhookSecret,
        requiredApprovals: options.approvals || standard_1.standardDefaults.requiredApprovals,
        allowSelfApprovals: options.selfApprovals || standard_1.standardDefaults.allowSelfApprovals
    };
    try {
        console.log(`Setting up repository: ${config.name}`);
        const result = await (0, deployer_1.deployRepositoryConfig)(config);
        console.log('Repository setup complete!');
        console.log('Outputs:', JSON.stringify(result, null, 2));
    }
    catch (error) {
        console.error('Error setting up repository:', error);
        process.exit(1);
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
        const configs = configsFile.map(config => {
            // Apply defaults and environment variables where needed
            return {
                ...standard_1.standardDefaults,
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
        const results = await (0, deployer_1.deployMultipleRepositories)(configs);
        console.log('All repositories set up successfully!');
        console.log('Results:', JSON.stringify(results, null, 2));
    }
    catch (error) {
        console.error('Error setting up repositories:', error);
        process.exit(1);
    }
});
// Parse command line arguments
program.parse(process.argv);
//# sourceMappingURL=index.js.map
#!/usr/bin/env ts-node
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
const deployer_1 = require("../src/automation/deployer");
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
        const configs = configsRaw.map(config => ({
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
        const results = await (0, deployer_1.deployMultipleRepositories)(configs);
        console.log(`Deployment completed successfully!`);
        console.log(`Deployed ${Object.keys(results).length} repositories.`);
        // Display repository URLs
        Object.entries(results).forEach(([repo, outputs]) => {
            console.log(`- ${repo}: ${outputs.repositoryUrl.value}`);
        });
    }
    catch (error) {
        console.error('Error during deployment:', error);
        process.exit(1);
    }
}
// Run the script
main();
//# sourceMappingURL=deploy-config.js.map
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
exports.deployRepositoryConfig = deployRepositoryConfig;
exports.deployMultipleRepositories = deployMultipleRepositories;
const pulumi = __importStar(require("@pulumi/pulumi"));
const automation = __importStar(require("@pulumi/pulumi/automation"));
const standard_1 = require("../config/templates/standard");
const repostory_1 = require("../pulumi/repostory");
const branch_protection_1 = require("../pulumi/branch-protection");
const webhook_1 = require("../pulumi/webhook");
// Main deployment function using Automation API
async function deployRepositoryConfig(config, stackName = 'dev') {
    // Apply default values if not provided
    const finalConfig = {
        ...standard_1.standardDefaults,
        ...config
    };
    // Create a program that deploys the repository configuration
    const program = async () => {
        // Create the repository
        const repo = (0, repostory_1.createRepository)(finalConfig);
        // Create branch protection (dependent on the repository)
        const branchProtection = (0, branch_protection_1.createBranchProtection)(finalConfig, repo);
        // Create webhook (dependent on the repository)
        const webhook = (0, webhook_1.createWebhook)(finalConfig, repo);
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
    const stackArgs = {
        stackName: `${stackName}-${stackIdentifier}`,
        projectName: 'prequel-repo-config',
        program
    };
    // Create or select the stack
    console.log(`Initializing stack ${stackArgs.stackName}`);
    const stack = await automation.LocalWorkspace.createOrSelectStack(stackArgs);
    // Set GitHub token from environment if needed
    // This is typically done using provider registration or Pulumi config
    // Deploy the stack
    console.log(`Deploying configuration to ${finalConfig.name}`);
    const result = await stack.up({
        onOutput: console.log
    });
    console.log(`Deployment complete for ${finalConfig.name}`);
    return result.outputs;
}
// Deploy to multiple repositories
async function deployMultipleRepositories(configs, stackName = 'dev') {
    const results = {};
    // Deploy to each repository sequentially
    for (const config of configs) {
        console.log(`Starting deployment for ${config.name}`);
        results[config.name] = await deployRepositoryConfig(config, stackName);
    }
    return results;
}
//# sourceMappingURL=deployer.js.map
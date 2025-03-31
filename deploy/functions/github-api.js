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
exports.verifyBranchProtection = verifyBranchProtection;
exports.verifyRepositoryWebhooks = verifyRepositoryWebhooks;
const https = __importStar(require("https"));
/**
 * Utility to verify branch protection rules were applied correctly
 * This makes a direct GitHub API call outside of Pulumi to check
 */
async function verifyBranchProtection(owner, repo, branch, token) {
    return new Promise((resolve, reject) => {
        console.log(`Verifying branch protection for ${owner}/${repo}:${branch}...`);
        const options = {
            hostname: 'api.github.com',
            path: `/repos/${owner}/${repo}/branches/${branch}/protection`,
            method: 'GET',
            headers: {
                'User-Agent': 'PReQual-Verifier',
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log(`Branch protection verified for ${owner}/${repo}:${branch}`);
                    console.log('Protection rules found:');
                    try {
                        const protection = JSON.parse(data);
                        console.log(JSON.stringify(protection, null, 2));
                        resolve(true);
                    }
                    catch (error) {
                        console.error('Error parsing protection response:', error);
                        resolve(false);
                    }
                }
                else {
                    console.error(`Branch protection verification failed with status ${res.statusCode}`);
                    console.error('Response:', data);
                    if (res.statusCode === 404) {
                        console.error('Branch protection rules not found. This may indicate they were not applied correctly.');
                    }
                    resolve(false);
                }
            });
        });
        req.on('error', (error) => {
            console.error('Error verifying branch protection:', error);
            reject(error);
        });
        req.end();
    });
}
/**
 * Utility to verify that repository webhooks are set up correctly
 */
async function verifyRepositoryWebhooks(owner, repo, token) {
    return new Promise((resolve, reject) => {
        console.log(`Verifying webhooks for ${owner}/${repo}...`);
        const options = {
            hostname: 'api.github.com',
            path: `/repos/${owner}/${repo}/hooks`,
            method: 'GET',
            headers: {
                'User-Agent': 'PReQual-Verifier',
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const webhooks = JSON.parse(data);
                        console.log(`Found ${webhooks.length} webhooks for ${owner}/${repo}:`);
                        // Log webhook details (redacting secrets)
                        webhooks.forEach((hook, index) => {
                            const redactedHook = { ...hook };
                            if (redactedHook.config && redactedHook.config.secret) {
                                redactedHook.config.secret = '******';
                            }
                            console.log(`Webhook ${index + 1}:`, JSON.stringify(redactedHook, null, 2));
                        });
                        resolve(webhooks.length > 0);
                    }
                    catch (error) {
                        console.error('Error parsing webhooks response:', error);
                        resolve(false);
                    }
                }
                else {
                    console.error(`Webhook verification failed with status ${res.statusCode}`);
                    console.error('Response:', data);
                    resolve(false);
                }
            });
        });
        req.on('error', (error) => {
            console.error('Error verifying webhooks:', error);
            reject(error);
        });
        req.end();
    });
}

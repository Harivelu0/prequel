/**
 * Utility to verify branch protection rules were applied correctly
 * This makes a direct GitHub API call outside of Pulumi to check
 */
export declare function verifyBranchProtection(owner: string, repo: string, branch: string, token: string): Promise<boolean>;
/**
 * Utility to verify that repository webhooks are set up correctly
 */
export declare function verifyRepositoryWebhooks(owner: string, repo: string, token: string): Promise<boolean>;

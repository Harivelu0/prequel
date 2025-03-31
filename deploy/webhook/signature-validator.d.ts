/**
 * Validates GitHub webhook signature to prevent spoofing
 *
 * Note: This version gets the secret from environment variables
 * instead of requiring it as a parameter
 */
export declare function validateGitHubSignature(payload: any, signature: string): Promise<boolean>;

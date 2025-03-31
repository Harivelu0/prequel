import { Context } from "@azure/functions";
/**
 * Main entry point for processing GitHub webhook events related to pull requests
 * This function is called by index.ts
 */
export declare function processPullRequestEvent(context: Context, eventType: string, payload: any): Promise<void>;
/**
 * Process a pull request event
 *
 * @param payload - The webhook payload
 * @param context - Azure function context for logging
 */
export declare function processPREvent(payload: any, context: Context): Promise<void>;

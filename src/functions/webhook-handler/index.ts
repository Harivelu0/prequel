import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { processPullRequestEvent } from "./pr-processor";
import { validateGitHubSignature } from "./signature-validator";
import * as logger from "../../utils/logger";
import { getErrorMessage } from "../../utils/error-helpers";

/**
 * Webhook handler for GitHub events
 */
const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  context.log.info("Processing GitHub webhook");
  
  try {
    // Validate that this is a GitHub webhook
    if (!req.body) {
      context.log.error("No request body provided");
      context.res = {
        status: 400,
        body: "No request body provided"
      };
      return;
    }
    
    // Get GitHub webhook headers
    const githubEvent = req.headers.get("x-github-event");
    const signature = req.headers.get("x-hub-signature-256");
    const deliveryId = req.headers.get("x-github-delivery");
    
    // Log the event for debugging
    context.log.info(`Received GitHub event: ${githubEvent}, delivery ID: ${deliveryId}`);
    
    // Validate required headers
    if (!githubEvent || !signature || !deliveryId) {
      context.log.error("Missing required GitHub webhook headers");
      context.res = {
        status: 400,
        body: "Missing required GitHub webhook headers"
      };
      return;
    }
    
    // Validate webhook signature (prevents spoofing)
    // Note: The secret is now obtained from environment variables in validateGitHubSignature
    const isValidSignature = await validateGitHubSignature(req.body, signature);
    if (!isValidSignature) {
      context.log.error("Invalid webhook signature");
      context.res = {
        status: 401,
        body: "Invalid webhook signature"
      };
      return;
    }
    
    // Process based on event type
    if (githubEvent === "pull_request" || 
        githubEvent === "pull_request_review" || 
        githubEvent === "pull_request_review_comment") {
      await processPullRequestEvent(context, githubEvent, req.body);
    } else {
      context.log.info(`Ignoring unsupported event type: ${githubEvent}`);
    }
    
    // Return success
    context.res = {
      status: 200,
      body: "Webhook processed successfully"
    };
  } catch (error: unknown) {
    context.log.error(`Error processing webhook: ${getErrorMessage(error)}`);
    context.res = {
      status: 500,
      body: `Error processing webhook: ${getErrorMessage(error)}`
    };
  }
};

export default httpTrigger;
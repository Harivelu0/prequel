import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { validateGitHubSignature } from "./signature-validator";
import { processPREvent } from "./pr-processor";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  context.log("GitHub Webhook triggered");

  try {
    // Get GitHub event type from headers
    const githubEvent = req.headers["x-github-event"];
    const signature = req.headers["x-hub-signature-256"];
    const deliveryId = req.headers["x-github-delivery"];

    // Validate webhook signature
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      context.log.error("GitHub webhook secret is not configured");
      context.res = {
        status: 500,
        body: "Server configuration error"
      };
      return;
    }

    if (!signature || !validateGitHubSignature(req.body, signature, webhookSecret)) {
      context.log.error("Invalid GitHub signature");
      context.res = {
        status: 401,
        body: "Invalid signature"
      };
      return;
    }

    // Log event details
    context.log(`Processing GitHub event: ${githubEvent}, delivery ID: ${deliveryId}`);

    // Handle different event types
    if (githubEvent === "pull_request") {
      await processPREvent(req.body, context);
    } else if (githubEvent === "pull_request_review") {
      await processPRReviewEvent(req.body, context);
    } else {
      context.log.info(`Ignoring unsupported event type: ${githubEvent}`);
    }

    // Send success response
    context.res = {
      status: 200,
      body: "Event processed successfully"
    };
  } catch (error) {
    context.log.error(`Error processing webhook: ${error.message}`);
    context.res = {
      status: 500,
      body: `Error processing webhook: ${error.message}`
    };
  }
};

// Handler for PR review events
async function processPRReviewEvent(payload: any, context: Context): Promise<void> {
  const action = payload.action;
  const pr = payload.pull_request;
  const review = payload.review;
  const repository = payload.repository;

  context.log(`PR Review event: ${action} on PR #${pr.number} in ${repository.full_name}`);

  // Store review data in the database
  // This will be implemented in pr-processor.ts
  // For now, we just log it
  context.log(`Review state: ${review.state} by ${review.user.login}`);
}

export default httpTrigger;
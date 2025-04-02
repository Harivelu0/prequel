// geturl.ts
import * as pulumi from "@pulumi/pulumi";
import * as childProcess from "child_process";
import * as util from "util";

const exec = util.promisify(childProcess.exec);

async function getWebhookUrl() {
  try {
    // Get the current stack name
    const stackName = pulumi.getStack();
    console.log(`Getting webhook URL from stack: ${stackName}`);
    
    // Run pulumi CLI command to get the webhook URL directly
    // This is more reliable than using StackReference
    const { stdout, stderr } = await exec(`pulumi stack output webhookUrl`);
    
    if (stderr && !stdout) {
      console.error(`Error getting webhook URL: ${stderr}`);
      return;
    }
    
    const webhookUrl = stdout.trim();
    console.log(`Found webhook URL: ${webhookUrl}`);
    
    // Set it in the config
    if (webhookUrl) {
      await exec(`pulumi config set webhookUrl "${webhookUrl}"`);
      console.log("Successfully updated config with webhook URL");
    } else {
      console.error("No webhook URL found in stack outputs");
    }
  } catch (error) {
    console.error("Failed to get webhook URL:", error);
  }
}

getWebhookUrl();
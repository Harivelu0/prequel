import { AzureFunction, Context } from "@azure/functions";
import { getStalePullRequests } from "../../database/repostories/pr-repostory";
import { sendStalePRsNotification } from "../../notification/slack-service";
import * as logger from "../../utils/logger";

/**
 * Timer-triggered function to check for stale PRs and send notifications
 */
const timerTrigger: AzureFunction = async function (context: Context, myTimer: any): Promise<void> {
  const timeStamp = new Date().toISOString();
  
  if (myTimer.isPastDue) {
    context.log('Stale PR detector function is running late!');
  }
  
  context.log('Stale PR detector function started running at', timeStamp);
  
  try {
    // Get stale PRs from database
    const stalePRs = await getStalePullRequests();
    
    context.log(`Found ${stalePRs.length} stale pull requests`);
    
    if (stalePRs.length > 0) {
      // Send notification
      await sendStalePRsNotification(stalePRs);
      context.log(`Sent notification for ${stalePRs.length} stale PRs`);
      
      // Log details for each stale PR
      for (const pr of stalePRs) {
        context.log(`Stale PR: #${pr.number} in ${pr.repository} by ${pr.author} - Open for ${pr.daysOpen} days`);
      }
    }
  } catch (error) {
    context.log.error(`Error in stale PR detector: ${error.message}`);
    logger.error(`Stale PR detector error: ${error.message}`);
    throw error;
  }
};

export default timerTrigger;
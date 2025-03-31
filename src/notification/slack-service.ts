import axios from 'axios';
import * as logger from '../utils/logger';
import { getErrorMessage } from '../utils/error-helpers';

/**
 * Send a notification to Slack
 * 
 * @param message - The message to send
 * @param channelOverride - Optional channel override
 */
export async function sendSlackNotification(
  message: string,
  channelOverride?: string
): Promise<void> {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    
    if (!webhookUrl) {
      throw new Error("Slack webhook URL not configured");
    }
    
    // Prepare payload
    const payload = {
      text: message,
      // Add channel only if specified
      ...(channelOverride && { channel: channelOverride }),
    };
    
    // Send to Slack
    await axios.post(webhookUrl, payload);
    
    logger.info(`Slack notification sent: ${message.substring(0, 50)}...`);
  } catch (error: unknown) {
    logger.error(`Error message: ${getErrorMessage(error)}`);
    throw error;
  }
}

/**
 * Send a rich notification with blocks to Slack
 * 
 * @param blocks - Slack blocks format
 * @param channelOverride - Optional channel override
 */
export async function sendRichSlackNotification(
  blocks: any[],
  channelOverride?: string
): Promise<void> {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    
    if (!webhookUrl) {
      throw new Error("Slack webhook URL not configured");
    }
    
    // Prepare payload
    const payload = {
      blocks,
      // Add channel only if specified
      ...(channelOverride && { channel: channelOverride }),
    };
    
    // Send to Slack
    await axios.post(webhookUrl, payload);
    
    logger.info("Rich Slack notification sent");
  } catch (error) {
    logger.error(`Error sending rich Slack notification: ${getErrorMessage(error)}`);

    // Don't rethrow, we don't want to fail if notifications fail
  }
}

/**
 * Send a notification about stale PRs
 * 
 * @param stalePRs - Array of stale PRs
 */
export async function sendStalePRsNotification(stalePRs: any[]): Promise<void> {
  if (stalePRs.length === 0) {
    return;
  }
  
  const header = `*Stale Pull Requests Alert* :warning:\nThe following PRs have been open for more than 7 days:`;
  
  // Format list of PRs
  let prList = '';
  for (const pr of stalePRs) {
    prList += `\n• <${pr.url}|#${pr.number} ${pr.title}> in *${pr.repository}* by *${pr.author}* - Open for *${pr.daysOpen}* days`;
  }
  
  await sendSlackNotification(`${header}\n${prList}`);
}

/**
 * Send a weekly summary of PR activity
 * 
 * @param summary - PR activity summary
 */
export async function sendWeeklySummary(summary: any): Promise<void> {
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "📊 Weekly PR Activity Summary",
        emoji: true
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Week of ${summary.startDate} to ${summary.endDate}*`
      }
    },
    {
      type: "divider"
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*PRs Created:*\n${summary.created}`
        },
        {
          type: "mrkdwn",
          text: `*PRs Merged:*\n${summary.merged}`
        },
        {
          type: "mrkdwn",
          text: `*PRs Closed:*\n${summary.closed}`
        },
        {
          type: "mrkdwn",
          text: `*Open PRs:*\n${summary.open}`
        }
      ]
    },
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Top Contributors:*"
      }
    }
  ];
  
  // Add top contributors
  for (const contributor of summary.topContributors) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `• *${contributor.name}*: ${contributor.prsCreated} PRs created, ${contributor.prsReviewed} PRs reviewed`
      }
    });
  }
  
  await sendRichSlackNotification(blocks);
}
import { AzureFunction, Context } from "@azure/functions";
import { getStalePullRequests, getWeeklyPRStats } from "../database/repostories/pr-repostory";
import { getOrganizationMetrics } from "../database/repostories/metrics-repostory";
import { 
  sendSlackNotification, 
  sendRichSlackNotification, 
  sendStalePRsNotification, 
  sendWeeklySummary 
} from "./slack-service";
import * as logger from "../utils/logger";
import { getErrorMessage } from '../utils/error-helpers';

/**
 * Notification types that can be scheduled
 */
export enum NotificationType {
  STALE_PRS = 'stale_prs',
  WEEKLY_SUMMARY = 'weekly_summary',
  DAILY_SUMMARY = 'daily_summary',
  ORGANIZATION_METRICS = 'organization_metrics'
}

/**
 * Schedule a notification to be sent
 */
export async function scheduleNotification(
  type: NotificationType,
  organizationName?: string,
  options: any = {}
): Promise<void> {
  try {
    logger.info(`Scheduling notification: ${type}`);
    
    // In a real implementation, we might store this in a queue or database
    // For simplicity, we'll just send it immediately
    await sendNotification(type, organizationName, options);
    
    logger.info(`Notification sent: ${type}`);
  } catch (error: unknown) {
   
    logger.error(`Error message: ${getErrorMessage(error)}`);
    throw error;
  }
}

/**
 * Send a notification based on type
 */
async function sendNotification(
  type: NotificationType,
  organizationName?: string,
  options: any = {}
): Promise<void> {
  try {
    logger.info(`Sending notification: ${type}`);
    
    switch (type) {
      case NotificationType.STALE_PRS:
        await sendStalePRsNotification_(organizationName);
        break;
      case NotificationType.WEEKLY_SUMMARY:
        await sendWeeklySummary_(organizationName);
        break;
      case NotificationType.DAILY_SUMMARY:
        await sendDailySummary_(organizationName);
        break;
      case NotificationType.ORGANIZATION_METRICS:
        await sendOrganizationMetrics_(organizationName);
        break;
      default:
        logger.error(`Unknown notification type: ${type}`);
        throw new Error(`Unknown notification type: ${type}`);
    }
    
    logger.info(`Notification sent successfully: ${type}`);
  } catch (error: unknown) {
    logger.error(`Error message: ${getErrorMessage(error)}`);
    throw error;
  }
}

/**
 * Send notification about stale PRs
 */
async function sendStalePRsNotification_(organizationName?: string): Promise<void> {
  try {
    // Get stale PRs from database
    const stalePRs = await getStalePullRequests();
    
    if (stalePRs.length === 0) {
      logger.info('No stale PRs found, skipping notification');
      return;
    }
    
    // Send notification
    await sendStalePRsNotification(stalePRs);
    
    logger.info(`Sent notification for ${stalePRs.length} stale PRs`);
  } catch (error: unknown) {
    logger.error(`Error message: ${getErrorMessage(error)}`);
    throw error;
  }
}

/**
 * Send weekly summary notification
 */
async function sendWeeklySummary_(organizationName?: string): Promise<void> {
  try {
    // Get weekly PR statistics
    const weeklyStats = await getWeeklyPRStats();
    
    // Send weekly summary
    await sendWeeklySummary(weeklyStats);
    
    logger.info('Sent weekly PR summary');
  } catch (error: unknown) {
    
    logger.error(`Error message: ${getErrorMessage(error)}`);
    throw error;
  }
}

/**
 * Send daily summary notification
 */
async function sendDailySummary_(organizationName?: string): Promise<void> {
  try {
    // In a real implementation, this would get daily stats
    // For simplicity, we'll just create a simple message
    
    const today = new Date().toISOString().split('T')[0];
    const message = `*PR Activity Summary for ${today}*\n`;
    
    // Add some placeholder content
    const content = [
      "• *New PRs Today:* 5",
      "• *PRs Merged Today:* 3",
      "• *PRs Awaiting Review:* 8",
      "• *Average Time to Review:* 4.2 hours",
    ].join('\n');
    
    // Send the notification
    await sendSlackNotification(`${message}\n${content}`);
    
    logger.info('Sent daily PR summary');
  } catch (error: unknown) {
    logger.error(`Error message: ${getErrorMessage(error)}`);
    throw error;
  }
}

/**
 * Send organization metrics notification
 */
async function sendOrganizationMetrics_(organizationName?: string): Promise<void> {
  try {
    if (!organizationName) {
      throw new Error('Organization name is required for organization metrics');
    }
    
    // Get organization metrics
    const metrics = await getOrganizationMetrics(organizationName);
    
    if (!metrics) {
      logger.info(`No metrics found for organization: ${organizationName}`);
      return;
    }
    
    // Create blocks for rich notification
    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `📊 ${organizationName} PR Metrics`,
          emoji: true
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Total PRs:*\n${metrics.prMetrics.total}`
          },
          {
            type: "mrkdwn",
            text: `*Open PRs:*\n${metrics.prMetrics.open}`
          },
          {
            type: "mrkdwn",
            text: `*Stale PRs:*\n${metrics.prMetrics.stale}`
          },
          {
            type: "mrkdwn",
            text: `*Avg Review Time:*\n${metrics.prMetrics.averageTimeToFirstReview}`
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
          text: "*Top Repositories:*"
        }
      }
    ];
    
    // Add top repositories
    metrics.topRepositories.forEach((repo: any) => {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `• *${repo.name}*: ${repo.prCount} PRs`
        }
      });
    });
    
    // Add top contributors
    blocks.push(
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
    );
    
    metrics.topContributors.forEach((contributor: any) => {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `• *${contributor.username}*: ${contributor.prsCreated} PRs created, ${contributor.prsReviewed} PRs reviewed`
        }
      });
    });
    
    // Send the rich notification
    await sendRichSlackNotification(blocks);
    
    logger.info(`Sent organization metrics for: ${organizationName}`);
  } catch (error: unknown) {
    
    logger.error(`Error message: ${getErrorMessage(error)}`);
    throw error;
  }
}

/**
 * Timer-triggered function for scheduled notifications
 */
export const scheduledNotifications: AzureFunction = async function (context: Context, myTimer: any): Promise<void> {
  const timeStamp = new Date().toISOString();
  
  if (myTimer.isPastDue) {
    context.log('Notification scheduler function is running late!');
  }
  
  context.log('Notification scheduler function started running at', timeStamp);
  
  try {
    // Determine what notifications to send based on schedule
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const hour = now.getHours();
    
    // Weekly summary on Monday mornings
    if (dayOfWeek === 1 && hour === 9) {
      await scheduleNotification(NotificationType.WEEKLY_SUMMARY);
    }
    
    // Daily summary every weekday at 4pm
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && hour === 16) {
      await scheduleNotification(NotificationType.DAILY_SUMMARY);
    }
    
    // Check for stale PRs every day at 10am
    if (hour === 10) {
      await scheduleNotification(NotificationType.STALE_PRS);
    }
    
    // Organization metrics on Friday at 2pm
    if (dayOfWeek === 5 && hour === 14) {
      // Get organization names from environment
      const orgNamesString = process.env.MONITORED_ORGANIZATIONS;
      if (orgNamesString) {
        const orgNames = orgNamesString.split(',');
        for (const orgName of orgNames) {
          await scheduleNotification(NotificationType.ORGANIZATION_METRICS, orgName.trim());
        }
      }
    }
    
    context.log('Notification scheduler completed successfully');
  } catch (error: unknown) {
    logger.error(`Error message: ${getErrorMessage(error)}`);
    throw error;
  }
};
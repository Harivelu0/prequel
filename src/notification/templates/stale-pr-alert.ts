/**
 * Template for stale PR notifications
 */
export function generateStalePRMessage(stalePRs: Array<{
    number: number;
    title: string;
    url: string;
    repository: string;
    author: string;
    daysOpen: number;
  }>): string {
    if (stalePRs.length === 0) {
      return "";
    }
    
    let message = `*Stale Pull Requests Alert* :warning:\nThe following PRs have been open for more than 7 days:`;
    
    // Add each stale PR to the list
    for (const pr of stalePRs) {
      message += `\n• <${pr.url}|#${pr.number} ${pr.title}> in *${pr.repository}* by *${pr.author}* - Open for *${pr.daysOpen}* days`;
    }
    
    // Add reminder about importance of timely reviews
    message += `\n\n:reminder_ribbon: _Prompt code reviews help maintain team velocity and code quality. Please review these PRs as soon as possible._`;
    
    return message;
  }
  
  /**
   * Generate rich blocks format for Slack
   */
  export function generateStalePRBlocks(stalePRs: Array<{
    number: number;
    title: string;
    url: string;
    repository: string;
    author: string;
    daysOpen: number;
  }>): any[] {
    if (stalePRs.length === 0) {
      return [];
    }
    
    // Start with header block
    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "⚠️ Stale Pull Requests Alert",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "The following PRs have been open for more than 7 days and need attention:"
        }
      },
      {
        type: "divider"
      }
    ];
    
    // Add a section for each stale PR
    for (const pr of stalePRs) {
      // Create a visual indicator for how stale the PR is
      let staleIndicator = "";
      if (pr.daysOpen >= 21) {
        staleIndicator = "🔴"; // Very stale (3+ weeks)
      } else if (pr.daysOpen >= 14) {
        staleIndicator = "🟠"; // Quite stale (2+ weeks)
      } else {
        staleIndicator = "🟡"; // Stale (1+ week)
      }
      
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${staleIndicator} <${pr.url}|#${pr.number} ${pr.title}>\n*Repository:* ${pr.repository} | *Author:* ${pr.author} | *Open for:* ${pr.daysOpen} days`
        },
        accessory: {
          type: "button",
          text: {
            type: "plain_text",
            text: "Review",
            emoji: true
          },
          url: pr.url
        }
      });
    }
    
    // Add a note about team velocity
    blocks.push(
      {
        type: "divider"
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: ":reminder_ribbon: _Prompt code reviews help maintain team velocity and code quality. Please review these PRs as soon as possible._"
          }
        ]
      }
    );
    
    return blocks;
  }
  
  /**
   * Determine priority level of stale PRs
   */
  export function getStalePRsPriority(stalePRs: Array<{ daysOpen: number }>): 'low' | 'medium' | 'high' {
    if (stalePRs.length === 0) {
      return 'low';
    }
    
    // Count very stale PRs (21+ days)
    const veryStaleCount = stalePRs.filter(pr => pr.daysOpen >= 21).length;
    
    // Count quite stale PRs (14+ days)
    const quiteStaleCount = stalePRs.filter(pr => pr.daysOpen >= 14).length;
    
    if (veryStaleCount > 0 || stalePRs.length >= 5) {
      return 'high';
    } else if (quiteStaleCount > 0 || stalePRs.length >= 3) {
      return 'medium';
    } else {
      return 'low';
    }
  }
/**
 * Template for PR review notifications
 */
export function generatePRReviewedMessage(review: {
    prNumber: number;
    prTitle: string;
    prUrl: string;
    repository: string;
    author: string;
    reviewer: string;
    state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED';
    comment?: string;
  }): string {
    const { prNumber, prTitle, prUrl, repository, author, reviewer, state, comment } = review;
    
    // Determine emoji based on review state
    let stateEmoji = '';
    let stateText = '';
    
    switch (state) {
      case 'APPROVED':
        stateEmoji = '✅';
        stateText = 'approved';
        break;
      case 'CHANGES_REQUESTED':
        stateEmoji = '❌';
        stateText = 'requested changes to';
        break;
      case 'COMMENTED':
        stateEmoji = '💬';
        stateText = 'commented on';
        break;
    }
    
    // Basic message
    let message = `${stateEmoji} *${reviewer}* ${stateText} <${prUrl}|#${prNumber} ${prTitle}> in *${repository}* by *${author}*`;
    
    // Add comment snippet if available
    if (comment) {
      // Truncate comment if too long
      const maxCommentLength = 150;
      const truncatedComment = comment.length > maxCommentLength 
        ? comment.substring(0, maxCommentLength) + '...'
        : comment;
      
      message += `\n>${truncatedComment.replace(/\n/g, '\n>')}`;
    }
    
    return message;
  }
  
  /**
   * Generate rich blocks format for Slack
   */
  export function generatePRReviewedBlocks(review: {
    prNumber: number;
    prTitle: string;
    prUrl: string;
    repository: string;
    author: string;
    reviewer: string;
    reviewerAvatar?: string;
    state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED';
    comment?: string;
  }): any[] {
    const { 
      prNumber, prTitle, prUrl, repository, author, 
      reviewer, reviewerAvatar, state, comment 
    } = review;
    
    // Determine header text and color based on review state
    let headerText = '';
    let color = '';
    
    switch (state) {
      case 'APPROVED':
        headerText = '✅ PR Approved';
        color = '#36a64f'; // Green
        break;
      case 'CHANGES_REQUESTED':
        headerText = '❌ Changes Requested';
        color = '#e01e5a'; // Red
        break;
      case 'COMMENTED':
        headerText = '💬 PR Comment';
        color = '#2eb67d'; // Blue-Green
        break;
    }
    
    // Start with header block
    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: headerText,
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<${prUrl}|#${prNumber} ${prTitle}>`
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*Repository:* ${repository}`
          },
          {
            type: "mrkdwn",
            text: `*Author:* ${author}`
          },
          {
            type: "mrkdwn",
            text: `*Reviewer:* ${reviewer}`
          }
        ]
      }
    ];
    
    // Add comment if available
    if (comment) {
      // Truncate comment if too long
      const maxCommentLength = 300;
      const truncatedComment = comment.length > maxCommentLength 
        ? comment.substring(0, maxCommentLength) + '...'
        : comment;
      
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `>${truncatedComment.replace(/\n/g, '\n>')}`
        }
      });
    }
    
    // Add action buttons
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "View PR",
            emoji: true
          },
          url: prUrl,
          style: "primary"
        }
      ]
    });
    
    return blocks;
  }
  
  /**
   * Get correct wording for review state
   */
  export function getReviewStateText(state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED'): string {
    switch (state) {
      case 'APPROVED':
        return 'approved';
      case 'CHANGES_REQUESTED':
        return 'requested changes to';
      case 'COMMENTED':
        return 'commented on';
      default:
        return 'reviewed';
    }
  }
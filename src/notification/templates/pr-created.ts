/**
 * Template for PR creation notifications
 */
export function generatePRCreatedMessage(pr: {
    number: number;
    title: string;
    url: string;
    repository: string;
    author: string;
    description?: string;
    labels?: string[];
  }): string {
    const { number, title, url, repository, author, description, labels } = pr;
    
    // Basic message
    let message = `*New PR Created*: <${url}|#${number} ${title}> in *${repository}* by *${author}*`;
    
    // Add labels if present
    if (labels && labels.length > 0) {
      message += `\nLabels: ${labels.map(label => `\`${label}\``).join(', ')}`;
    }
    
    // Add description summary if available
    if (description) {
      // Truncate description if too long
      const maxDescriptionLength = 150;
      const truncatedDescription = description.length > maxDescriptionLength 
        ? description.substring(0, maxDescriptionLength) + '...'
        : description;
      
      message += `\n>${truncatedDescription.replace(/\n/g, '\n>')}`;
    }
    
    // Add call to action
    message += `\n\n:eyes: <${url}|Review this PR>`;
    
    return message;
  }
  
  /**
   * Generate rich blocks format for Slack
   */
  export function generatePRCreatedBlocks(pr: {
    number: number;
    title: string;
    url: string;
    repository: string;
    author: string;
    authorAvatar?: string;
    description?: string;
    labels?: string[];
    changedFiles?: number;
    additions?: number;
    deletions?: number;
  }): any[] {
    const { 
      number, title, url, repository, author, authorAvatar,
      description, labels, changedFiles, additions, deletions
    } = pr;
    
    // Start with header block
    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "✨ New Pull Request",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<${url}|#${number} ${title}>`
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
          }
        ]
      }
    ];
    
    // Add stats if available
    if (changedFiles !== undefined || additions !== undefined || deletions !== undefined) {
      const statsText = [
        changedFiles !== undefined ? `*Files:* ${changedFiles}` : null,
        additions !== undefined ? `*Additions:* +${additions}` : null,
        deletions !== undefined ? `*Deletions:* -${deletions}` : null
      ].filter(Boolean).join(" | ");
      
      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: statsText
          }
        ]
      });
    }
    
    // Add labels if present
    if (labels && labels.length > 0) {
      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*Labels:* ${labels.map(label => `\`${label}\``).join(', ')}`
          }
        ]
      });
    }
    
    // Add description if available
    if (description) {
      // Truncate description if too long
      const maxDescriptionLength = 300;
      const truncatedDescription = description.length > maxDescriptionLength 
        ? description.substring(0, maxDescriptionLength) + '...'
        : description;
      
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `>${truncatedDescription.replace(/\n/g, '\n>')}`
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
            text: "Review PR",
            emoji: true
          },
          url: url,
          style: "primary"
        }
      ]
    });
    
    return blocks;
  }
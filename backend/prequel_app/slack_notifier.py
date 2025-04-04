import requests
import logging
from datetime import datetime
import os
import sys

# Add the project root directory to Python's path
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from prequel_db.db_handler import DatabaseHandler

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def send_slack_notification(webhook_url, title, text, fields=None, actions=None):
    """
    Send a notification to the Slack webhook
    """
    try:
        if not webhook_url:
            logger.error("SLACK_WEBHOOK_URL not configured")
            return False
            
        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": title
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": text
                }
            }
        ]
        
        # Add fields if provided
        if fields:
            field_block = {
                "type": "section",
                "fields": []
            }
            for field in fields:
                field_block["fields"].append({
                    "type": "mrkdwn",
                    "text": field
                })
            blocks.append(field_block)
        
        # Add actions if provided
        if actions:
            action_block = {
                "type": "actions",
                "elements": []
            }
            for action in actions:
                action_block["elements"].append({
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": action["text"]
                    },
                    "url": action["url"]
                })
            blocks.append(action_block)
        
        message = {
            "blocks": blocks
        }
        
        logger.debug("Sending notification to Slack")
        response = requests.post(webhook_url, json=message)
        logger.debug(f"Slack API Response: {response.status_code} - {response.text}")
        return response.status_code == 200
    except Exception as e:
        logger.error(f"Error sending Slack notification: {str(e)}")
        return False

def check_stale_prs(stale_days):
    """
    Check for stale PRs and send notifications
    """
    try:
        db = DatabaseHandler()
        
        # Check if database connection was successful
        if hasattr(db, 'connection_failed') and db.connection_failed:
            logger.error("Database connection failed, skipping stale PR check")
            return
            
        newly_stale_pr_ids = db.check_for_stale_prs(stale_days)
        
        if newly_stale_pr_ids:
            stale_prs = db.get_stale_prs()
            
            if stale_prs:
                # Check if slack webhook URL is available
                import os
                webhook_url = os.getenv('SLACK_WEBHOOK_URL')
                if not webhook_url:
                    logger.error("SLACK_WEBHOOK_URL not configured")
                    db.close()
                    return
                
                # Notify about stale PRs
                title = "🚨 Stale Pull Requests Detected"
                text = f"The following pull requests have been inactive for {stale_days} days:"
                
                fields = []
                actions = []
                
                # Only include up to 10 PRs to avoid Slack message size limits
                for i, pr in enumerate(stale_prs[:10]):
                    pr_id, pr_title, pr_number, pr_url, repo_name, username, created_at, last_activity = pr
                    
                    days_inactive = (datetime.now() - last_activity).days if isinstance(last_activity, datetime) else '?'
                    fields.append(f"*{repo_name} #{pr_number}*: {pr_title}")
                    fields.append(f"Created by: {username} | Inactive for {days_inactive} days")
                    
                    actions.append({
                        "text": f"View #{pr_number}",
                        "url": pr_url
                    })
                
                # If there are more than 10 stale PRs, add a note
                if len(stale_prs) > 10:
                    text += f"\n\n*Note: Showing 10 of {len(stale_prs)} stale PRs*"
                
                send_slack_notification(webhook_url, title, text, fields, actions)
        
        db.close()
    except Exception as e:
        logger.error(f"Error checking for stale PRs: {str(e)}")
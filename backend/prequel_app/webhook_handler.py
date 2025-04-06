from flask import request, jsonify
import logging
from datetime import datetime

from prequel_app.github_handler import (
    verify_github_webhook,
    process_pull_request,
    process_review,
    process_review_comment
)
from prequel_app.slack_notifier import send_slack_notification

# Set up logging
logger = logging.getLogger(__name__)

def handle_webhook(github_secret, slack_webhook_url):
    """
    Handle GitHub webhook events
    """
    logger.info("Received webhook request")
    logger.debug(f"Request Headers: {dict(request.headers)}")
    
    # Verify webhook signature
    if not verify_github_webhook(request, github_secret):
        logger.error("Webhook verification failed")
        return jsonify({"error": "Invalid signature"}), 400
    
    try:
        data = request.get_json()
        event_type = request.headers.get('X-GitHub-Event')
        logger.info(f"Event type: {event_type}")
        
        # Handle different event types
        if event_type == 'pull_request':
            action = data.get('action')
            logger.info(f"Pull request action: {action}")
            
            if action in ['opened', 'reopened', 'synchronize', 'edited']:
                pr_id = process_pull_request(data)
                
                # Send notification for new PRs
                if action == 'opened' and slack_webhook_url:
                    pr = data['pull_request']
                    repo = data['repository']
                    
                    title = "🔔 New Pull Request Created"
                    text = f"*{pr['title']}*\n{pr.get('body', 'No description provided.')}"
                    
                    fields = [
                        f"*Repository:* {repo['full_name']}",
                        f"*Created by:* {pr['user']['login']}"
                    ]
                    
                    actions = [{
                        "text": "View Pull Request",
                        "url": pr['html_url']
                    }]
                    
                    send_slack_notification(slack_webhook_url, title, text, fields, actions)
                
                return jsonify({"status": "success", "message": "PR processed"}), 200
                
        elif event_type == 'pull_request_review':
            review_id = process_review(data)
            return jsonify({"status": "success", "message": "Review processed"}), 200
            
        elif event_type == 'pull_request_review_comment':
            comment_id = process_review_comment(data)
            return jsonify({"status": "success", "message": "Comment processed"}), 200
        
        # Handle ping event (GitHub sends this when webhook is first configured)
        elif event_type == 'ping':
            return jsonify({"status": "success", "message": "Pong!"}), 200
            
        return jsonify({"status": "success", "message": "Event received"}), 200
        
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        return jsonify({"error": f"Error processing webhook: {str(e)}"}), 500

def setup_webhook_routes(app, github_secret, slack_webhook_url):
    """
    Set up webhook routes for the Flask app
    """
    @app.route('/', methods=['POST'])
    def webhook_route():
        return handle_webhook(github_secret, slack_webhook_url)
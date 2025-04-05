from flask import Flask, request, jsonify
import logging
import threading
import time
import os
import sys
import json
from datetime import datetime
from dotenv import load_dotenv
# In prequel_app/app.py
from flask_cors import CORS
from flask import jsonify
from prequel_app.github_handler import (
    verify_github_webhook,
    process_pull_request,
    process_review,
    process_review_comment
)
from prequel_db.db_handler import DatabaseHandler
from prequel_app.slack_notifier import send_slack_notification, check_stale_prs
from prequel_app.pulumi_executor import PulumiExecutor

pulumi_executor = PulumiExecutor(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../infrastructure')))
# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configuration
SLACK_WEBHOOK_URL = os.getenv('SLACK_WEBHOOK_URL')
GITHUB_SECRET = os.getenv('GITHUB_WEBHOOK_SECRET')
STALE_PR_DAYS = int(os.getenv('STALE_PR_DAYS', '7'))  # Default to 7 days

CORS(app, resources={r"/*": {"origins": "*"}})
deployment_status = {
    "status": "idle",  # idle, deploying, complete, failed
    "started_at": None,
    "completed_at": None,
    "error": None
}


# Background task for checking stale PRs
def stale_pr_checker():
    """Background thread to check for stale PRs on a schedule"""
    while True:
        logger.info("Running scheduled stale PR check")
        check_stale_prs(STALE_PR_DAYS)
        # Sleep for 1 day (86400 seconds)
        time.sleep(86400)


def deploy_infrastructure_async(infrastructure_dir):
    """Function to deploy infrastructure in a background thread"""
    try:
        # Wait a bit to ensure config is properly set
        time.sleep(2)
        
        pulumi_executor = PulumiExecutor(infrastructure_dir)
        success = pulumi_executor.deploy_infrastructure()
        
        if success:
            logger.info("Background infrastructure deployment completed successfully")
        else:
            logger.error("Background infrastructure deployment failed")
    except Exception as e:
        logger.error(f"Error in background deployment: {str(e)}")

@app.route('/api/config/status', methods=['GET'])
def get_deployment_status():
    """Get the current infrastructure deployment status"""
    global deployment_status
    return jsonify(deployment_status), 200

# Modified save_configuration function with background thread
@app.route('/api/config', methods=['POST'])
def save_configuration():
    """Save GitHub and Slack configuration and provision infrastructure"""
    try:
        data = request.get_json()
        github_token = data.get('githubToken')
        organization_name = data.get('organizationName')
        slack_webhook_url = data.get('slackWebhookUrl')
        
        logger.info(f"Received configuration request for organization: {organization_name}")
        
        # Validate inputs
        if not github_token or not organization_name:
            return jsonify({"error": "GitHub token and organization name are required"}), 400
        
        # Save to environment variables for current process
        os.environ['GITHUB_TOKEN'] = github_token
        os.environ['ORGANIZATION_NAME'] = organization_name
        if slack_webhook_url:
            os.environ['SLACK_WEBHOOK_URL'] = slack_webhook_url
        
        # Store configuration persistently
        config_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../config'))
        os.makedirs(config_dir, exist_ok=True)
        
        # Store config securely - in production, use a proper secrets manager
        with open(os.path.join(config_dir, 'github_config.json'), 'w') as f:
            json.dump({
                'token': github_token,
                'organization': organization_name
            }, f)
            
        if slack_webhook_url:
            with open(os.path.join(config_dir, 'slack_config.json'), 'w') as f:
                json.dump({
                    'webhook_url': slack_webhook_url
                }, f)
        
        # Initialize Pulumi executor
        infrastructure_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../infrastructure'))
        pulumi_executor = PulumiExecutor(infrastructure_dir)
        
        # Execute Pulumi to set up configuration
        logger.info(f"Running Pulumi setup for organization: {organization_name}")
        success = pulumi_executor.setup_config(
            github_token=github_token,
            organization_name=organization_name,
            slack_webhook_url=slack_webhook_url
        )
        
        if not success:
            logger.error("Failed to set up Pulumi configuration")
            return jsonify({"error": "Failed to set up Pulumi configuration"}), 500
            
        # Update global deployment status
        global deployment_status
        deployment_status["status"] = "deploying"
        deployment_status["started_at"] = datetime.now().isoformat()
        deployment_status["completed_at"] = None
        deployment_status["error"] = None
        
        # Deploy infrastructure in background thread
        thread = threading.Thread(
            target=deploy_infrastructure_async,
            args=(infrastructure_dir,)
        )
        thread.daemon = True
        thread.start()
        
        return jsonify({
            "message": "Configuration saved. Infrastructure deployment started in background.",
            "status": "deploying"
        }), 200
        
    except Exception as e:
        logger.error(f"Configuration error: {str(e)}")
        return jsonify({"error": f"Failed to save configuration: {str(e)}"}), 500

# API endpoint for creating repositories
@app.route('/api/repositories', methods=['POST'])
def create_repository():
    """Create a new repository with branch protection"""
    
    try:
        data = request.get_json()
        repo_name = data.get('name')
        description = data.get('description', '')
        visibility = data.get('visibility', 'private')
        branch = data.get('branch', 'main')
        
        if not repo_name:
            return jsonify({"error": "Repository name is required"}), 400
        
        # Get organization from environment or config file
        organization = os.environ.get('ORGANIZATION_NAME')
        if not organization:
            # Try to load from config file
            config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../config/github_config.json'))
            try:
                with open(config_path, 'r') as f:
                    github_config = json.load(f)
                    organization = github_config.get('organization')
            except Exception as e:
                logger.error(f"Error loading organization from config: {str(e)}")
                
        if not organization:
            return jsonify({"error": "Organization name not configured"}), 500
            
        # Initialize Pulumi executor
        infrastructure_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../infrastructure'))
        pulumi_executor = PulumiExecutor(infrastructure_dir)
        
        # Execute Pulumi to create repository
        logger.info(f"Creating repository {repo_name} in organization {organization}")
        success, details = pulumi_executor.create_repository(
            name=repo_name,
            org=organization,
            description=description,
            visibility=visibility,
            branch=branch
        )
        
        if not success:
            if "branch protection" in str(details.get('error', '')).lower() or \
               "could not resolve to a repository" in str(details.get('error', '')).lower():
                # Repository was likely created, return partial success
                logger.warning(f"Repository likely created but branch protection failed: {details.get('error')}")
                return jsonify({
                    "message": "Repository created but branch protection failed",
                    "repository": {
                        "name": repo_name,
                        "full_name": f"{organization}/{repo_name}",
                        "url": f"https://github.com/{organization}/{repo_name}"
                    },
                    "warning": "Branch protection could not be applied"
                }), 200
            
            # Complete failure, return error
            logger.error(f"Failed to create repository: {details.get('error')}")
            return jsonify({"error": f"Failed to create repository: {details.get('error')}"}), 500
        
        # Add repository to database
        try:
            db = DatabaseHandler()
            repo_data = {
                'id': 0,  # GitHub ID not available yet
                'name': repo_name,
                'full_name': f"{organization}/{repo_name}"
            }
            db.get_or_create_repository(repo_data)
            db.close()
        except Exception as e:
            logger.warning(f"Failed to store repository in database: {str(e)}")
            # Continue anyway since the GitHub repo was created
        
        return jsonify({
            "message": "Repository created successfully",
            "repository": details
        }), 200
    except Exception as e:
        logger.error(f"Repository creation error: {str(e)}")
        return jsonify({"error": f"Failed to create repository: {str(e)}"}), 500

# API endpoint for dashboard statistics
@app.route('/api/stats', methods=['GET'])
def get_dashboard_stats():
    """Get comprehensive dashboard statistics"""
    try:
        db = DatabaseHandler()
        
        # Collect statistics
        stats = {
            'pr_metrics': db.get_pr_metrics(),
            'repositories': db.get_repositories_with_pr_counts(),
            'contributors': db.get_contributors_with_counts(),
            'stale_prs': db.get_stale_prs(),
            'recent_prs': db.get_recent_prs(limit=10)
        }
        
        # Process stale PRs into a user-friendly format
        formatted_stale_prs = []
        for pr in stats['stale_prs']:
            pr_id, title, number, html_url, repo_name, username, created_at, last_activity_at = pr
            formatted_stale_prs.append({
                'id': pr_id,
                'title': title,
                'number': number,
                'html_url': html_url,
                'repository_name': repo_name,
                'author_name': username,
                'created_at': created_at.isoformat() if created_at else None,
                'last_activity_at': last_activity_at.isoformat() if last_activity_at else None,
                'days_stale': (datetime.now() - last_activity_at).days if last_activity_at else None
            })
        
        stats['stale_prs'] = formatted_stale_prs
        
        db.close()
        return jsonify(stats), 200
    except Exception as e:
        logger.error(f"Error retrieving dashboard stats: {str(e)}")
        return jsonify({"error": f"Failed to retrieve statistics: {str(e)}"}), 500

# API endpoint to get PR metrics
@app.route('/api/metrics', methods=['GET'])
def get_pr_metrics():
    db = DatabaseHandler()
    metrics = db.get_pr_metrics()
    db.close()
    return jsonify(metrics)

# API endpoint to get stale PRs
@app.route('/api/stale-prs', methods=['GET'])
def get_stale_prs():
    db = DatabaseHandler()
    stale_prs = db.get_stale_prs()
    db.close()
    
    # Convert to JSON-friendly format
    result = []
    for pr in stale_prs:
        pr_id, title, number, html_url, repo_name, username, created_at, last_activity_at = pr
        result.append({
            'id': pr_id,
            'github_id': 0,  # Not available from the query
            'repository_id': 0,  # Not available from the query
            'author_id': 0,  # Not available from the query
            'title': title,
            'number': number,
            'state': 'open',
            'html_url': html_url,
            'created_at': created_at.isoformat() if created_at else None,
            'updated_at': last_activity_at.isoformat() if last_activity_at else None,
            'closed_at': None,
            'merged_at': None,
            'is_stale': True,
            'last_activity_at': last_activity_at.isoformat() if last_activity_at else None,
            'repository_name': repo_name,
            'author_name': username
        })
    
    return jsonify(result)

# API endpoint to get repositories
@app.route('/api/repositories', methods=['GET'])
def get_repositories():
    db = DatabaseHandler()
    # Add a method to your DatabaseHandler to get repositories with PR counts
    repositories = db.get_repositories_with_pr_counts()
    db.close()
    
    return jsonify(repositories)

# API endpoint to get contributors
@app.route('/api/contributors', methods=['GET'])
def get_contributors():
    db = DatabaseHandler()
    # Add a method to your DatabaseHandler to get contributors with counts
    contributors = db.get_contributors_with_counts()
    db.close()
    
    return jsonify(contributors)

# Route handlers
@app.route('/', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/', methods=['POST'])
def handle_webhook():
    """
    Handle GitHub webhook events
    """
    logger.info("Received webhook request")
    logger.debug(f"Request Headers: {dict(request.headers)}")
    
    # Verify webhook signature
    if not verify_github_webhook(request, GITHUB_SECRET):
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
                if action == 'opened' and SLACK_WEBHOOK_URL:
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
                    
                    send_slack_notification(SLACK_WEBHOOK_URL, title, text, fields, actions)
                
                return jsonify({"status": "success", "message": "PR processed"}), 200
                
        elif event_type == 'pull_request_review':
            review_id = process_review(data)
            
            # Send notification for requested changes
            if data['review']['state'] == 'changes_requested' and SLACK_WEBHOOK_URL:
                pr = data['pull_request']
                review = data['review']
                repo = data['repository']
                
                title = "⚠️ Changes Requested on Pull Request"
                text = f"*{pr['title']}*\n{review.get('body', 'No review comments provided.')}"
                
                fields = [
                    f"*Repository:* {repo['full_name']}",
                    f"*PR Author:* {pr['user']['login']}",
                    f"*Reviewer:* {review['user']['login']}"
                ]
                
                actions = [{
                    "text": "View Review",
                    "url": review['html_url']
                }]
                
                send_slack_notification(SLACK_WEBHOOK_URL, title, text, fields, actions)
            
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

if __name__ == '__main__':
    # Verify environment variables
    missing_vars = []
    if not GITHUB_SECRET:
        missing_vars.append("GITHUB_WEBHOOK_SECRET")
    
    if not os.getenv('DATABASE_CONNECTION_STRING'):
        missing_vars.append("DATABASE_CONNECTION_STRING")
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
        logger.error("Please set these variables in your .env file")
    
    # Start stale PR checker in a separate thread if Slack webhook is configured
    if SLACK_WEBHOOK_URL:
        checker_thread = threading.Thread(target=stale_pr_checker, daemon=True)
        checker_thread.start()
        logger.info("Started stale PR checker thread")
    else:
        logger.warning("SLACK_WEBHOOK_URL not set, stale PR notifications disabled")
    
    logger.info("Starting GitHub webhook server...")
    app.run(host='0.0.0.0', port=5001, debug=False)
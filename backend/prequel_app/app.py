from flask import Flask, jsonify
import logging
import threading
import time
import os
from datetime import datetime
from dotenv import load_dotenv
from flask_cors import CORS

from prequel_app.webhook_handler import setup_webhook_routes
from prequel_app.config_handler import setup_config_routes
from prequel_app.repository_handler import setup_repository_routes
from prequel_app.stats_handler import setup_stats_routes
from prequel_app.slack_notifier import check_stale_prs

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

# Background task for checking stale PRs
def stale_pr_checker():
    """Background thread to check for stale PRs on a schedule"""
    while True:
        logger.info("Running scheduled stale PR check")
        check_stale_prs(STALE_PR_DAYS)
        # Sleep for 1 day (86400 seconds)
        time.sleep(86400)

# Register all routes
setup_webhook_routes(app, GITHUB_SECRET, SLACK_WEBHOOK_URL)
setup_config_routes(app)
setup_repository_routes(app)
setup_stats_routes(app)

@app.route('/', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    })

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
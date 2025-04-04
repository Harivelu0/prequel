import hmac
import hashlib
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

def verify_github_webhook(request, github_secret):
    """
    Verify that the webhook request came from GitHub
    """
    logger.debug("Starting webhook verification")
    
    # Get headers
    received_signature = request.headers.get('X-Hub-Signature-256')
    logger.debug(f"Received X-Hub-Signature-256: {received_signature}")
    
    if not received_signature:
        logger.error("No X-Hub-Signature-256 found in headers")
        return False

    # Get payload
    payload_body = request.get_data()
    logger.debug(f"Payload length: {len(payload_body)} bytes")
    
    if not github_secret:
        logger.error("GITHUB_SECRET not configured")
        return False
        
    try:
        # Calculate signature
        secret_bytes = github_secret.encode('utf-8')
        hmac_gen = hmac.new(secret_bytes, payload_body, hashlib.sha256)
        expected_signature = f"sha256={hmac_gen.hexdigest()}"
        logger.debug(f"Expected signature: {expected_signature}")
        logger.debug(f"Received signature: {received_signature}")
        
        return hmac.compare_digest(received_signature, expected_signature)
    except Exception as e:
        logger.error(f"Error during signature verification: {str(e)}")
        return False

def process_pull_request(data):
    """
    Process pull request event data and store in database
    """
    try:
        db = DatabaseHandler()
        
        # Check if database connection was successful
        if hasattr(db, 'connection_failed') and db.connection_failed:
            logger.error("Database connection failed, skipping PR processing")
            return None
            
        # Extract repository and user info
        repo_data = data.get('repository')
        pr_data = data.get('pull_request')
        
        if not repo_data or not pr_data:
            logger.error("Missing repository or PR data")
            return None
            
        user_data = pr_data.get('user')
        
        if not user_data:
            logger.error("Missing user data in PR")
            return None
        
        # Store in database
        repo_id = db.get_or_create_repository(repo_data)
        user_id = db.get_or_create_user(user_data)
        
        if repo_id is None or user_id is None:
            logger.error(f"Failed to get or create repository or user: repo_id={repo_id}, user_id={user_id}")
            db.close()
            return None
            
        pr_id = db.get_or_create_pull_request(pr_data, repo_id, user_id)
        
        db.close()
        return pr_id
    except Exception as e:
        logger.error(f"Error processing pull request: {str(e)}")
        return None

def process_review(data):
    """
    Process pull request review event data and store in database
    """
    try:
        db = DatabaseHandler()
        
        # Check if database connection was successful
        if hasattr(db, 'connection_failed') and db.connection_failed:
            logger.error("Database connection failed, skipping review processing")
            return None
            
        # Extract repository, user, PR, and review info
        repo_data = data.get('repository')
        review_data = data.get('review')
        pr_data = data.get('pull_request')
        
        if not repo_data or not review_data or not pr_data:
            logger.error("Missing repository, review, or PR data")
            return None
            
        reviewer_data = review_data.get('user')
        pr_author_data = pr_data.get('user')
        
        if not reviewer_data or not pr_author_data:
            logger.error("Missing reviewer or PR author data")
            return None
        
        # Store in database
        repo_id = db.get_or_create_repository(repo_data)
        reviewer_id = db.get_or_create_user(reviewer_data)
        pr_author_id = db.get_or_create_user(pr_author_data)
        
        if repo_id is None or reviewer_id is None or pr_author_id is None:
            logger.error("Failed to get or create repository, reviewer, or PR author")
            db.close()
            return None
            
        pr_id = db.get_or_create_pull_request(pr_data, repo_id, pr_author_id)
        
        if pr_id is None:
            logger.error("Failed to get or create pull request")
            db.close()
            return None
            
        review_id = db.add_pr_review(review_data, pr_id, reviewer_id)
        
        # Add review body as a comment if it exists
        if review_data.get('body'):
            # Create comment data from the review with a numeric ID
            review_github_id = review_data.get('id')
            # Use some math to create a unique numeric ID based on the review ID
            comment_github_id = int(review_github_id) + 10000000000
            
            comment_data = {
                'id': comment_github_id,
                'body': review_data.get('body'),
                'created_at': review_data.get('submitted_at'),
                'updated_at': review_data.get('submitted_at')
            }
            
            # Add the review comment, linking it to the review
            db.add_review_comment(comment_data, pr_id, reviewer_id, review_id)
        
        db.close()
        return review_id
    except Exception as e:
        logger.error(f"Error processing review: {str(e)}")
        return None

def process_review_comment(data):
    """
    Process pull request review comment and store in database
    """
    try:
        db = DatabaseHandler()
        
        # Check if database connection was successful
        if hasattr(db, 'connection_failed') and db.connection_failed:
            logger.error("Database connection failed, skipping comment processing")
            return None
            
        # Extract repository, user, PR, and comment info
        repo_data = data.get('repository')
        comment_data = data.get('comment')
        pr_data = data.get('pull_request')
        
        if not repo_data or not comment_data or not pr_data:
            logger.error("Missing repository, comment, or PR data")
            return None
            
        commenter_data = comment_data.get('user')
        pr_author_data = pr_data.get('user')
        
        if not commenter_data or not pr_author_data:
            logger.error("Missing commenter or PR author data")
            return None
        
        # Store in database
        repo_id = db.get_or_create_repository(repo_data)
        commenter_id = db.get_or_create_user(commenter_data)
        pr_author_id = db.get_or_create_user(pr_author_data)
        
        if repo_id is None or commenter_id is None or pr_author_id is None:
            logger.error("Failed to get or create repository, commenter, or PR author")
            db.close()
            return None
            
        pr_id = db.get_or_create_pull_request(pr_data, repo_id, pr_author_id)
        
        if pr_id is None:
            logger.error("Failed to get or create pull request")
            db.close()
            return None
        
        # Check if this comment is associated with a review
        review_id = None
        if comment_data.get('pull_request_review_id'):
            # In a real implementation, you might want to look up the review_id in your DB
            # For simplicity, we'll pass None for now
            pass
        
        comment_id = db.add_review_comment(comment_data, pr_id, commenter_id, review_id)
        
        db.close()
        return comment_id
    except Exception as e:
        logger.error(f"Error processing review comment: {str(e)}")
        return None
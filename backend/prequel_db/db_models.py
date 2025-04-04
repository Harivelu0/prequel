import logging
from datetime import datetime
from prequel_db.db_connection import DatabaseConnection

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class DatabaseModels(DatabaseConnection):
    """
    Handles database operations for GitHub entities (repositories, users, pull requests, reviews, comments)
    """
    
    def get_or_create_repository(self, repo_data):
        """Get or create a repository record"""
        # Check if we have a valid connection
        if not hasattr(self, 'conn') or not self.conn:
            logger.warning("Database operation skipped due to missing connection")
            return None
            
        try:
            # Handle the case when repo_data is None
            if repo_data is None:
                logger.error("Repository data is None")
                return None
                
            github_id = repo_data.get('id')
            if github_id is None:
                logger.error("Repository github_id is missing")
                return None
                
            # Check if repository exists
            self.cursor.execute(
                "SELECT id FROM repositories WHERE github_id = ?", 
                (github_id,)
            )
            result = self.cursor.fetchone()
            
            if result:
                return result[0]
            
            # Repository doesn't exist, create it
            name = str(repo_data.get('name', 'unknown'))
            full_name = str(repo_data.get('full_name', 'unknown/unknown'))
            
            # Log the data for debugging
            logger.debug(f"Creating repository: github_id={github_id}, name={name}, full_name={full_name}")
            
            # SQL Server approach to get the last inserted ID
            self.cursor.execute(
                """
                INSERT INTO repositories (github_id, name, full_name) 
                OUTPUT INSERTED.id
                VALUES (?, ?, ?)
                """, 
                (github_id, name, full_name)
            )
            
            # Get the ID directly from the OUTPUT clause
            new_id = self.cursor.fetchone()[0]
            self.conn.commit()
            
            return new_id
            
        except Exception as e:
            logger.error(f"Error in get_or_create_repository: {str(e)}")
            logger.error(f"Repository data that caused error: {repo_data}")
            if hasattr(self, 'conn') and self.conn:
                self.conn.rollback()
            return None
    
    def get_or_create_user(self, user_data):
        """Get or create a user record"""
        # Check if we have a valid connection
        if not hasattr(self, 'conn') or not self.conn:
            logger.warning("Database operation skipped due to missing connection")
            return None
            
        try:
            # Handle the case when user_data is None
            if user_data is None:
                logger.error("User data is None")
                return None
                
            github_id = user_data.get('id')
            if github_id is None:
                logger.error("User github_id is missing")
                return None
                
            # Check if user exists
            self.cursor.execute(
                "SELECT id FROM users WHERE github_id = ?", 
                (github_id,)
            )
            result = self.cursor.fetchone()
            
            if result:
                return result[0]
            
            # User doesn't exist, create it
            username = str(user_data.get('login', 'unknown'))
            avatar_url = str(user_data.get('avatar_url', ''))  # Use empty string as default
            
            # Log the data for debugging
            logger.debug(f"Creating user: github_id={github_id}, username={username}")
            
            # SQL Server approach to get the last inserted ID
            self.cursor.execute(
                """
                INSERT INTO users (github_id, username, avatar_url) 
                OUTPUT INSERTED.id
                VALUES (?, ?, ?)
                """, 
                (github_id, username, avatar_url)
            )
            
            # Get the ID directly from the OUTPUT clause
            new_id = self.cursor.fetchone()[0]
            self.conn.commit()
            
            return new_id
            
        except Exception as e:
            logger.error(f"Error in get_or_create_user: {str(e)}")
            logger.error(f"User data that caused error: {user_data}")
            if hasattr(self, 'conn') and self.conn:
                self.conn.rollback()
            return None
    
    def get_or_create_pull_request(self, pr_data, repository_id, author_id):
        """Get or create a pull request record"""
        # Check if we have a valid connection
        if not hasattr(self, 'conn') or not self.conn:
            logger.warning("Database operation skipped due to missing connection")
            return None
            
        try:
            # Handle the case when pr_data is None or IDs are None
            if pr_data is None:
                logger.error("PR data is None")
                return None
                
            if repository_id is None or author_id is None:
                logger.error(f"Missing required IDs: repo_id={repository_id}, author_id={author_id}")
                return None
                
            github_id = pr_data.get('id')
            if github_id is None:
                logger.error("PR github_id is missing")
                return None
                
            # Check if PR exists
            self.cursor.execute(
                "SELECT id FROM pull_requests WHERE github_id = ?", 
                (github_id,)
            )
            result = self.cursor.fetchone()
            
            # Convert timestamps to ISO format for SQLite
            created_at = pr_data.get('created_at', datetime.now().isoformat())
            updated_at = pr_data.get('updated_at', datetime.now().isoformat())
            closed_at = pr_data.get('closed_at')
            merged_at = pr_data.get('merged_at')
            
            # Extract other data with defaults
            title = str(pr_data.get('title', 'Untitled PR'))
            number = int(pr_data.get('number', 0))
            state = str(pr_data.get('state', 'open'))
            html_url = str(pr_data.get('html_url', ''))
            
            if result:
                # PR exists, update it
                pr_id = result[0]
                self.cursor.execute(
                    """UPDATE pull_requests 
                       SET title = ?, 
                           state = ?, 
                           updated_at = ?, 
                           closed_at = ?, 
                           merged_at = ?,
                           last_activity_at = ?
                       WHERE id = ?""", 
                    (title, state, updated_at, closed_at, merged_at, updated_at, pr_id)
                )
                self.conn.commit()
                return pr_id
            
            # PR doesn't exist, create it
            logger.debug(f"Creating PR: github_id={github_id}, title={title}, repo_id={repository_id}, author_id={author_id}")
            
            self.cursor.execute(
                """INSERT INTO pull_requests 
                   (github_id, repository_id, author_id, title, number, state, html_url, 
                    created_at, updated_at, closed_at, merged_at, last_activity_at) 
                   OUTPUT INSERTED.id
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""", 
                (github_id, repository_id, author_id, title, number, state, html_url, 
                 created_at, updated_at, closed_at, merged_at, updated_at)
            )
            
            # Get the ID directly from the OUTPUT clause
            new_id = self.cursor.fetchone()[0]
            self.conn.commit()
            
            return new_id
            
        except Exception as e:
            logger.error(f"Error in get_or_create_pull_request: {str(e)}")
            logger.error(f"PR data that caused error: {pr_data}")
            if hasattr(self, 'conn') and self.conn:
                self.conn.rollback()
            return None
    
    def add_pr_review(self, review_data, pull_request_id, reviewer_id):
        """Add a new PR review"""
        # Check if we have a valid connection
        if not hasattr(self, 'conn') or not self.conn:
            logger.warning("Database operation skipped due to missing connection")
            return None
            
        try:
            # Handle missing data
            if review_data is None or pull_request_id is None or reviewer_id is None:
                logger.error("Missing required data for PR review")
                return None
                
            github_id = review_data.get('id')
            if github_id is None:
                logger.error("Review github_id is missing")
                return None
                
            # Get state and submitted_at with defaults
            state = str(review_data.get('state', 'COMMENTED'))
            submitted_at = review_data.get('submitted_at', datetime.now().isoformat())
            
            # Check if review exists
            self.cursor.execute(
                "SELECT id FROM pr_reviews WHERE github_id = ?", 
                (github_id,)
            )
            result = self.cursor.fetchone()
            
            if result:
                # Review exists, update it
                review_id = result[0]
                self.cursor.execute(
                    "UPDATE pr_reviews SET state = ? WHERE id = ?", 
                    (state, review_id)
                )
                self.conn.commit()
                
                # Update last activity on PR
                self.cursor.execute(
                    "UPDATE pull_requests SET last_activity_at = ?, is_stale = 0 WHERE id = ?", 
                    (submitted_at, pull_request_id)
                )
                self.conn.commit()
                return review_id
            
            # Review doesn't exist, create it
            logger.debug(f"Creating review: github_id={github_id}, pr_id={pull_request_id}, reviewer_id={reviewer_id}")
            
            # SQL Server approach to get the last inserted ID
            self.cursor.execute(
                """INSERT INTO pr_reviews 
                   (github_id, pull_request_id, reviewer_id, state, submitted_at) 
                   OUTPUT INSERTED.id
                   VALUES (?, ?, ?, ?, ?)""", 
                (github_id, pull_request_id, reviewer_id, state, submitted_at)
            )
            
            # Get the ID directly from the OUTPUT clause
            review_id = self.cursor.fetchone()[0]
            self.conn.commit()
            
            # Update last activity on PR
            self.cursor.execute(
                "UPDATE pull_requests SET last_activity_at = ?, is_stale = 0 WHERE id = ?", 
                (submitted_at, pull_request_id)
            )
            self.conn.commit()
            
            return review_id
            
        except Exception as e:
            logger.error(f"Error in add_pr_review: {str(e)}")
            logger.error(f"Review data that caused error: {review_data}")
            if hasattr(self, 'conn') and self.conn:
                self.conn.rollback()
            return None    
    
    def add_review_comment(self, comment_data, pull_request_id, author_id, review_id=None):
        """Add a review comment"""
        # Check if we have a valid connection
        if not hasattr(self, 'conn') or not self.conn:
            logger.warning("Database operation skipped due to missing connection")
            return None
            
        try:
            # Handle missing data
            if comment_data is None or pull_request_id is None or author_id is None:
                logger.error("Missing required data for review comment")
                return None
                
            github_id = comment_data.get('id')
            if github_id is None:
                logger.error("Comment github_id is missing")
                return None
                
            # Get data with defaults
            body = str(comment_data.get('body', ''))
            created_at = comment_data.get('created_at', datetime.now().isoformat())
            updated_at = comment_data.get('updated_at', datetime.now().isoformat())
            
            # Check for commands in comment (simplified)
            contains_command = 0
            command_type = None
            
            # Simple command detection - check for common commands
            command_keywords = ['LGTM', 'APPROVE', 'REQUEST CHANGES', 'NEED REVIEW']
            for cmd in command_keywords:
                if cmd in body.upper():
                    contains_command = 1
                    command_type = cmd
                    break
            
            # Check if comment exists
            self.cursor.execute(
                "SELECT id FROM review_comments WHERE github_id = ?", 
                (github_id,)
            )
            result = self.cursor.fetchone()
            
            if result:
                # Comment exists, update it
                comment_id = result[0]
                self.cursor.execute(
                    """UPDATE review_comments 
                       SET body = ?, updated_at = ?, contains_command = ?, command_type = ? 
                       WHERE id = ?""", 
                    (body, updated_at, contains_command, command_type, comment_id)
                )
                self.conn.commit()
                
                # Update last activity on PR
                self.cursor.execute(
                    "UPDATE pull_requests SET last_activity_at = ?, is_stale = 0 WHERE id = ?", 
                    (updated_at, pull_request_id)
                )
                self.conn.commit()
                return comment_id
            
            # Comment doesn't exist, create it
            logger.debug(f"Creating comment: github_id={github_id}, pr_id={pull_request_id}, author_id={author_id}")
            
            # SQL Server approach to get the last inserted ID
            self.cursor.execute(
                """INSERT INTO review_comments 
                   (github_id, review_id, pull_request_id, author_id, body, created_at, updated_at, contains_command, command_type) 
                   OUTPUT INSERTED.id
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""", 
                (github_id, review_id, pull_request_id, author_id, body, created_at, updated_at, contains_command, command_type)
            )
            
            # Get the ID directly from the OUTPUT clause
            comment_id = self.cursor.fetchone()[0]
            self.conn.commit()
            
            # Update last activity on PR
            self.cursor.execute(
                "UPDATE pull_requests SET last_activity_at = ?, is_stale = 0 WHERE id = ?", 
                (updated_at, pull_request_id)
            )
            self.conn.commit()
            
            return comment_id
            
        except Exception as e:
            logger.error(f"Error in add_review_comment: {str(e)}")
            logger.error(f"Comment data that caused error: {comment_data}")
            if hasattr(self, 'conn') and self.conn:
                self.conn.rollback()
            return None
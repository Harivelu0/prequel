import logging
from datetime import datetime, timedelta
from prequel_db.db_connection import DatabaseConnection

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class DatabaseAnalytics(DatabaseConnection):
    """
    Handles analytics and reporting functions related to PR data
    """
    
    def check_for_stale_prs(self, days_threshold=7):
        """Mark PRs as stale if they haven't had activity in the specified number of days"""
        # Check if we have a valid connection
        if not hasattr(self, 'conn') or not self.conn:
            logger.warning("Database operation skipped due to missing connection")
            return []
            
        try:
            # Calculate the stale date threshold
            stale_date = datetime.now() - timedelta(days=days_threshold)
            
            # Find PRs that have become stale
            self.cursor.execute(
                """SELECT id 
                   FROM pull_requests 
                   WHERE state = 'open' 
                   AND is_stale = 0 
                   AND last_activity_at < ? 
                   AND (closed_at IS NULL AND merged_at IS NULL)""", 
                (stale_date,)
            )
            
            newly_stale_prs = self.cursor.fetchall()
            newly_stale_pr_ids = []
            
            # Mark PRs as stale
            for row in newly_stale_prs:
                pr_id = row[0]
                self.cursor.execute(
                    "UPDATE pull_requests SET is_stale = 1 WHERE id = ?", 
                    (pr_id,)
                )
                
                # Add to stale PR history
                self.cursor.execute(
                    "INSERT INTO stale_pr_history (pull_request_id) VALUES (?)", 
                    (pr_id,)
                )
                
                newly_stale_pr_ids.append(pr_id)
            
            self.conn.commit()
            return newly_stale_pr_ids
            
        except Exception as e:
            logger.error(f"Error in check_for_stale_prs: {str(e)}")
            if hasattr(self, 'conn') and self.conn:
                self.conn.rollback()
            return []
    
    def get_stale_prs(self):
        """Get all currently stale PRs"""
        # Check if we have a valid connection
        if not hasattr(self, 'conn') or not self.conn:
            logger.warning("Database operation skipped due to missing connection")
            return []
            
        try:
            self.cursor.execute(
                """SELECT pr.id, pr.title, pr.number, pr.html_url, repo.full_name, u.username,
                          pr.created_at, pr.last_activity_at
                   FROM pull_requests pr
                   JOIN repositories repo ON pr.repository_id = repo.id
                   JOIN users u ON pr.author_id = u.id
                   WHERE pr.is_stale = 1
                   AND pr.state = 'open'
                   ORDER BY pr.last_activity_at ASC"""
            )
            return self.cursor.fetchall()
            
        except Exception as e:
            logger.error(f"Error in get_stale_prs: {str(e)}")
            return []
    
    def get_pr_metrics(self):
        """Get metrics for the frontend dashboard"""
        # Check if we have a valid connection
        if not hasattr(self, 'conn') or not self.conn:
            logger.warning("Database operation skipped due to missing connection")
            return {
                'pr_authors': [],
                'active_reviewers': [],
                'command_users': [],
                'stale_pr_count': 0
            }
            
        try:
            # Get PR authors count
            self.cursor.execute(
                """SELECT u.username, COUNT(pr.id) as pr_count
                   FROM users u
                   JOIN pull_requests pr ON u.id = pr.author_id
                   GROUP BY u.username
                   ORDER BY pr_count DESC"""
            )
            pr_authors = self.cursor.fetchall()
            
            # Get active reviewers
            self.cursor.execute(
                """SELECT u.username, COUNT(rv.id) as review_count
                   FROM users u
                   JOIN pr_reviews rv ON u.id = rv.reviewer_id
                   GROUP BY u.username
                   ORDER BY review_count DESC"""
            )
            active_reviewers = self.cursor.fetchall()
            
            # Get command users
            self.cursor.execute(
                """SELECT u.username, COUNT(rc.id) as command_count
                   FROM users u
                   JOIN review_comments rc ON u.id = rc.author_id
                   WHERE rc.contains_command = 1
                   GROUP BY u.username
                   ORDER BY command_count DESC"""
            )
            command_users = self.cursor.fetchall()
            
            # Get stale PR count
            self.cursor.execute(
                """SELECT COUNT(id) FROM pull_requests WHERE is_stale = 1 AND state = 'open'"""
            )
            stale_pr_count = self.cursor.fetchone()[0]
            
            return {
                'pr_authors': pr_authors,
                'active_reviewers': active_reviewers,
                'command_users': command_users,
                'stale_pr_count': stale_pr_count
            }
        except Exception as e:
            logger.error(f"Error in get_pr_metrics: {str(e)}")
            return {
                'pr_authors': [],
                'active_reviewers': [],
                'command_users': [],
                'stale_pr_count': 0
            }
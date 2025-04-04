import logging
from prequel_db.db_models import DatabaseModels
from prequel_db.db_analytics import DatabaseAnalytics

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class DatabaseHandler(DatabaseModels, DatabaseAnalytics):
    """
    Main database handler that combines models and analytics functionality
    
    This class serves as the primary interface for database operations,
    inheriting both model operations (CRUD for repositories, users, PRs)
    and analytics functions (stale PR tracking, metrics reporting).
    """
    
    def __init__(self):
        """
        Initialize database connection by calling parent class initializer
        """
        super().__init__()
        logger.info("DatabaseHandler initialized")
    
    def check_connection(self):
        """
        Check if the database connection is active and working
        """
        if not hasattr(self, 'conn') or not self.conn:
            logger.error("No active database connection")
            return False
            
        try:
            # Try a simple query to check connection
            self.cursor.execute("SELECT 1")
            result = self.cursor.fetchone()
            return result is not None
        except Exception as e:
            logger.error(f"Error checking database connection: {str(e)}")
            return False
        
    # In prequel_db/db_handler.py or a new file like prequel_db/db_api.py

    def get_repositories_with_pr_counts(self):
        """Get repositories with PR counts for frontend"""
        # Check if we have a valid connection
        if not hasattr(self, 'conn') or not self.conn:
            logger.warning("Database operation skipped due to missing connection")
            return []
            
        try:
            self.cursor.execute(
                """SELECT 
                repo.id,
                repo.github_id,
                repo.name,
                repo.full_name,
                repo.created_at,
                COUNT(pr.id) as pr_count,
                SUM(CASE WHEN pr.is_stale = 1 THEN 1 ELSE 0 END) as stale_pr_count,
                (SELECT COUNT(DISTINCT author_id) FROM pull_requests WHERE repository_id = repo.id) as contributor_count,
                (SELECT MAX(last_activity_at) FROM pull_requests WHERE repository_id = repo.id) as last_activity
            FROM repositories repo
            LEFT JOIN pull_requests pr ON repo.id = pr.repository_id
            GROUP BY repo.id, repo.github_id, repo.name, repo.full_name, repo.created_at
            ORDER BY pr_count DESC"""
            )
            
            repositories = []
            for row in self.cursor.fetchall():
                repo_id, github_id, name, full_name, created_at, pr_count, stale_pr_count, contributor_count, last_activity = row
                
                # Get review count for this repository
                self.cursor.execute(
                    """SELECT COUNT(rv.id)
                    FROM pr_reviews rv
                    JOIN pull_requests pr ON rv.pull_request_id = pr.id
                    WHERE pr.repository_id = ?""",
                    (repo_id,)
                )
                review_count = self.cursor.fetchone()[0] or 0
                
                repositories.append({
                    'id': repo_id,
                    'github_id': github_id,
                    'name': name,
                    'full_name': full_name,
                    'created_at': created_at.isoformat() if created_at else None,
                    'pr_count': pr_count or 0,
                    'review_count': review_count,
                    'stale_pr_count': stale_pr_count or 0,
                    'contributor_count': contributor_count or 0,
                    'last_activity': last_activity.isoformat() if last_activity else None
                })
            
            return repositories
            
        except Exception as e:
            logger.error(f"Error in get_repositories_with_pr_counts: {str(e)}")
            return []    

    def get_contributors_with_counts(self):
        """Get contributors with PR and review counts"""
        # Check if we have a valid connection
        if not hasattr(self, 'conn') or not self.conn:
            logger.warning("Database operation skipped due to missing connection")
            return []
            
        try:
            self.cursor.execute(
                """SELECT 
                u.id,
                u.github_id,
                u.username,
                u.avatar_url,
                u.created_at,
                COUNT(DISTINCT pr.id) as pr_count,
                (SELECT COUNT(DISTINCT rv.id) FROM pr_reviews rv WHERE rv.reviewer_id = u.id) as review_count,
                (SELECT COUNT(DISTINCT rc.id) FROM review_comments rc WHERE rc.author_id = u.id AND rc.contains_command = 1) as command_count
            FROM users u
            LEFT JOIN pull_requests pr ON u.id = pr.author_id
            GROUP BY u.id, u.github_id, u.username, u.avatar_url, u.created_at
            ORDER BY pr_count DESC"""
            )
            
            contributors = []
            for row in self.cursor.fetchall():
                user_id, github_id, username, avatar_url, created_at, pr_count, review_count, command_count = row
                
                # Get repositories this user contributed to
                self.cursor.execute(
                    """SELECT DISTINCT repo.name
                    FROM repositories repo
                    JOIN pull_requests pr ON repo.id = pr.repository_id
                    WHERE pr.author_id = ?""",
                    (user_id,)
                )
                repositories = [repo[0] for repo in self.cursor.fetchall()]
                
                contributors.append({
                    'id': user_id,
                    'github_id': github_id,
                    'username': username,
                    'avatar_url': avatar_url,
                    'created_at': created_at.isoformat() if created_at else None,
                    'pr_count': pr_count or 0,
                    'review_count': review_count or 0,
                    'command_count': command_count or 0,
                    'repositories': repositories
                })
            
            return contributors
            
        except Exception as e:
            logger.error(f"Error in get_contributors_with_counts: {str(e)}")
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
            pr_authors_rows = self.cursor.fetchall()
            pr_authors = [[row[0], row[1]] for row in pr_authors_rows]
            
            # Get active reviewers
            self.cursor.execute(
                """SELECT u.username, COUNT(rv.id) as review_count
                   FROM users u
                   JOIN pr_reviews rv ON u.id = rv.reviewer_id
                   GROUP BY u.username
                   ORDER BY review_count DESC"""
            )
            active_reviewers_rows = self.cursor.fetchall()
            active_reviewers = [[row[0], row[1]] for row in active_reviewers_rows]
            
            self.cursor.execute(
                """SELECT u.username, COUNT(rc.id) as comment_count
                   FROM users u
                   JOIN review_comments rc ON u.id = rc.author_id
                   GROUP BY u.username
                   ORDER BY comment_count DESC"""
            )       
                
            comment_users_rows = self.cursor.fetchall()
            comment_users = [[row[0], row[1]] for row in comment_users_rows]
            
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
            
            
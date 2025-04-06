from flask import jsonify
import logging
from datetime import datetime

from prequel_db.db_handler import DatabaseHandler

# Set up logging
logger = logging.getLogger(__name__)

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

def get_pr_metrics():
    """Get PR metrics"""
    try:
        db = DatabaseHandler()
        metrics = db.get_pr_metrics()
        db.close()
        return jsonify(metrics), 200
    except Exception as e:
        logger.error(f"Error retrieving PR metrics: {str(e)}")
        return jsonify({"error": f"Failed to retrieve PR metrics: {str(e)}"}), 500

def get_stale_prs():
    """Get stale PRs"""
    try:
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
        
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error retrieving stale PRs: {str(e)}")
        return jsonify({"error": f"Failed to retrieve stale PRs: {str(e)}"}), 500

def get_contributors():
    """Get contributors with counts"""
    try:
        db = DatabaseHandler()
        contributors = db.get_contributors_with_counts()
        db.close()
        return jsonify(contributors), 200
    except Exception as e:
        logger.error(f"Error retrieving contributors: {str(e)}")
        return jsonify({"error": f"Failed to retrieve contributors: {str(e)}"}), 500

def setup_stats_routes(app):
    """Set up stats routes for the Flask app"""
    @app.route('/api/stats', methods=['GET'])
    def stats_dashboard_route():
        return get_dashboard_stats()
    
    @app.route('/api/metrics', methods=['GET'])
    def stats_metrics_route():
        return get_pr_metrics()
    
    @app.route('/api/stale-prs', methods=['GET'])
    def stats_stale_prs_route():
        return get_stale_prs()
    
    @app.route('/api/contributors', methods=['GET'])
    def stats_contributors_route():
        return get_contributors()
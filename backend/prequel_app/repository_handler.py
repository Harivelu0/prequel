from flask import request, jsonify
import logging
import os
import json

from prequel_db.db_handler import DatabaseHandler
from prequel_app.pulumi_executor import PulumiExecutor

# Set up logging
logger = logging.getLogger(__name__)

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

def get_repositories():
    """Get a list of repositories with PR counts"""
    try:
        db = DatabaseHandler()
        repositories = db.get_repositories_with_pr_counts()
        db.close()
        
        return jsonify(repositories), 200
    except Exception as e:
        logger.error(f"Error retrieving repositories: {str(e)}")
        return jsonify({"error": f"Failed to retrieve repositories: {str(e)}"}), 500

def setup_repository_routes(app):
    """Set up repository routes for the Flask app"""
    @app.route('/api/repositories', methods=['POST'])
    def repo_create_route():
        return create_repository()
    
    @app.route('/api/repositories', methods=['GET'])
    def repo_list_route():
        return get_repositories()
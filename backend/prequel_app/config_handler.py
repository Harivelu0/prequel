from flask import request, jsonify
import logging
import threading
import time
import os
import json
from datetime import datetime
import sys

from prequel_app.pulumi_executor import PulumiExecutor

# Set up logging
logger = logging.getLogger(__name__)

# Global deployment status
deployment_status = {
    "status": "idle",  # idle, deploying, complete, failed
    "started_at": None,
    "completed_at": None,
    "error": None
}

def deploy_infrastructure_async(infrastructure_dir):
    """Function to deploy infrastructure in a background thread"""
    global deployment_status
    
    try:
        # Wait a bit to ensure config is properly set
        time.sleep(2)
        
        pulumi_executor = PulumiExecutor(infrastructure_dir)
        success = pulumi_executor.deploy_infrastructure()
        
        if success:
            logger.info("Background infrastructure deployment completed successfully")
            deployment_status["status"] = "complete"
            deployment_status["completed_at"] = datetime.now().isoformat()
        else:
            logger.error("Background infrastructure deployment failed")
            deployment_status["status"] = "failed"
            deployment_status["completed_at"] = datetime.now().isoformat()
            deployment_status["error"] = "Deployment failed. Check logs for details."
    except Exception as e:
        logger.error(f"Error in background deployment: {str(e)}")
        deployment_status["status"] = "failed"
        deployment_status["completed_at"] = datetime.now().isoformat()
        deployment_status["error"] = str(e)

def get_deployment_status():
    """Get the current infrastructure deployment status"""
    global deployment_status
    return jsonify(deployment_status), 200

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
        
        # Store config securely
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
        
        # Update the .env file
        env_file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../.env'))
        
        try:
            # Read current .env content
            env_content = {}
            if os.path.exists(env_file_path):
                with open(env_file_path, 'r') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#') and '=' in line:
                            key, value = line.split('=', 1)
                            env_content[key.strip()] = value.strip()
            
            # Update with new values
            env_content['GITHUB_TOKEN'] = github_token
            env_content['GITHUB_WEBHOOK_SECRET'] = env_content.get('GITHUB_WEBHOOK_SECRET', '')
            env_content['ORGANIZATION_NAME'] = organization_name
            if slack_webhook_url:
                env_content['SLACK_WEBHOOK_URL'] = slack_webhook_url
            
            # Keep existing database config
            for key in ['SQL_SERVER', 'SQL_DATABASE', 'SQL_USERNAME', 'SQL_PASSWORD', 'DATABASE_CONNECTION_STRING']:
                if key in env_content:
                    continue  # Keep existing DB config
            
            # Write updated .env file
            with open(env_file_path, 'w') as f:
                for key, value in env_content.items():
                    f.write(f"{key}={value}\n")
            
            logger.info(f"Updated .env file at {env_file_path}")
        except Exception as e:
            logger.error(f"Failed to update .env file: {str(e)}")
            # Continue with process even if .env update fails
        
        # Initialize Pulumi executor for config updates
        infrastructure_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../infrastructure'))
        pulumi_executor = PulumiExecutor(infrastructure_dir)
        
        # Update Pulumi config
        logger.info(f"Running Pulumi setup for organization: {organization_name}")
        success = pulumi_executor.setup_config(
            github_token=github_token,
            organization_name=organization_name,
            slack_webhook_url=slack_webhook_url
        )
        
        if not success:
            logger.error("Failed to set up Pulumi configuration")
            return jsonify({"error": "Failed to set up Pulumi configuration"}), 500
        
        # Restart the service to apply new environment variables
        restart_needed = True
        restart_success = False
        
        try:
            # Use sudo to restart the service (requires sudoers configuration)
            restart_cmd = "sudo systemctl restart prequel-backend"
            result = os.system(restart_cmd)
            
            if result == 0:
                logger.info("Successfully restarted service to apply new credentials")
                restart_success = True
            else:
                logger.warning(f"Service restart command returned code {result}")
        except Exception as e:
            logger.error(f"Error restarting service: {str(e)}")
        
        # Only deploy infrastructure if requested
        deploy_infra = data.get('deployInfrastructure', False)
        if deploy_infra:
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
                "status": "deploying",
                "restart_needed": restart_needed,
                "restart_success": restart_success
            }), 200
        else:
            return jsonify({
                "message": "Configuration updated successfully.",
                "restart_needed": restart_needed,
                "restart_success": restart_success
            }), 200
            
    except Exception as e:
        logger.error(f"Configuration error: {str(e)}")
        return jsonify({"error": f"Failed to save configuration: {str(e)}"}), 500

def setup_config_routes(app):
    """Set up configuration routes for the Flask app"""
    
    @app.route('/api/config/status', methods=['GET'])
    def config_status_route():
        return get_deployment_status()
    
    @app.route('/api/config', methods=['POST'])
    def config_save_route():
        return save_configuration()
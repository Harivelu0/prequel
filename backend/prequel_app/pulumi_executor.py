# prequel_app/pulumi_executor.py

import subprocess
import logging
import os
import json
from typing import Dict, List, Optional, Tuple, Union

logger = logging.getLogger(__name__)

class PulumiExecutor:
    """Handles execution of Pulumi commands from Python"""
    
    def __init__(self, infrastructure_dir: str):
        """
        Initialize with the path to the infrastructure directory
        
        Args:
            infrastructure_dir: Path to the directory containing Pulumi code
        """
        self.infrastructure_dir = infrastructure_dir
    
    def run_command(self, command: List[str], env: Optional[Dict[str, str]] = None) -> Tuple[bool, str, str]:
        """
        Run a Pulumi command and return results
        
        Args:
            command: List of command arguments to execute
            env: Optional environment variables to set
        
        Returns:
            Tuple of (success, stdout, stderr)
        """
        try:
            # Prepare environment
            process_env = os.environ.copy()
            if env:
                process_env.update(env)
            
            # Log the command (hiding sensitive values)
            safe_command = self._sanitize_command(command)
            logger.info(f"Executing Pulumi command: {' '.join(safe_command)}")
            
            # Run the command
            result = subprocess.run(
                command,
                cwd=self.infrastructure_dir,
                env=process_env,
                capture_output=True,
                text=True
            )
            
            # Check result
            if result.returncode == 0:
                logger.info(f"Pulumi command succeeded: {' '.join(safe_command)}")
                return True, result.stdout, result.stderr
            else:
                logger.error(f"Pulumi command failed: {' '.join(safe_command)}")
                logger.error(f"Error: {result.stderr}")
                return False, result.stdout, result.stderr
                
        except Exception as e:
            logger.error(f"Error executing Pulumi command: {str(e)}")
            return False, "", str(e)
    
    def setup_config(self, github_token: str, organization_name: str, slack_webhook_url: Optional[str] = None) -> bool:
        """
        Set up Pulumi configuration with GitHub and Slack details
        
        Args:
            github_token: GitHub API token
            organization_name: GitHub organization name
            slack_webhook_url: Optional Slack webhook URL
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # Run the setup-config script
            script_path = os.path.join(self.infrastructure_dir, "scripts", "setup-config.sh")
            
            command = [
                "bash", script_path,
                github_token,
                slack_webhook_url or "",
                organization_name
            ]
            
            success, stdout, stderr = self.run_command(command)
            return success
        except Exception as e:
            logger.error(f"Error setting up Pulumi config: {str(e)}")
            return False
    
    def create_repository(self, name: str, org: str, description: str = "", visibility: str = "private", branch: str = "main") -> Tuple[bool, Dict]:
        """
        Create a new GitHub repository with branch protection
        
        Args:
            name: Repository name
            org: Organization name
            description: Repository description
            visibility: Repository visibility (public/private)
            branch: Default branch name
        
        Returns:
            Tuple of (success, details)
        """
        try:
            # Construct the command to run the script
            command = [
                "npx", "ts-node", 
                os.path.join("src", "index.ts"), 
                "setup-repo",
                "--name", name,
                "--org", org,
                "--description", description,
                "--visibility", visibility,
                "--branch", branch
            ]
            
            success, stdout, stderr = self.run_command(command)
            
            if success:
                # Try to parse output for repository details
                details = {
                    "name": name,
                    "organization": org,
                    "url": f"https://github.com/{org}/{name}"
                }
                return True, details
            else:
                return False, {"error": stderr}
        except Exception as e:
            logger.error(f"Error creating repository: {str(e)}")
            return False, {"error": str(e)}
    
    def _sanitize_command(self, command: List[str]) -> List[str]:
        """
        Sanitize command for logging by hiding sensitive information
        
        Args:
            command: Command list to sanitize
            
        Returns:
            Sanitized command list
        """
        # Create a copy of the command
        sanitized = command.copy()
        
        # Check for sensitive parameters and replace their values
        sensitive_args = ["--token", "githubToken", "--secret", "githubWebhookSecret", "--slackWebhookUrl"]
        
        for i, arg in enumerate(sanitized):
            # Skip the last item to avoid index errors
            if i == len(sanitized) - 1:
                continue
                
            # If this argument is followed by a sensitive value, replace the value
            if arg in sensitive_args or any(arg.startswith(f"--{s}=") for s in sensitive_args):
                sanitized[i+1] = "****"
        
        return sanitized
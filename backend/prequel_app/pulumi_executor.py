import subprocess
import logging
import os
import json
from typing import Dict, List, Optional, Tuple, Union
import traceback

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
        logger.info(f"PulumiExecutor initialized with infrastructure directory: {infrastructure_dir}")
        
        # Verify the directory exists
        if not os.path.exists(infrastructure_dir):
            logger.error(f"Infrastructure directory does not exist: {infrastructure_dir}")
        elif not os.path.isdir(infrastructure_dir):
            logger.error(f"Path is not a directory: {infrastructure_dir}")
        else:
            logger.info(f"Infrastructure directory verified: {infrastructure_dir}")
            # List directory contents for debugging
            contents = os.listdir(infrastructure_dir)
            logger.debug(f"Directory contents: {contents}")
    
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
                logger.debug(f"Added {len(env)} environment variables")
            
            # Log the command (hiding sensitive values)
            safe_command = self._sanitize_command(command)
            logger.info(f"Executing Pulumi command: {' '.join(safe_command)}")
            logger.debug(f"Working directory: {self.infrastructure_dir}")
            
            # Verify the directory exists before running command
            if not os.path.exists(self.infrastructure_dir):
                raise FileNotFoundError(f"Infrastructure directory not found: {self.infrastructure_dir}")
            
            # Run the command
            result = subprocess.run(
                command,
                cwd=self.infrastructure_dir,
                env=process_env,
                capture_output=True,
                text=True
            )
            
            # Log the full output for debugging
            logger.debug(f"Command stdout: {result.stdout}")
            logger.debug(f"Command stderr: {result.stderr}")
            
            # Check result
            if result.returncode == 0:
                logger.info(f"Pulumi command succeeded: {' '.join(safe_command)}")
                return True, result.stdout, result.stderr
            else:
                logger.error(f"Pulumi command failed: {' '.join(safe_command)}")
                logger.error(f"Return code: {result.returncode}")
                logger.error(f"Error output: {result.stderr}")
                
                # Check for common errors
                if "not logged in" in result.stderr:
                    logger.error("Pulumi is not logged in. Run 'pulumi login' first.")
                elif "AZURE" in result.stderr and "not found" in result.stderr:
                    logger.error("Azure credentials missing or incorrect.")
                elif "GITHUB" in result.stderr:
                    logger.error("GitHub token missing or incorrect.")
                elif "error: failed to load plugin" in result.stderr:
                    logger.error("Pulumi plugin installation issue. Check if plugins are installed.")
                
                return False, result.stdout, result.stderr
                
        except FileNotFoundError as e:
            logger.error(f"Command not found or directory not found: {str(e)}")
            logger.error(f"Make sure Pulumi CLI is installed and the infrastructure directory exists")
            return False, "", str(e)
        except PermissionError as e:
            logger.error(f"Permission error executing command: {str(e)}")
            return False, "", str(e)
        except Exception as e:
            logger.error(f"Error executing Pulumi command: {str(e)}")
            logger.error(f"Detailed error: {traceback.format_exc()}")
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
            # First, check if it have a stack selected and create/select one if needed
            stack_name = "dev-prequel"  #  default stack name
            
            # Check for existing stacks
            logger.info(f"Checking for Pulumi stack: {stack_name}")
            check_stack_cmd = ["pulumi", "stack", "ls"]
            success, stdout, stderr = self.run_command(check_stack_cmd)
            
            if not success:
                logger.error(f"Failed to list Pulumi stacks: {stderr}")
                return False
                
            # Check if our stack exists in the output
            if f"{stack_name}" in stdout:
                # Stack exists, select it
                logger.info(f"Selecting existing stack: {stack_name}")
                select_cmd = ["pulumi", "stack", "select", stack_name]
                success, stdout, stderr = self.run_command(select_cmd)
                if not success:
                    logger.error(f"Failed to select stack: {stderr}")
                    return False
            else:
                # Stack doesn't exist, create it
                logger.info(f"Creating new stack: {stack_name}")
                init_cmd = ["pulumi", "stack", "init", stack_name]
                success, stdout, stderr = self.run_command(init_cmd)
                if not success:
                    logger.error(f"Failed to create stack: {stderr}")
                    return False
            
            # Now that we have a stack selected, run the setup script
            script_path = os.path.join(self.infrastructure_dir, "scripts", "setup_config.sh")
            
            # Verify the script exists
            if not os.path.exists(script_path):
                logger.error(f"Setup script not found: {script_path}")
                # Check for similar files
                script_dir = os.path.join(self.infrastructure_dir, "scripts")
                if os.path.exists(script_dir):
                    files = os.listdir(script_dir)
                    logger.error(f"Available scripts: {files}")
                return False
            
            logger.info(f"Using setup script: {script_path}")
            
            command = [
                "bash", script_path,
                github_token,
                slack_webhook_url or "",
                organization_name
            ]
            
            success, stdout, stderr = self.run_command(command)
            
            if not success:
                logger.error(f"Setup config failed. Output: {stdout}")
                logger.error(f"Error: {stderr}")
            
            return success
        except Exception as e:
            logger.error(f"Error setting up Pulumi config: {str(e)}")
            logger.error(f"Detailed error: {traceback.format_exc()}")
            return False
    
    def create_repository(self, name: str, org: str, description: str = "", visibility: str = "private", branch: str = "main") -> Tuple[bool, Dict]:
        """
        Create a new GitHub repository directly via GitHub API, without Pulumi stack updates
        
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
            logger.info(f"Creating repository: {org}/{name} (Visibility: {visibility}, Branch: {branch})")
            
            # Use the direct repository creation command
            command = [
                "npx", "ts-node", 
                os.path.join("src", "index.ts"), 
                "create-repo-only",  # This is the key change
                "--name", name,
                "--org", org,
                "--description", description,
                "--visibility", visibility,
                "--branch", branch
            ]
            
            success, stdout, stderr = self.run_command(command)
            
            if success:
                logger.info(f"Repository {org}/{name} created successfully")
                
                # Try to parse the JSON output from the command
                try:
                    repo_details = json.loads(stdout)
                    details = {
                        "name": repo_details.get("name", name),
                        "organization": org,
                        "url": repo_details.get("html_url", f"https://github.com/{org}/{name}")
                    }
                except:
                    # Fallback if JSON parsing fails
                    details = {
                        "name": name,
                        "organization": org,
                        "url": f"https://github.com/{org}/{name}"
                    }
                    
                return True, details
                
            # Check if there was a warning about branch protection but repo was created 
            elif stderr and ("branch protection requires github pro" in stderr.lower()):
                logger.warning(f"Repository created but branch protection failed (requires GitHub Pro)")
                details = {
                    "name": name,
                    "organization": org,
                    "url": f"https://github.com/{org}/{name}",
                    "warning": "Branch protection requires GitHub Pro or public repositories"
                }
                return True, details
            else:
                logger.error(f"Failed to create repository {org}/{name}")
                logger.error(f"Error: {stderr}")
                return False, {"error": stderr}
        except Exception as e:
            logger.error(f"Error creating repository: {str(e)}")
            logger.error(f"Detailed error: {traceback.format_exc()}")
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
            
            # Check for direct script paths where tokens might be passed as positional args
            if "setup_config.sh" in arg and i < len(sanitized) - 1:
                # The next 2 arguments are likely token and webhook URL
                if i + 1 < len(sanitized):
                    sanitized[i+1] = "****"  # GitHub token
                if i + 2 < len(sanitized):
                    sanitized[i+2] = "****"  # Slack webhook URL
        
        return sanitized
    
    def deploy_infrastructure(self, stack_name: str = "dev-prequel") -> bool:
        """
        Deploy the infrastructure using Pulumi
        
        Args:
            stack_name: Name of the stack to use (default: "dev-prequel ")
        
        Returns:
            True if successful, False otherwise
        """
        try:
            
            logger.info("Starting Pulumi infrastructure deployment...")
            
            # First, check if Pulumi is installed and working
            version_cmd = ["pulumi", "version"]
            version_success, version_stdout, version_stderr = self.run_command(version_cmd)
            
            if not version_success:
                logger.error("Pulumi CLI not found or not working properly")
                logger.error(f"Error: {version_stderr}")
                return False
                
            logger.info(f"Using Pulumi version: {version_stdout.strip()}")
            
            # Check if we're logged in
            whoami_cmd = ["pulumi", "whoami"]
            whoami_success, whoami_stdout, whoami_stderr = self.run_command(whoami_cmd)
            
            if not whoami_success:
                logger.warning("Not logged into Pulumi or using local backend")
                if "not logged in" in whoami_stderr:
                    logger.info("Attempting to use local backend")
                    login_cmd = ["pulumi", "login", "--local"]
                    login_success, login_stdout, login_stderr = self.run_command(login_cmd)
                    if not login_success:
                        logger.error("Failed to set up local Pulumi backend")
                        logger.error(f"Error: {login_stderr}")
                        return False
                    logger.info("Successfully configured local Pulumi backend")
            else:
                logger.info(f"Logged in as: {whoami_stdout.strip()}")
            
            # First, check if stack exists and select it or create new one
            logger.info(f"Checking for Pulumi stack: {stack_name}")
            check_stack_cmd = ["pulumi", "stack", "ls"]
            success, stdout, stderr = self.run_command(check_stack_cmd)
            
            if not success:
                logger.error(f"Failed to list Pulumi stacks: {stderr}")
                return False
                
            # Log the available stacks
            logger.debug(f"Available stacks: {stdout}")
                
            # Check if our stack exists in the output
            if f"{stack_name}" in stdout:
                # Stack exists, select it
                logger.info(f"Selecting existing stack: {stack_name}")
                select_cmd = ["pulumi", "stack", "select", stack_name]
                success, stdout, stderr = self.run_command(select_cmd)
                if not success:
                    logger.error(f"Failed to select stack: {stderr}")
                    return False
            else:
                # Stack doesn't exist, create it
                logger.info(f"Creating new stack: {stack_name}")
                init_cmd = ["pulumi", "stack", "init", stack_name]
                success, stdout, stderr = self.run_command(init_cmd)
                if not success:
                    logger.error(f"Failed to create stack: {stderr}")
                    return False
            
            # Check if npm dependencies are installed
            if not os.path.exists(os.path.join(self.infrastructure_dir, "node_modules")):
                logger.info("Installing npm dependencies...")
                npm_cmd = ["npm", "install"]
                npm_success, npm_stdout, npm_stderr = self.run_command(npm_cmd)
                if not npm_success:
                    logger.error(f"Failed to install npm dependencies: {npm_stderr}")
                    return False
                logger.info("npm dependencies installed successfully")
            
            # Now run the deployment with preview first
            logger.info("Running Pulumi preview to check for errors...")
            preview_cmd = ["pulumi", "preview"]
            preview_success, preview_stdout, preview_stderr = self.run_command(preview_cmd)
            
            if not preview_success:
                logger.error(f"Pulumi preview failed: {preview_stderr}")
                logger.error("Deployment cancelled due to preview failure")
                return False
                
            logger.info("Preview successful, proceeding with deployment")
                
            # Now run the actual deployment
            logger.info("Deploying infrastructure with Pulumi...")
            command = ["pulumi", "up", "--yes"]
            
            success, stdout, stderr = self.run_command(command)
            if success:
                logger.info("Infrastructure deployment successful")
                logger.info(f"Deployment output: {stdout}")
                return True
            else:
                logger.error(f"Infrastructure deployment failed: {stderr}")
                return False
        except Exception as e:
            logger.error(f"Error deploying infrastructure: {str(e)}")
            logger.error(f"Detailed error: {traceback.format_exc()}")
            return False
# Update package index
sudo apt update

# Install required packages
sudo apt install -y curl dirmngr apt-transport-https lsb-release ca-certificates

# Add NodeSource repository for Node.js 18

# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

# Source nvm in your current shell
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js 18
nvm install 18

# Use Node.js 18
nvm use 18

# Verify
node -v
npm -v

# Download and install Pulumi
curl -fsSL https://get.pulumi.com | sh

# Add Pulumi to your PATH (or restart your terminal)
export PATH=$PATH:$HOME/.pulumi/bin

# Verify installation
pulumi version

# pulumi initialization
pulumi login

pulumi whoami 

# check if my token have permission with organization
curl -H "Authorization: token <GITHUB_TOKEN>" https://api.github.com/user

# register your secret in pulumi
pulumi config set github:token your_token_here --secret

pulumi stack init dev

pulumi up

ts-node src/index.ts setup-repo --name pulumi-repo --org Shetchuko --description "Repository description" --visibility public --branch main


# Branch protection rules
PRs must be reviewed before merging
Fresh approvals are needed after changes
No one can by pass the protection rules (even admins)
Code quality standards are maintained through required reviews



Phase 1 Summary: Repository Configuration Automation
What We Implemented
In Phase 1 of the PReQual (PR Quality Management System) project, we successfully implemented:

Automated Repository Configuration

Created a Pulumi-based tool to standardize GitHub repository settings
Implemented consistent configuration across repositories


Branch Protection Rules

Set up rules requiring code reviews before merging
Prevented self-approvals on PRs
Enforced up-to-date branches before merging


Webhook Configuration

Automated setup of webhooks to connect repositories to our notification service
Configured event triggers for PR events


Pulumi GitHub Provider Integration

Properly handled organization repositories with custom providers
Set up repository-level settings


Pulumi Automation API Implementation

Created a programmatic deployment system for repository configurations
Built a CLI tool for easy management



Key Technical Components

Repository Configuration Templates: Standardized settings for different repository types
Branch Protection Module: Enforces code review requirements
Webhook Setup: Connects repositories to our existing notification service
Deployment Script: Uses Pulumi Automation API to apply configurations

Command-line Usage
The tool can be used with commands like:
Copyts-node src/index.ts setup-repo --name repo-name --org organization-name --description "Repository description" --visibility public --branch main
Successful Deployment Output
We confirmed successful operation with output showing:
CopyDeployment complete for pulumi-repo
Repository setup complete!
Outputs: {
  "defaultBranch": { "value": "main", "secret": false },
  "repositoryName": { "value": "pulumi-repo", "secret": false },
  "repositoryUrl": { "value": "https://github.com/Shetchuko/pulumi-repo", "secret": false },
  "webhookUrl": { "value": "http://20.40.56.196", "secret": false }
}
Next Steps
In Phase 2, we will:

Enhance webhook processing to track PR metrics
Implement stale PR detection
Create analytics for team contributions
Expand our Slack notification capabilities
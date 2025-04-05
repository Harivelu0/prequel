#!/bin/bash

# Set up Pulumi configuration for PReQual Phase 2

echo "Setting up Pulumi configuration for PReQual Phase 2..."

# Generate a webhook secret
WEBHOOK_SECRET=$(openssl rand -hex 20)
echo "Generated GitHub webhook secret: $WEBHOOK_SECRET"

# Generate SQL admin password
SQL_PASSWORD=$(openssl rand -base64 16)
echo "Generated SQL admin password: $SQL_PASSWORD"

VMADMIN=$(openssl rand -base64 16)
echo "Generated vm admin password: $VMADMIN"
# Set Azure credentials
echo "Setting Azure credentials..."

# Set PR monitoring configuration
echo "Setting PR monitoring configuration..."
echo "enter your github token"
pulumi config set githubToken $GITHUB_TOKEN --secret
echo "webhook secret aito assigned by script"
pulumi config set githubWebhookSecret $WEBHOOK_SECRET --secret
echo "enter your slackurl"
pulumi config set slackWebhookUrl $SLACK_WEBHOOK_URL --secret
pulumi config set vmAdminUsername vmadmin
pulumi config set vmAdminPassword $VMADMIN --secret
pulumi config set sqlAdminUsername prequel_admin
pulumi config set sqlAdminPassword $SQL_PASSWORD --secret
pulumi config set location "Central India"
pulumi config set organizationName "Shetchuko"

echo "Configuration complete! You can verify with 'pulumi config'"
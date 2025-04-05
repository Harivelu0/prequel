#!/bin/bash
# Set up Pulumi configuration for PReQual Phase 2

GITHUB_TOKEN=$1 
SLACK_WEBHOOK_URL=$2 
ORGANIZATION_NAME=$3

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


# Set PR monitoring configuration
echo "Setting PR monitoring configuration..."
echo "Setting GitHub token from parameter"
pulumi config set prequel:githubToken "$GITHUB_TOKEN" --secret
echo "Setting webhook secret auto assigned by script"
pulumi config set prequel:githubWebhookSecret "$WEBHOOK_SECRET" --secret
echo "Setting Slack webhook URL from parameter"
pulumi config set prequel:slackWebhookUrl "$SLACK_WEBHOOK_URL" --secret
pulumi config set prequel:vmAdminUsername vmadmin
pulumi config set prequel:vmAdminPassword "$VMADMIN" --secret
pulumi config set prequel:sqlAdminUsername prequel_admin
pulumi config set prequel:sqlAdminPassword "$SQL_PASSWORD" --secret
pulumi config set prequel:location "Central India"
pulumi config set prequel:organizationName "$ORGANIZATION_NAME"

echo "Configuration complete! You can verify with 'pulumi config'"
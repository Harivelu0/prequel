#!/bin/bash

# Set variables
FUNCTION_APP_NAME="prequel-functionee90307a"
RESOURCE_GROUP_NAME="prequel-rg9a95ed63"
FUNCTION_ZIP_PATH="function.zip"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Clean up previous deployment files
rm -rf deploy
rm -f function.zip
mkdir -p deploy/webhook

# Copy webhook handler files - this matches your structure
cp -r dist/functions/webhook-handler/* deploy/webhook/

# Copy utility files needed by the webhook
cp dist/utils/* deploy/webhook/
cp dist/types/* deploy/webhook/

# Copy any other dependencies needed
mkdir -p deploy/webhook/analytics
cp -r dist/functions/analytics/* deploy/webhook/analytics/

# Create function.json for webhook
cat > deploy/webhook/function.json << EOL
{
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["post"]
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
EOL

# Create host.json file
cat > deploy/host.json << EOL
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "excludedTypes": "Request"
      }
    },
    "logLevel": {
      "default": "Information",
      "Function": "Verbose"
    }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  }
}
EOL

# Create package.json at root level with dependencies
cat > deploy/package.json << EOL
{
  "name": "prequel-webhook-handler",
  "version": "1.0.0",
  "dependencies": {
    "@azure/functions": "^4.0.0",
    "mssql": "^9.1.1"
  }
}
EOL

# Create the zip file from the deploy directory
cd deploy
zip -r ../function.zip *
cd ..

# Get SQL connection string from Pulumi
SQL_CONN_STRING=$(pulumi stack output sqlConnectionString)

# Deploy the zip package
echo "Deploying function package..."
az functionapp deployment source config-zip \
  --resource-group "$RESOURCE_GROUP_NAME" \
  --name "$FUNCTION_APP_NAME" \
  --src "$FUNCTION_ZIP_PATH" \
  --verbose

# Configure Function App Settings
echo "Configuring Function App Settings..."
az functionapp config appsettings set \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP_NAME" \
  --settings \
    "FUNCTIONS_WORKER_RUNTIME=node" \
    "DATABASE_CONNECTION_STRING=$SQL_CONN_STRING" \
    "GITHUB_WEBHOOK_SECRET=c875c8bc3aa983b23f2f267fd6a057b6d70eb4ab" \
    "FUNCTIONS_EXTENSION_VERSION=~4" \
    "WEBSITE_NODE_DEFAULT_VERSION=~18" \
    "WEBSITE_RUN_FROM_PACKAGE=1"

# Restart the function app
echo "Restarting function app..."
az functionapp restart \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP_NAME"

# Verify Deployment
echo "Deployment Verification:"
az functionapp show \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP_NAME" \
  --query "{name:name, state:state, hostNames:hostNames}"

# List functions
echo -e "\nListing functions:"
az functionapp function list \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP_NAME" \
  --output table

echo -e "\nDeployment complete. Check logs for any issues."s


FUNCTION_KEY=$(az functionapp function keys list \
  --name "prequel-functionee90307a" \
  --resource-group "prequel-rg9a95ed63" \
  --function-name webhook \
  --query "default" -o tsv)

az webapp log tail \
  --name "prequel-functionee90307a" \
  --resource-group "prequel-rg9a95ed63"
#!/bin/bash

# Set variables
FUNCTION_APP_NAME="prequel-functionee90307a"
RESOURCE_GROUP_NAME="prequel-rg9a95ed63"
FUNCTION_ZIP_PATH="function.zip"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
# Use a supported API version
SUPPORTED_API_VERSION="2024-04-01"

# Recreate deployment package
rm -f function.zip
mkdir -p deploy/functions

# Copy necessary files
cp -r dist/functions/webhook-handler/* deploy/functions/
cp -r dist/functions/analytics deploy/functions/
cp dist/utils/* deploy/functions/
cp dist/types/* deploy/functions/

# Create function.json
cat > deploy/functions/function.json << EOL
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

# Create package.json
cat > deploy/functions/package.json << EOL
{
  "name": "prequel-webhook-handler",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "@azure/functions": "^4.0.0"
  }
}
EOL

# Zip the deployment package
cd deploy
zip -r ../function.zip functions
cd ..

# Get SQL connection string from Pulumi
SQL_CONN_STRING=$(pulumi stack output sqlConnectionString)

# Deployment command with verbose output
echo "Deploying function package..."
deployment_response=$(curl -v -X POST \
  -H "Authorization: Bearer $(az account get-access-token --query accessToken -o tsv)" \
  -H "Content-Type: application/octet-stream" \
  --data-binary "@$FUNCTION_ZIP_PATH" \
  "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP_NAME/providers/Microsoft.Web/sites/$FUNCTION_APP_NAME/deployzip?api-version=$SUPPORTED_API_VERSION" 2>&1)

# Check deployment response
if [[ $deployment_response == *"error"* ]]; then
  echo "Deployment Failed:"
  echo "$deployment_response"
  exit 1
fi

# Configure Function App Settings using az CLI
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

# Verify Deployment
echo "Deployment Verification:"
az functionapp show \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP_NAME"

# Additional Diagnostics
echo -e "\nFunction App Details:"
az functionapp show \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP_NAME" \
  --query "{name:name, state:state, hostNames:hostNames}"

# Check Application Settings
echo -e "\nApplication Settings:"
az functionapp config appsettings list \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP_NAME"
#!/bin/bash
test-azure-app.sh

# Check Function App overall status
az functionapp show \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP_NAME"

# List application settings
az functionapp config appsettings list \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP_NAME"

# List recent deployments
az webapp deployment list \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP_NAME"

# Get specific deployment details
LATEST_DEPLOYMENT_ID=$(az functionapp deployment list \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP_NAME" \
  --query "[0].id" -o tsv)

# View deployment log for a specific deployment
az functionapp deployment source show \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP_NAME" \
  --deployment-id "$LATEST_DEPLOYMENT_ID"  
# Enable detailed logging
az webapp log config \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP_NAME" \
  --web-server-logging filesystem \
  --detailed-error-messages true \
  --failed-request-tracing true

# Download logs
az webapp log download \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP_NAME"

# Stream live logs
az webapp log tail \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP_NAME"  

# Restart the Function App
az functionapp restart \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP_NAME"

# Redeploy from latest source
az functionapp deployment source sync \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP_NAME"  

# Basic payload test
curl -v -X POST "https://$FUNCTION_APP_NAME.azurewebsites.net/api/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "test": "payload",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
  }'

# GitHub-like PR event test
curl -v -X POST "https://$FUNCTION_APP_NAME.azurewebsites.net/api/webhook" \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: pull_request" \
  -H "X-GitHub-Delivery: $(uuidgen)" \
  -H "X-Hub-Signature-256: sha256=test_signature" \
  -d '{
    "action": "opened",
    "pull_request": {
      "number": 1,
      "title": "Test PR",
      "body": "Verification payload"
    },
    "repository": {
      "full_name": "test-org/test-repo"
    }
  }'

 # List files in Function App
az webapp file list \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP_NAME"

# Check runtime configuration
az functionapp config show \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP_NAME" 

# Verify Node.js runtime
az functionapp config appsettings list \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP_NAME" \
  --query "[?name=='WEBSITE_NODE_DEFAULT_VERSION']"

# Check extension bundle
az functionapp config appsettings list \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP_NAME" \
  --query "[?name=='FUNCTIONS_EXTENSION_VERSION']"  
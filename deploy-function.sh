#!/bin/bash

FUNCTION_APP_NAME="prequel-webhook-174350"
RESOURCE_GROUP_NAME="prequel-rg9a95ed63"
FUNCTION_ZIP_PATH="function.zip"

# Compile TypeScript
npx tsc

# Prepare deployment directory
rm -rf deploy
mkdir -p deploy/webhook/analytics

# Copy files
cp -r dist/functions/webhook-handler/* deploy/webhook/
cp -r dist/functions/analytics/* deploy/webhook/analytics/
cp dist/utils/* deploy/webhook/

# Create function.json
cat > deploy/webhook/function.json << EOL
{
  "bindings": [
    {
      "authLevel": "anonymous",
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
  ],
  "scriptFile": "index.js"
}
EOL

# Create host.json
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
      "Host.Results": "Error",
      "Function": "Verbose"
    }
  }
}
EOL

# Create package.json
cat > deploy/package.json << EOL
{
  "name": "prequel-webhook-handler",
  "version": "1.0.0",
  "main": "webhook/index.js",
  "dependencies": {
    "@azure/functions": "^3.5.0",
    "mssql": "^9.1.1"
  },
  "scripts": {
    "start": "func start"
  }
}
EOL

# Zip deployment files
cd deploy
zip -r ../function.zip *
cd ..

# Deploy zip
az functionapp deployment source config-zip \
  --resource-group "$RESOURCE_GROUP_NAME" \
  --name "$FUNCTION_APP_NAME" \
  --src "$FUNCTION_ZIP_PATH" \
  --debug

# Configure App Settings
az functionapp config appsettings set \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP_NAME" \
  --settings \
    "FUNCTIONS_WORKER_RUNTIME=node" \
    "FUNCTIONS_EXTENSION_VERSION=~4" \
    "WEBSITE_NODE_DEFAULT_VERSION=~18" \
    "WEBSITE_RUN_FROM_PACKAGE=1" \
    "WEBSITE_LOAD_CERTIFICATES=*"

# Enable Application Logging
az webapp log config \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP_NAME" \
  --web-server-logging filesystem \
  --detailed-error-messages true \
  --failed-request-tracing true

# Restart Function App
az functionapp restart \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP_NAME"

echo "Deployment completed successfully!"
# #!/bin/bash

# # Set variables
# FUNCTION_APP_NAME="prequel-functionee90307a"
# RESOURCE_GROUP_NAME="prequel-rg9a95ed63"
# FUNCTION_ZIP_PATH="function.zip"

# # Recreate the deployment package
# rm -rf deploy rm -f function.zip
# mkdir -p deploy/webhook

# # Copy webhook handler files
# cp -r dist/functions/webhook-handler/* deploy/webhook/

# # Create minimal function.json
# cat > deploy/webhook/function.json << EOL
# {
#    "bindings": [
#      {
#        "authLevel": "function",
#        "type": "httpTrigger",
#        "direction": "in",
#        "name": "req",
#        "methods": ["post"]
#      },
#      {
#        "type": "http",
#        "direction": "out",
#        "name": "res"
#      }
#    ]
# }
# EOL

# # Create minimal index.js for testing
# cat > deploy/webhook/index.js << EOL
# module.exports = async function (context, req) {
#     context.log('Webhook function processed a request.');
#     context.res = {
#         status: 200,
#         body: { message: 'Webhook received successfully' }
#     };
# };
# EOL

# # Create the zip file
# cd deploy
# zip -r ../function.zip *
# cd ..

# # Deploy the zip package
# echo "Redeploying function package..."
# az functionapp deployment source config-zip \
#    --resource-group "$RESOURCE_GROUP_NAME" \
#    --name "$FUNCTION_APP_NAME" \
#    --src "$FUNCTION_ZIP_PATH" \
#    --verbose

# # Get and display the function key
# FUNCTION_KEY=$(az functionapp function keys list \
#    --name "$FUNCTION_APP_NAME" \
#    --resource-group "$RESOURCE_GROUP_NAME" \
#    --function-name webhook \
#    --query "default" -o tsv)

# # Verify the webhook endpoint with a test request
# WEBHOOK_URL="https://$FUNCTION_APP_NAME.azurewebsites.net/api/webhook?code=$FUNCTION_KEY"
# echo "Testing webhook URL: $WEBHOOK_URL"

# curl -v -X POST "$WEBHOOK_URL" \
#    -H "Content-Type: application/json" \
#    -H "X-GitHub-Event: pull_request" \
#    -d '{
#      "action": "opened",
#      "pull_request": {
#        "number": 123,
#        "title": "Test PR",
#        "body": "This is a test PR"
#      }
#    }'

# # Tail logs to check for any issues
# echo -e "\nTailing Function App Logs:"
# az webapp log tail \
#    --name "$FUNCTION_APP_NAME" \
#    --resource-group "$RESOURCE_GROUP_NAME"
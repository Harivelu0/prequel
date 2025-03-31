#!/bin/bash

# Replace these with your actual values
WEBHOOK_URL=$(pulumi stack output webhookUrl)
FUNCTION_KEY=$(az functionapp function keys list \
  --name "prequel-functionee90307a" \
  --resource-group "prequel-rg9a95ed63" \
  --function-name webhook \
  --query "default" -o tsv)
SECRET="c875c8bc3aa983b23f2f267fd6a057b6d70eb4ab"

# PR event payload
JSON_PAYLOAD='{
  "action": "opened",
  "pull_request": {
    "number": 123,
    "title": "Test PR",
    "body": "This is a test PR",
    "user": {"login": "testuser"},
    "created_at": "2023-03-30T12:00:00Z",
    "updated_at": "2023-03-30T12:00:00Z"
  },
  "repository": {
    "name": "testrepo",
    "full_name": "Shetchuko/testrepo",
    "owner": {"login": "Shetchuko"}
  },
  "organization": {
    "login": "Shetchuko",
    "id": 12345
  }
}'

# Generate the signature
SIGNATURE=$(echo -n "$JSON_PAYLOAD" | openssl sha256 -hmac "$SECRET" | awk '{print $2}')

# Display values for verification
echo "Webhook URL: $WEBHOOK_URL"
echo "Function Key: $FUNCTION_KEY"
echo "Generated Signature: sha256=$SIGNATURE"

# Send the request with proper authentication
echo -e "\nSending test webhook event..."
curl -v "${WEBHOOK_URL}?code=${FUNCTION_KEY}" \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: pull_request" \
  -H "X-Hub-Signature-256: sha256=${SIGNATURE}" \
  -d "$JSON_PAYLOAD"

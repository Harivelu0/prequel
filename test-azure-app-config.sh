#!/bin/bash
# test-pr.sh

# Get webhook URL
WEBHOOK_URL=https://prequel-functionee90307a.azurewebsites.net/api/webhook?code=F7VQkPpcyYf5r_08be0N7-mtO0I-TqLkYL2AkwpdcMeiAzFuDu7Kag==
echo "Using webhook URL: $WEBHOOK_URL"

# Create test payload
echo "Creating test payload..."
TEST_PAYLOAD=$(cat <<EOF
{
  "action": "opened",
  "pull_request": {
    "number": 123,
    "title": "Test PR",
    "html_url": "https://github.com/YourOrg/your-repo/pull/123",
    "user": {
      "login": "test-user"
    },
    "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  },
  "repository": {
    "full_name": "Shetchuko/pulumi-repo"
  }
}
EOF
)

echo "Sending webhook request..."
curl -v -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: pull_request" \
  -H "X-GitHub-Delivery: $(uuidgen)" \
  -d "$TEST_PAYLOAD"

echo "Test complete."
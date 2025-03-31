#!/bin/bash

# Test with a mock PR event
curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: pull_request" \
  -H "X-Hub-Signature-256: sha256=<signature>" \
  -d '{
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
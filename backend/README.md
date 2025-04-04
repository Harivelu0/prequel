# GitHub PR to Slack Notifier

A simple Python script that sends Slack notifications whenever a Pull Request is created in your GitHub organization.

## Setup

1. **Install Python Requirements**
```bash
python3 -m venv venv
source venv/bin/activate
pip install flask requests python-dotenv
```

2. **Create .env File**
Create a `.env` file in your project directory:
```env
SLACK_WEBHOOK_URL=your_slack_webhook_url
GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

3. **Get Slack Webhook URL**
- Go to api.slack.com/apps
- Create New App
- Enable Incoming Webhooks
- Add New Webhook to Workspace
- Copy the Webhook URL

4. **Set Up GitHub Webhook**
- Go to your Organization Settings
- Click Webhooks
- Add webhook
- Set Content type to `application/json`
- Generate a secret and add it to your `.env` file
- Select "Pull requests" under events

5. **Run the Application**
```bash
python app.py
```

## Features
- Notifications for new Pull Requests
- Secure webhook verification
- Customizable Slack messages
- Easy to set up and use

## Testing Locally
Use ngrok to test locally:
```bash
ngrok http 5000
```
Use the ngrok URL as your webhook URL in GitHub settings.

## Environment Variables
- `SLACK_WEBHOOK_URL`: Your Slack webhook URL for sending notifications
- `GITHUB_WEBHOOK_SECRET`: Secret key for GitHub webhook verification

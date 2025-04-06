# PReQual - Pull Request Quality Manager

PReQual is a comprehensive GitHub pull request quality management system built for the **Pulumi "Get Creative with Pulumi and GitHub" Hackathon**. It helps teams monitor, analyze, and streamline their code review process while providing insights into team contributions and PR patterns.

## Features

- **Contributor Rewards Insights**: Track who's creating PRs, providing reviews, and leaving comments to recognize top contributors
- **PR Analytics Dashboard**: Visualize contribution patterns and PR metrics across your organization
- **Stale PR Detection & Alerts**: Automatically identify and notify about inactive PRs that need attention
- **Repository Management**: Create repositories with standardized branch protection rules
- **Slack Notifications**: Receive real-time alerts for all PR events (new PRs, reviews, and stale PRs)
- **Branch Protection Enforcement**: Ensure code quality by requiring:
  - Minimum number of approving reviews before merging
  - Prevention of direct pushes to protected branches
  - Required conversation resolution

## System Architecture

![System Architecture](docs/system-architecture.png)

PReQual integrates several components into a cohesive system:

- **Next.js Frontend**: Dashboard, repository management, and configuration interfaces
- **Flask Backend**: Processes GitHub webhooks and provides analytics APIs
- **Azure SQL Database**: Stores all PR-related data and contributor metrics
- **Pulumi Infrastructure**: Manages GitHub repositories and Azure resources as code
- **GitHub Integration**: Webhook-based event processing for PR activities
- **Slack Integration**: Timely notifications for PR events

## Important Notes

- **GitHub Enterprise Required**: To use branch protection on private repositories, you need GitHub Enterprise or a public repository. GitHub Pro does not support all branch protection features for private repos.

- **Deployment Options**:
  - **Azure VM Deployment**: Full infrastructure with VM acting as webhook receiver
  - **Local-only Mode**: Run without Azure infrastructure for testing/personal use

- **Azure VM as Webhook Endpoint**: We deploy an Azure VM to serve as the webhook endpoint for GitHub events because:
  - It provides a stable, always-on service to receive webhook events
  - It can be secured and scaled according to organizational needs
  - It allows centralized processing of webhook events across repositories
  - It maintains a persistent database connection for analytics

- **Configuration Management**: All tokens and credentials can be updated through the settings page in the UI after initial setup. The system automatically updates environment configurations, so you don't need to manually modify files if tokens expire.

## Prerequisites

- Python 3.8+
- Node.js 16+
- Pulumi CLI
- GitHub account with organization admin permissions
- GitHub token with repo and admin:org permissions
- Slack workspace with webhook URL (for notifications)
- For Azure deployment: Azure subscription

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/prequel.git
   cd prequel
   ```

2. **Set up the backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Set up the frontend**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up the infrastructure**
   ```bash
   cd ../infrastructure
   npm install
   pulumi login
   ```

## Running PReQual

### Local Mode

1. **Start the backend**
   ```bash
   cd backend
   python -m prequel_app.app
   ```

2. **Start the frontend**
   ```bash
   cd frontend
   export NEXT_PUBLIC_API_URL=http://localhost:5000
   npm run dev
   ```

3. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`
   - Complete the setup wizard with your GitHub and Slack details
   - The system will automatically configure everything

### Azure Deployment

When using the setup wizard in the UI:

1. Enter your GitHub token, organization name, and Slack webhook URL
2. The system automatically deploys the required infrastructure using Pulumi
3. The Azure VM will be configured as your GitHub webhook endpoint
4. For production deployment, deploy the frontend to Vercel or Azure Web App and set `NEXT_PUBLIC_API_URL` to your VM's public IP

## How It Works

### Webhook Processing

When PR activity occurs on GitHub:
1. GitHub sends a webhook event to your PReQual instance (Azure VM or local server)
2. The Flask backend validates the webhook signature and processes the event
3. Event data is stored in the database with repository, user, and PR details
4. Activity timestamps are updated to track PR freshness
5. Slack notifications are sent for relevant events

### Contributor Insights

The system tracks:
- Who creates the most PRs
- Who actively reviews others' code
- Comment frequency and distribution

This information helps recognize team members' contributions and identify areas for improvement in the review process.

### Stale PR Detection

A background task runs daily to:
1. Identify PRs with no activity for the configured period (default: 7 days)
2. Mark these PRs as stale in the database
3. Send Slack notifications to bring attention to forgotten PRs
4. Update the dashboard with stale PR information

### Branch Protection

When creating repositories, PReQual automatically configures branch protection rules:
1. Requires a minimum number of approving reviews
2. Prevents force pushes to the main branch
3. Requires conversation resolution before merging

**Note:** Full branch protection on private repositories requires GitHub Enterprise.

## Project Structure

```
prequel/
├── backend/              # Flask backend
│   ├── config/           # Configuration files
│   ├── prequel_app/      # Application code
│   │   ├── app.py        # Main application entry point
│   │   ├── github_handler.py # GitHub webhook processing
│   │   ├── slack_notifier.py # Slack notification handling
│   │   ├── pulumi_executor.py # Pulumi infrastructure management
│   │   └── ...           # Other handlers
│   ├── prequel_db/       # Database layer
│   │   ├── db_connection.py # Database connection management
│   │   ├── db_models.py  # Database models
│   │   ├── db_analytics.py # Analytics queries
│   │   └── db_handler.py # Main database interface
│   └── requirements.txt  # Python dependencies
├── frontend/             # Next.js frontend
│   ├── src/              # Source code
│   │   ├── app/          # Next.js pages
│   │   ├── components/   # React components
│   │   └── lib/          # Utilities and API clients
│   └── package.json      # Node.js dependencies
└── infrastructure/       # Pulumi IaC code
    ├── scripts/          # Setup scripts
    │   ├── setup_config.sh # Configuration script
    │   └── setup-vm.sh   # VM initialization script
    ├── src/              # Infrastructure modules
    │   ├── automation/   # Pulumi Automation API
    │   ├── azure/        # Azure resources
    │   ├── config/       # Configuration templates
    │   ├── pulumi/       # GitHub provider resources
    │   └── utils/        # Utility functions
    └── index.ts          # Main Pulumi program
```

## Hackathon Context

This project was developed for the **Pulumi "Get Creative with Pulumi and GitHub" Hackathon**. It demonstrates:

1. **Pulumi GitHub Provider**: Creating and configuring repositories programmatically
2. **Pulumi Automation API**: Managing infrastructure via Python using the Automation API
3. **Creative Integration**: Combining GitHub workflows with infrastructure as code
4. **Practical Application**: Solving real team collaboration challenges

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Pulumi](https://www.pulumi.com/) for infrastructure as code
- Uses [GitHub API](https://docs.github.com/en/rest) for repository management
- Powered by [Next.js](https://nextjs.org/) and [Flask](https://flask.palletsprojects.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
# PReQual - Pull Request Quality Manager

PReQual is a comprehensive GitHub pull request quality management system built for the **Pulumi "Get Creative with Pulumi and GitHub" Hackathon**. It helps teams monitor, analyze, and streamline their code review process while providing insights into team contributions and PR patterns. See the PReQual Application [here](https://prequel-3jjh15c8m-hps-projects-4515921f.vercel.app/) due to cloud cost, this demo didn't have any Azure resources. You can see screenshots of the analytics dashboards below. Note* it's not mock data, it's my own GitHub account's data for testing, I created another GitHub account, added it to my organization, and used it. 

![Screenshot 2025-04-06 015757](https://github.com/user-attachments/assets/88cfd304-ab19-444b-93aa-b02dbaaefecb)

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

![Screenshot 2025-04-06 212153](https://github.com/user-attachments/assets/ce84e8a4-91e6-4bb2-b35b-48a9c38cec70)

PReQual integrates several components into a cohesive system:

- **Next.js Frontend**: Dashboard, repository management, and configuration interfaces
- **Flask Backend**: Processes GitHub webhooks and provides analytics APIs
- **Azure SQL Database**: Stores all PR-related data and contributor metrics
- **Pulumi Infrastructure**: Manages GitHub repositories and Azure resources as code
- **GitHub Integration**: Webhook-based event processing for PR activities
- **Slack Integration**: Timely notifications for PR events

## Important Notes

- **GitHub Enterprise Required**: To use branch protection on private repositories, you need GitHub Enterprise or a public repository. GitHub Pro does not support all branch protection features for private repos.
- **Token Permission Enabled**: while creating the github token ensure the token have repo full access admin:hook & admin:org enabled if not system get permission denied issue from github and didnt proceeed the setup
- **Deployment Options**:
  - **Azure VM Deployment**: Full infrastructure with VM acting as webhook receiver
  - **Local-only Mode**: Run without Azure infrastructure for testing/personal use

- **Azure VM as Webhook Endpoint**: I deploy an Azure VM to serve as the webhook endpoint for GitHub events because:
  - It provides a stable, always-on service to receive webhook events
  - It can be secured and scaled according to organizational needs
  - It allows centralized processing of webhook events across repositories
  - It maintains a persistent database connection for analytics

- **Configuration Management**: The system automatically updates environment configurations, so you don't need to manually modify files if tokens expire. If you want to update, go to the settings page and provide the token and URL.

## Prerequisites

- Python 3.8+
- Node.js 16+
- Pulumi CLI
- GitHub account with organization admin permissions
- GitHub token with repo and admin:org permissions
- Slack workspace with webhook URL (for notifications)
- For Azure deployment: Azure subscription and service principal

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

## Environment Variables

### Local Mode (Backend Only)
If you're running the backend locally without Azure deployment, create a `.env` file in the `backend` directory with:

```
# GitHub Configuration
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret
ORGANIZATION_NAME=your_github_organization

# Slack Configuration
SLACK_WEBHOOK_URL=your_slack_webhook_url

# PR Settings
STALE_PR_DAYS=7

# SQL Server configuration (optional for local testing)
SQL_SERVER=your-server.database.windows.net
SQL_DATABASE=your_database_name
SQL_USERNAME=your_sql_username
SQL_PASSWORD=your_sql_password
```

### Full Azure Deployment
For complete end-to-end deployment with Azure infrastructure, you'll need these additional environment variables:

```
# Pulumi Configuration
PULUMI_CONFIG_PASSPHRASE=your_passphrase(Any random string)

# Azure Service Principal
AZURE_CLIENT_ID=your_service_principal_client_id
AZURE_CLIENT_SECRET=your_service_principal_secret
AZURE_TENANT_ID=your_azure_tenant_id
AZURE_SUBSCRIPTION_ID=your_subscription_id
```

**Important**: Before running the full Azure deployment, you must authenticate with Azure:
```bash
az login --service-principal -u $AZURE_CLIENT_ID -p $AZURE_CLIENT_SECRET --tenant $AZURE_TENANT_ID
az account set --subscription $AZURE_SUBSCRIPTION_ID
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

### Creating Azure Service Principal

If you need to create a service principal for Azure deployment:

```bash
# Login to Azure
az login

# Create service principal with Contributor role
az ad sp create-for-rbac --name "PReQual-ServicePrincipal" --role Contributor \
   --scopes /subscriptions/your-subscription-id

# This will output the credentials needed for environment variables:
# {
#   "appId": "your-client-id",
#   "displayName": "PReQual-ServicePrincipal",
#   "password": "your-client-secret",
#   "tenant": "your-tenant-id"
# }
```

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

### Pulumi Infrastructure Management

The system uses Pulumi in two key ways:

1. **GitHub Repository Management**:
   - Creates repositories with standardized settings
   - Configures branch protection rules
   - Sets up webhooks for event monitoring
   
2. **Azure Infrastructure (for full deployment)**:
   - Provisions Azure VM to serve as webhook endpoint
   - Creates SQL Database for data storage
   - Configures networking and security

The `PulumiExecutor` class serves as the bridge between your Python backend and the Pulumi infrastructure code, allowing your application to manage infrastructure programmatically.

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

## Screenshots

![Screenshot 2025-04-06 143009](https://github.com/user-attachments/assets/5b88f452-f59c-456e-8b86-589e08a547e0)
![Screenshot 2025-04-06 015644](https://github.com/user-attachments/assets/2466cc88-10f0-4990-8639-e5b2215fb48f)
![Screenshot 2025-04-06 015657](https://github.com/user-attachments/assets/a8bd463c-d7e6-4997-95cb-52bb71de9d13)
![Screenshot 2025-04-06 101000](https://github.com/user-attachments/assets/23cc57b8-14b1-4fd4-a4e7-697f4664e01f)
![Screenshot 2025-04-06 101000](https://github.com/user-attachments/assets/3078e7b6-c491-4726-9607-674cf33996be)
![Screenshot 2025-04-06 015514](https://github.com/user-attachments/assets/d36334cc-1319-4cd6-8c5c-4ec08a6c83ee)
![Screenshot 2025-04-06 015420](https://github.com/user-attachments/assets/d35bba10-524d-480b-ab42-4e9eeaec1656)
![Screenshot 2025-04-06 015300](https://github.com/user-attachments/assets/4b156c2f-5d3e-4741-9424-433f3c032172)
![Screenshot 2025-04-06 014901](https://github.com/user-attachments/assets/5f0bc488-3459-4684-85d1-ea981dfca6bd)
![Screenshot 2025-04-06 014844](https://github.com/user-attachments/assets/cc8fdae1-7152-4355-a6a4-9adef10cc657)
![Screenshot 2025-04-06 015329](https://github.com/user-attachments/assets/9336c35e-6fc1-4759-bf6d-9c23d41ae90d)



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

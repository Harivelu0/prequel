# PReQual - PR Quality Management System

PReQual is a tool for automating GitHub repository configuration and PR workflow management using Pulumi's GitHub provider and Automation API.

## Features

- **Repository Standardization**: Automatically configure repositories with consistent settings
- **Branch Protection**: Enforce code review requirements and prevent self-approvals
- **Webhook Integration**: Connect repositories to your notification system
- **Multi-Repository Management**: Deploy configurations across multiple repositories with a single command

## Prerequisites

- Node.js (v14 or later)
- Pulumi CLI
- GitHub access token with appropriate permissions
- Existing webhook endpoint for notifications

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/your-username/prequel.git
   cd prequel
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with your configuration:
   ```
   GITHUB_TOKEN=your_github_token
   WEBHOOK_URL=https://your-webhook-endpoint.com/github
   WEBHOOK_SECRET=your_webhook_secret
   ```

4. Build the project:
   ```
   npm run build
   ```

## Usage

### Configure a Single Repository

```bash
ts-node src/index.ts setup-repo --name pulumi-repo --org Shetchuko --description "Repository description" --visibility public --branch main
```

### Configure Multiple Repositories

1. Create a configuration file (see `sample-repos-config.json` for an example):

2. Run the deployment:
```bash
npm run deploy sample-repos-config.json
```

## Command Line Options

### `setup-repo` Command

- `-n, --name <name>`: Repository name (required)
- `-o, --org <organization>`: GitHub organization name
- `-d, --description <description>`: Repository description
- `-v, --visibility <visibility>`: Repository visibility (public, private, internal)
- `-b, --branch <branch>`: Default branch name (default: main)
- `-a, --approvals <number>`: Number of required approvals (default: 1)
- `-s, --self-approvals`: Allow self-approvals (default: false)
- `-w, --webhook-url <url>`: Webhook URL (falls back to environment variable)
- `--webhook-secret <secret>`: Webhook secret (falls back to environment variable)

### `setup-multiple` Command

- `-f, --file <path>`: Path to configuration JSON file (required)

## Configuration Format

The configuration file should contain an array of repository configurations:

```json
[
  {
    "name": "my-repo",
    "description": "My repository",
    "organization": "my-organization",
    "visibility": "private",
    "defaultBranch": "main",
    "requiredApprovals": 1,
    "allowSelfApprovals": false
  }
]
```

## Repository Settings Applied

- **Branch Protection**:
  - Required reviews before merging
  - Prevent self-approval
  - Enforce up-to-date branches before merging
  - Prevent direct pushes to protected branches

- **Repository Settings**:
  - Delete head branches after merging
  - Require squash merging (disable merge commits)
  - Enable issue tracking and wiki

- **Webhooks**:
  - Configured for PR events
  - Secured with webhook secret

## Project Structure

```
prequel/
├── src/
│   ├── config/          # Configuration templates
│   ├── pulumi/          # Pulumi resource definitions
│   ├── automation/      # Pulumi Automation API implementation
│   └── utils/           # Utility functions
├── scripts/             # Deployment scripts
└── sample-repos-config.json  # Sample configuration
```

## Future Enhancements

- PR metrics tracking
- Stale PR detection
- Team contribution analytics
- Web dashboard for visualization

## License

MIT
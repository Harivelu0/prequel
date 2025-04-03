#!/bin/bash
set -e

# Log all steps for debugging
exec > >(tee -a /var/log/vm-setup.log) 2>&1
echo "Starting VM setup at $(date)"

# Display environment variables status (without showing values)
echo "Checking environment variables..."
echo "GITHUB_WEBHOOK_SECRET is ${GITHUB_WEBHOOK_SECRET:+set (not showing value)}"
echo "SLACK_WEBHOOK_URL is ${SLACK_WEBHOOK_URL:+set (not showing value)}"
echo "SQL_CONNECTION_STRING is ${SQL_CONNECTION_STRING:+set (not showing value)}"

# Update system packages
echo "Updating system packages..."
apt update
apt upgrade -y

# Install required dependencies
echo "Installing dependencies..."
apt install -y nginx python3-pip python3-venv git ufw unixodbc-dev curl

# Install Microsoft ODBC drivers for SQL Server
echo "Installing Microsoft ODBC drivers..."
curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add -
curl https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/prod.list | sudo tee /etc/apt/sources.list.d/mssql-release.list
apt-get update
ACCEPT_EULA=Y apt-get install -y msodbcsql17

# Verify ODBC configuration
echo "Verifying ODBC configuration..."
odbcinst -j
cat /etc/odbcinst.ini

# Set up firewall
echo "Configuring firewall..."
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

# Determine current user
CURRENT_USER=$(logname || echo ${SUDO_USER:-$(whoami)})
echo "Detected current user: $CURRENT_USER"
HOME_DIR="/home/$CURRENT_USER"

# Create app directory
echo "Setting up application directory..."
APP_DIR="$HOME_DIR/github-slack-automation"
mkdir -p $APP_DIR
cd $APP_DIR

# Create virtual environment
echo "Setting up Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install Python packages
echo "Installing Python packages..."
pip install flask requests python-dotenv gunicorn pymysql pyodbc

# Clone webhook handler code
echo "Cloning webhook handler code..."
CLONE_DIR="/tmp/prequel-webhook"
mkdir -p $CLONE_DIR
git clone https://github.com/Harivelu0/slack-pr-automation $CLONE_DIR

# Copy application files
echo "Setting up application files..."
cp -r $CLONE_DIR/* $APP_DIR/
echo "Files copied, listing app directory:"
ls -la $APP_DIR

# Parse SQL_CONNECTION_STRING to extract individual components
if [ ! -z "$SQL_CONNECTION_STRING" ]; then
  echo "Extracting SQL components from connection string..."
  
  # Extract server (between 'Server=tcp:' and ',1433')
  SQL_SERVER=$(echo "$SQL_CONNECTION_STRING" | grep -o 'Server=tcp:[^,]*' | sed 's/Server=tcp://')
  
  # Extract database (between 'Initial Catalog=' and ';')
  SQL_DATABASE=$(echo "$SQL_CONNECTION_STRING" | grep -o 'Initial Catalog=[^;]*' | sed 's/Initial Catalog=//')
  
  # Extract username (between 'User ID=' and ';')
  SQL_USERNAME=$(echo "$SQL_CONNECTION_STRING" | grep -o 'User ID=[^;]*' | sed 's/User ID=//')
  
  # Extract password (between 'Password=' and ';')
  SQL_PASSWORD=$(echo "$SQL_CONNECTION_STRING" | grep -o 'Password=[^;]*' | sed 's/Password=//')
  
  echo "SQL components extracted (values masked): SERVER=*******, DATABASE=*******, USERNAME=*******, PASSWORD=*******"
fi

# Create environment file with individual SQL components
echo "Creating .env file..."
cat > $APP_DIR/.env << EOF
# GitHub webhook configuration
GITHUB_WEBHOOK_SECRET=${GITHUB_WEBHOOK_SECRET}

# Slack webhook URL
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}

# Database connection components
SQL_SERVER=${SQL_SERVER}
SQL_DATABASE=${SQL_DATABASE}
SQL_USERNAME=${SQL_USERNAME}
SQL_PASSWORD=${SQL_PASSWORD}

# Full database connection string
DATABASE_CONNECTION_STRING=${SQL_CONNECTION_STRING}
EOF

echo "Content of .env file (with values masked):"
cat $APP_DIR/.env | sed 's/=.*$/=******/'

# Create a systemd service file with EnvironmentFile directive
echo "Setting up systemd service..."
cat > /etc/systemd/system/github-slack-automation.service << EOF
[Unit]
Description=GitHub PR Notification Service
After=network.target

[Service]
User=${CURRENT_USER}
WorkingDirectory=${APP_DIR}
Environment="PATH=${APP_DIR}/venv/bin"
EnvironmentFile=${APP_DIR}/.env
ExecStart=${APP_DIR}/venv/bin/gunicorn --workers 2 --bind 0.0.0.0:5001 app:app
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Configure Nginx
echo "Configuring Nginx..."
cat > /etc/nginx/sites-available/github-slack << EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:5001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable the Nginx site
ln -sf /etc/nginx/sites-available/github-slack /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Restart Nginx
systemctl restart nginx

# Set up cron jobs for scheduled tasks
echo "Setting up cron jobs..."
(crontab -l 2>/dev/null || echo "") | grep -v "stale_pr_detector.py" | crontab -
(crontab -l 2>/dev/null; echo "0 9 * * * $APP_DIR/venv/bin/python $APP_DIR/stale_pr_detector.py >> $APP_DIR/stale_pr.log 2>&1") | crontab -
(crontab -l 2>/dev/null || echo "") | grep -v "metrics_calculator.py" | crontab -
(crontab -l 2>/dev/null; echo "0 10 * * 1 $APP_DIR/venv/bin/python $APP_DIR/metrics_calculator.py >> $APP_DIR/metrics.log 2>&1") | crontab -

# Set proper ownership for the application files
echo "Setting permissions..."
chown -R ${CURRENT_USER}:${CURRENT_USER} $APP_DIR

# Start and enable the service
systemctl daemon-reload
systemctl start github-slack-automation
systemctl enable github-slack-automation

# Clean up the temporary clone directory
rm -rf $CLONE_DIR

echo "Installation completed successfully at $(date)"
echo "GitHub webhook URL: http://$(curl -s ifconfig.me)/"
echo "Remember to configure this URL in your GitHub repository webhooks!"
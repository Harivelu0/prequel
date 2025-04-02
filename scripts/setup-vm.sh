#!/bin/bash
set -e

# Update system packages
echo "Updating system packages..."
apt update
apt upgrade -y

# Install required dependencies
echo "Installing dependencies..."
apt install -y nginx python3-pip python3-venv git ufw

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
pip install flask requests python-dotenv gunicorn pymysql

# Clone webhook handler code
echo "Cloning webhook handler code..."
git clone https://github.com/Harivelu0/slack-pr-automation /tmp/prequel-webhook

# Copy application files
echo "Setting up application files..."
cp -r /tmp/prequel-webhook/* $APP_DIR/

# Get environment variables from script arguments
GITHUB_WEBHOOK_SECRET="$1"
SLACK_WEBHOOK_URL="$2"
DATABASE_CONNECTION_STRING="$3"

# Create environment file
echo "Creating .env file..."
cat > $APP_DIR/.env << EOF
GITHUB_WEBHOOK_SECRET=${GITHUB_WEBHOOK_SECRET}
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}
DATABASE_CONNECTION_STRING=${DATABASE_CONNECTION_STRING}
EOF

# Create a systemd service file for the application
echo "Setting up systemd service..."
cat > /etc/systemd/system/github-slack-automation.service << EOF
[Unit]
Description=GitHub PR Notification Service
After=network.target

[Service]
User=${CURRENT_USER}
WorkingDirectory=${APP_DIR}
Environment="PATH=${APP_DIR}/venv/bin"
ExecStart=${APP_DIR}/venv/bin/gunicorn --workers 2 --bind 0.0.0.0:5000 app:app
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
        proxy_pass http://localhost:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable the Nginx site
ln -s /etc/nginx/sites-available/github-slack /etc/nginx/sites-enabled/
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

echo "Installation completed successfully!"
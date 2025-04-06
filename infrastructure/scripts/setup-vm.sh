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
apt install -y nginx python3-pip python3-venv git ufw unixodbc-dev curl python3-dev build-essential

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
APP_DIR="$HOME_DIR/prequel"
mkdir -p $APP_DIR
cd $APP_DIR

# Clone repository to a temporary directory first
echo "Cloning application code..."
CLONE_DIR="/tmp/prequel-app"
mkdir -p $CLONE_DIR
git clone https://github.com/Harivelu0/prequel $CLONE_DIR

echo "Repository cloned successfully, copying needed directories..."

# Copy only backend and infrastructure directories
mkdir -p $APP_DIR/backend
mkdir -p $APP_DIR/infrastructure

# Copy backend files
cp -r $CLONE_DIR/backend/* $APP_DIR/backend/

# Copy infrastructure files
cp -r $CLONE_DIR/infrastructure/* $APP_DIR/infrastructure/

echo "Directories copied successfully, listing app directory:"
ls -la $APP_DIR

echo "Setting up sudo permissions for service restart..."
cat > /etc/sudoers.d/prequel << EOF
# Allow the application user to restart the service without a password
${CURRENT_USER} ALL=(ALL) NOPASSWD: /bin/systemctl restart prequel-backend
EOF
chmod 440 /etc/sudoers.d/prequel

# Now setup backend
echo "Setting up backend..."
cd $APP_DIR/backend
python3 -m venv venv
source venv/bin/activate

# Install Python packages
echo "Installing Python packages..."
pip install -r requirements.txt || echo "Failed to install from requirements.txt, falling back to manual installation"

# Install gunicorn explicitly to ensure it's available
echo "Installing gunicorn explicitly..."
pip install gunicorn

# Ensure Flask-CORS is properly installed with sudo permissions
echo "Ensuring Flask-CORS is properly installed..."
sudo -H $APP_DIR/backend/venv/bin/pip install flask-cors
sudo -H $APP_DIR/backend/venv/bin/python -c "import flask_cors" || {
    echo "Flask-CORS import test failed, fixing permissions and reinstalling..."
    sudo chown -R ${CURRENT_USER}:${CURRENT_USER} $APP_DIR/backend/venv
    source $APP_DIR/backend/venv/bin/activate
    pip install -U flask-cors
}

# Fallback for package installation if requirements.txt fails
if [ $? -ne 0 ]; then
    echo "Installing Python packages manually..."
    pip install flask requests python-dotenv gunicorn pymysql pyodbc flask-cors
fi

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
echo "Creating .env file for backend..."
cat > $APP_DIR/backend/.env << EOF
# GitHub webhook configuration
GITHUB_WEBHOOK_SECRET=${GITHUB_WEBHOOK_SECRET}

# Slack webhook URL
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}

# Database connection string
SQL_SERVER=${SQL_SERVER}
SQL_DATABASE=${SQL_DATABASE}
SQL_USERNAME=${SQL_USERNAME}
SQL_PASSWORD=${SQL_PASSWORD}

# Full database connection string
DATABASE_CONNECTION_STRING=${SQL_CONNECTION_STRING}
EOF

# Create a systemd service file for backend
echo "Setting up systemd service for backend..."
cat > /etc/systemd/system/prequel-backend.service << EOF
[Unit]
Description=PReQual Backend Service
After=network.target

[Service]
User=${CURRENT_USER}
WorkingDirectory=${APP_DIR}/backend
Environment="PATH=${APP_DIR}/backend/venv/bin"
Environment="PYTHONPATH=${APP_DIR}/backend"
EnvironmentFile=${APP_DIR}/backend/.env
ExecStart=${APP_DIR}/backend/venv/bin/gunicorn --workers 2 --bind 0.0.0.0:5001 prequel_app.app:app
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Configure Nginx as reverse proxy
echo "Configuring Nginx as reverse proxy..."
cat > /etc/nginx/sites-available/prequel << EOF
server {
    listen 80;
    server_name _;

    # API endpoints
    location /api/ {
        proxy_pass http://localhost:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # GitHub webhook endpoint
    location / {
        proxy_pass http://localhost:5001/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable the Nginx site
ln -sf /etc/nginx/sites-available/prequel /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo "Testing Nginx configuration..."
nginx -t

# Restart Nginx
systemctl restart nginx

# Set proper ownership for the application files
echo "Setting permissions..."
chown -R ${CURRENT_USER}:${CURRENT_USER} $APP_DIR

# Start and enable the backend service
systemctl daemon-reload
systemctl start prequel-backend
systemctl enable prequel-backend

# Setup infrastructure requirements
echo "Setting up infrastructure dependencies..."
# Install Node.js if not already installed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    apt install -y nodejs
fi

# Install npm packages for infrastructure
cd $APP_DIR/infrastructure
npm install

echo "Infrastructure dependencies installed successfully"

# Clean up temporary clone directory
rm -rf $CLONE_DIR
echo "Temporary clone directory removed"

echo "Installation completed successfully at $(date)"
echo "Backend API available at: http://$(curl -s ifconfig.me)/api/"
echo "GitHub webhook URL: http://$(curl -s ifconfig.me)/"
echo "Remember to configure your GitHub organization webhook to this URL!"
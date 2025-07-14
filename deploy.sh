#!/bin/bash

# iTABAZA Hospital Management System Deployment Script
# This script helps deploy the project to any server

set -e  # Exit on any error

echo "=== iTABAZA Hospital Management System Deployment ==="
echo "This script will help you deploy the project to your server."
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons."
   exit 1
fi

# Get server information
print_step "Collecting server information..."
read -p "Enter your server IP address (e.g., 54.235.237.101): " SERVER_IP
read -p "Enter backend port (default: 8080): " BACKEND_PORT
BACKEND_PORT=${BACKEND_PORT:-8080}

read -p "Enter frontend port (default: 3000): " FRONTEND_PORT
FRONTEND_PORT=${FRONTEND_PORT:-3000}

print_step "Collecting Supabase information..."
read -p "Enter your Supabase URL: " SUPABASE_URL
read -p "Enter your Supabase Anon Key: " SUPABASE_ANON_KEY
read -p "Enter your Supabase Service Role Key: " SUPABASE_SERVICE_ROLE_KEY

print_step "Collecting additional configuration..."
read -p "Enter JWT Secret (leave blank to generate): " JWT_SECRET
read -p "Enter Gmail for notifications (optional): " EMAIL_USER
read -p "Enter Gmail app password (optional): " EMAIL_PASS

# Generate JWT secret if not provided
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    print_status "Generated JWT secret: $JWT_SECRET"
fi

# Check if Node.js is installed
print_step "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    print_status "You can install Node.js using:"
    print_status "  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
    print_status "  sudo apt-get install -y nodejs"
    exit 1
fi

NODE_VERSION=$(node --version)
print_status "Node.js version: $NODE_VERSION"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

NPM_VERSION=$(npm --version)
print_status "npm version: $NPM_VERSION"

# Create .env file
print_step "Creating .env file..."
cat > Backend/.env << EOF
# Supabase Configuration
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# JWT Configuration
JWT_SECRET=$JWT_SECRET

# Email Configuration
EMAIL_USER=$EMAIL_USER
EMAIL_PASS=$EMAIL_PASS

# Server Configuration
PORT=$BACKEND_PORT
NODE_ENV=production

# Deployment Configuration
SERVER_HOST=$SERVER_IP

# Frontend Configuration
FRONTEND_URL=http://$SERVER_IP:$FRONTEND_PORT

# CORS Configuration
ALLOWED_ORIGINS=http://$SERVER_IP:$FRONTEND_PORT,http://$SERVER_IP:$BACKEND_PORT,http://$SERVER_IP,https://$SERVER_IP:$FRONTEND_PORT,https://$SERVER_IP:$BACKEND_PORT,https://$SERVER_IP
EOF

print_status ".env file created successfully!"

# Install backend dependencies
print_step "Installing backend dependencies..."
cd Backend
if [ -f "package.json" ]; then
    npm install
    print_status "Backend dependencies installed successfully!"
else
    print_error "package.json not found in Backend directory!"
    exit 1
fi
cd ..

# Install frontend dependencies (if package.json exists)
if [ -f "Frontend/package.json" ]; then
    print_step "Installing frontend dependencies..."
    cd Frontend
    npm install
    print_status "Frontend dependencies installed successfully!"
    cd ..
else
    print_warning "No package.json found in Frontend directory. Skipping frontend dependency installation."
fi

# Create systemd service file for backend
print_step "Creating systemd service file..."
SERVICE_FILE="/tmp/itabaza-backend.service"

cat > $SERVICE_FILE << EOF
[Unit]
Description=iTABAZA Hospital Management System Backend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/Backend
ExecStart=$(which node) index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

print_status "Service file created at $SERVICE_FILE"
print_warning "To install the service, run as root:"
print_warning "  sudo cp $SERVICE_FILE /etc/systemd/system/"
print_warning "  sudo systemctl daemon-reload"
print_warning "  sudo systemctl enable itabaza-backend"
print_warning "  sudo systemctl start itabaza-backend"

# Create nginx configuration
print_step "Creating nginx configuration..."
NGINX_CONFIG="/tmp/itabaza-nginx.conf"

cat > $NGINX_CONFIG << EOF
server {
    listen 80;
    server_name $SERVER_IP;

    # Frontend static files
    location / {
        root $(pwd)/Frontend;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend routes
    location ~ ^/(user|doctor|department|appointment|enhanced-appointment|admin|audio) {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

print_status "Nginx configuration created at $NGINX_CONFIG"
print_warning "To use nginx configuration, run as root:"
print_warning "  sudo cp $NGINX_CONFIG /etc/nginx/sites-available/itabaza"
print_warning "  sudo ln -s /etc/nginx/sites-available/itabaza /etc/nginx/sites-enabled/"
print_warning "  sudo nginx -t"
print_warning "  sudo systemctl restart nginx"

# Create startup script
print_step "Creating startup script..."
cat > start-server.sh << EOF
#!/bin/bash
# iTABAZA Hospital Management System Startup Script

echo "Starting iTABAZA Hospital Management System..."

# Start backend server
cd Backend
echo "Starting backend server on port $BACKEND_PORT..."
npm run server &
BACKEND_PID=\$!

echo "Backend server started with PID: \$BACKEND_PID"

# Function to cleanup on exit
cleanup() {
    echo "Stopping servers..."
    kill \$BACKEND_PID 2>/dev/null
    exit 0
}

# Trap signals
trap cleanup SIGINT SIGTERM

# Wait for backend to start
sleep 5

echo "Server is running!"
echo "Backend: http://$SERVER_IP:$BACKEND_PORT"
echo "Frontend: http://$SERVER_IP (if using nginx)"
echo "Health check: http://$SERVER_IP:$BACKEND_PORT/api/health"
echo ""
echo "Press Ctrl+C to stop the server."

# Keep script running
wait
EOF

chmod +x start-server.sh
print_status "Startup script created: start-server.sh"

# Create HTML configuration file for frontend
print_step "Creating frontend configuration..."
cat > Frontend/config.js << EOF
// Dynamic configuration for iTABAZA Hospital Management System
window.ITABAZA_CONFIG = {
    API_BASE_URL: 'http://$SERVER_IP:$BACKEND_PORT',
    SERVER_HOST: '$SERVER_IP',
    FRONTEND_PORT: '$FRONTEND_PORT',
    BACKEND_PORT: '$BACKEND_PORT'
};

// Supabase configuration (if needed by frontend)
window.SUPABASE_CONFIG = {
    url: '$SUPABASE_URL',
    anonKey: '$SUPABASE_ANON_KEY'
};
EOF

print_status "Frontend configuration created: Frontend/config.js"

# Create firewall rules script
print_step "Creating firewall configuration..."
cat > setup-firewall.sh << EOF
#!/bin/bash
# Firewall setup for iTABAZA Hospital Management System

echo "Setting up firewall rules..."

# Allow SSH (adjust port if needed)
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow backend port
sudo ufw allow $BACKEND_PORT/tcp

# Allow frontend port (if serving separately)
sudo ufw allow $FRONTEND_PORT/tcp

# Enable firewall
sudo ufw --force enable

echo "Firewall setup completed!"
echo "Open ports: SSH, 80, 443, $BACKEND_PORT, $FRONTEND_PORT"
EOF

chmod +x setup-firewall.sh
print_status "Firewall setup script created: setup-firewall.sh"

# Final instructions
print_step "Deployment preparation completed!"
echo ""
print_status "=== DEPLOYMENT SUMMARY ==="
print_status "Server IP: $SERVER_IP"
print_status "Backend Port: $BACKEND_PORT"
print_status "Frontend Port: $FRONTEND_PORT"
print_status "Environment: production"
echo ""
print_status "=== NEXT STEPS ==="
print_status "1. Review the generated .env file: Backend/.env"
print_status "2. Test the application locally: ./start-server.sh"
print_status "3. Set up firewall: ./setup-firewall.sh (as root)"
print_status "4. Install systemd service (optional): see instructions above"
print_status "5. Configure nginx (optional): see instructions above"
echo ""
print_status "=== QUICK START ==="
print_status "To start the server now:"
print_status "  ./start-server.sh"
echo ""
print_status "To test the deployment:"
print_status "  curl http://$SERVER_IP:$BACKEND_PORT/api/health"
echo ""
print_warning "Remember to:"
print_warning "- Update your DNS records (if using a domain)"
print_warning "- Set up SSL certificates for HTTPS"
print_warning "- Configure proper backup procedures"
print_warning "- Set up monitoring and logging"
echo ""
print_status "Deployment script completed successfully!"

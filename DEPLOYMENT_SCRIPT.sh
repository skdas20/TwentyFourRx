#!/bin/bash

# 24Rx Deployment Script for Google Cloud VM
# This script will set up the entire application

set -e

echo "=========================================="
echo "24Rx Deployment Starting..."
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Update System
echo -e "${BLUE}[1/12] Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Step 2: Install Node.js
echo -e "${BLUE}[2/12] Installing Node.js 18...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Step 3: Install PostgreSQL
echo -e "${BLUE}[3/12] Installing PostgreSQL...${NC}"
sudo apt install -y postgresql postgresql-contrib

# Step 4: Start PostgreSQL
echo -e "${BLUE}[4/12] Starting PostgreSQL...${NC}"
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Step 5: Create Database and User
echo -e "${BLUE}[5/12] Creating database and user...${NC}"
sudo -u postgres psql << EOF
CREATE DATABASE 24rx_db;
CREATE USER 24rx_user WITH PASSWORD '24rx_secure_password_2024';
ALTER ROLE 24rx_user SET client_encoding TO 'utf8';
ALTER ROLE 24rx_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE 24rx_user SET default_transaction_deferrable TO on;
ALTER ROLE 24rx_user SET default_transaction_read_only TO off;
GRANT ALL PRIVILEGES ON DATABASE 24rx_db TO 24rx_user;
\q
EOF

# Step 6: Install Nginx
echo -e "${BLUE}[6/12] Installing Nginx...${NC}"
sudo apt install -y nginx

# Step 7: Clone Repository
echo -e "${BLUE}[7/12] Cloning repository...${NC}"
cd ~
git clone https://github.com/skdas20/TwentyFourRx.git 24rx
cd 24rx

# Step 8: Setup Backend
echo -e "${BLUE}[8/12] Setting up backend...${NC}"
cd backend

# Create .env file
cat > .env << 'ENVFILE'
DATABASE_URL="postgresql://24rx_user:24rx_secure_password_2024@localhost:5432/24rx_db"
JWT_SECRET="your-super-secret-jwt-key-min-32-characters-long-2024"
NODE_ENV="production"
PORT=8080
MINIO_ENDPOINT="http://localhost:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="receipts"
ENVFILE

# Install dependencies
npm install

# Run Prisma migrations
npx prisma migrate deploy

# Build backend
npm run build

cd ..

# Step 9: Setup Frontend
echo -e "${BLUE}[9/12] Setting up frontend...${NC}"
cd frontend

# Create .env.local file
cat > .env.local << 'ENVFILE'
NEXT_PUBLIC_API_URL="http://35.225.19.249:8080/api/v1"
ENVFILE

# Install dependencies
npm install

# Build frontend
npm run build

cd ..

# Step 10: Setup MinIO
echo -e "${BLUE}[10/12] Setting up MinIO...${NC}"
mkdir -p ~/minio/data
cd ~
wget -q https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio

# Step 11: Create Systemd Services
echo -e "${BLUE}[11/12] Creating systemd services...${NC}"

# Backend service
sudo tee /etc/systemd/system/24rx-backend.service > /dev/null << 'SERVICE'
[Unit]
Description=24Rx Backend
After=network.target postgresql.service

[Service]
Type=simple
User=admin_24rx
WorkingDirectory=/home/admin_24rx/24rx/backend
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
SERVICE

# Frontend service
sudo tee /etc/systemd/system/24rx-frontend.service > /dev/null << 'SERVICE'
[Unit]
Description=24Rx Frontend
After=network.target

[Service]
Type=simple
User=admin_24rx
WorkingDirectory=/home/admin_24rx/24rx/frontend
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE

# MinIO service
sudo tee /etc/systemd/system/24rx-minio.service > /dev/null << 'SERVICE'
[Unit]
Description=MinIO Storage
After=network.target

[Service]
Type=simple
User=admin_24rx
WorkingDirectory=/home/admin_24rx
ExecStart=/home/admin_24rx/minio server /home/admin_24rx/minio/data --console-address ":9001"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE

# Reload systemd
sudo systemctl daemon-reload

# Step 12: Configure Nginx
echo -e "${BLUE}[12/12] Configuring Nginx...${NC}"

sudo tee /etc/nginx/sites-available/24rx > /dev/null << 'NGINX'
upstream backend {
    server localhost:8080;
}

upstream frontend {
    server localhost:3000;
}

upstream minio {
    server localhost:9000;
}

upstream minio_console {
    server localhost:9001;
}

server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # MinIO API
    location /minio/ {
        proxy_pass http://minio/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # MinIO Console
    location /minio-console/ {
        proxy_pass http://minio_console/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/24rx /etc/nginx/sites-enabled/24rx
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# Enable and start services
echo -e "${GREEN}Starting services...${NC}"
sudo systemctl enable 24rx-backend 24rx-frontend 24rx-minio
sudo systemctl start 24rx-backend 24rx-frontend 24rx-minio

# Wait for services to start
sleep 5

# Check status
echo -e "${GREEN}=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Service Status:"
sudo systemctl status 24rx-backend --no-pager | grep Active
sudo systemctl status 24rx-frontend --no-pager | grep Active
sudo systemctl status 24rx-minio --no-pager | grep Active
echo ""
echo "Access your application:"
echo -e "${GREEN}Frontend: http://35.225.19.249${NC}"
echo -e "${GREEN}Backend API: http://35.225.19.249/api/v1${NC}"
echo -e "${GREEN}MinIO Console: http://35.225.19.249:9001${NC}"
echo ""
echo "Database: 24rx_db"
echo "DB User: 24rx_user"
echo "MinIO User: minioadmin"
echo ""
echo "View logs:"
echo "  Backend: sudo journalctl -u 24rx-backend -f"
echo "  Frontend: sudo journalctl -u 24rx-frontend -f"
echo "  MinIO: sudo journalctl -u 24rx-minio -f"
echo "=========================================="

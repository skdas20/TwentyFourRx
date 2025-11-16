#!/bin/bash

# Update 24Rx Server Configuration and Restart Services
# This script updates the backend and frontend with the latest code and restarts services

set -e

echo "=========================================="
echo "24Rx Server Update Starting..."
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to project directory
cd ~/24rx

# Step 1: Pull latest code
echo -e "${BLUE}[1/6] Pulling latest code from GitHub...${NC}"
git pull origin main

# Step 2: Update Backend
echo -e "${BLUE}[2/6] Updating backend...${NC}"
cd backend

# Update .env with correct database credentials
cat > .env << 'ENVFILE'
# Server
PORT=8080
NODE_ENV=production

# Database
DATABASE_URL=postgresql://24rx_user:24rx_secure_password_2024@localhost:5432/24rx_db

# JWT
JWT_SECRET=24rx_super_secret_jwt_key_change_in_production
JWT_EXPIRATION=15m
REFRESH_TOKEN_EXPIRES_SECONDS=2592000

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Admin Secret Key (for creating admins via secret endpoint)
ADMIN_SECRET_KEY=24rx_admin_secret_key_2024

# Gmail (for sending emails)
GMAIL_USER=madandas15822@gmail.com
GMAIL_APP_PASSWORD=edxczareyraixbwi

# Frontend URL (for email links)
FRONTEND_URL=https://24rxexchange.com

# MinIO (S3-compatible storage)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_USE_SSL=false

# AWS S3 (Alternative - not used when MinIO is active)
S3_BUCKET=medtrade-files
S3_REGION=ap-south-1
S3_ACCESS_KEY=
S3_SECRET_KEY=

# Hold Auto-delivery (days)
HOLD_AUTO_DELIVERY_DAYS=10

# Pagination
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100
ENVFILE

# Install dependencies
npm install

# Run Prisma migrations
npx prisma migrate deploy

# Build backend
npm run build

cd ..

# Step 3: Update Frontend
echo -e "${BLUE}[3/6] Updating frontend...${NC}"
cd frontend

# Update .env.local with correct API URL
cat > .env.local << 'ENVFILE'
# API
NEXT_PUBLIC_API_URL=http://35.225.19.249:8080/api/v1

# NextAuth
NEXTAUTH_URL=http://35.225.19.249
NEXTAUTH_SECRET=change_me_in_production_use_strong_random_string
ENVFILE

# Install dependencies
npm install

# Build frontend
npm run build

cd ..

# Step 4: Restart Backend Service
echo -e "${BLUE}[4/6] Restarting backend service...${NC}"
sudo systemctl restart 24rx-backend
sleep 3

# Step 5: Restart Frontend Service
echo -e "${BLUE}[5/6] Restarting frontend service...${NC}"
sudo systemctl restart 24rx-frontend
sleep 3

# Step 6: Check Service Status
echo -e "${BLUE}[6/6] Checking service status...${NC}"

echo ""
echo -e "${GREEN}=========================================="
echo "Update Complete!"
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
echo ""
echo "View logs:"
echo "  Backend: sudo journalctl -u 24rx-backend -f"
echo "  Frontend: sudo journalctl -u 24rx-frontend -f"
echo "=========================================="

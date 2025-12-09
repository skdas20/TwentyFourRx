#!/bin/bash

# Quick Fix for 502 Bad Gateway Error
# This script attempts to fix common issues causing 502 errors

set -e

echo "=========================================="
echo "24Rx Quick Fix for 502 Error"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

cd ~/24rx

# Step 1: Check and fix database migrations
echo -e "${BLUE}[1/5] Checking database migrations...${NC}"
cd backend
npx prisma migrate deploy
npx prisma generate
echo -e "${GREEN}✓ Database migrations applied${NC}"
cd ..

# Step 2: Rebuild backend
echo -e "${BLUE}[2/5] Rebuilding backend...${NC}"
cd backend
npm run build
echo -e "${GREEN}✓ Backend rebuilt${NC}"
cd ..

# Step 3: Stop all services
echo -e "${BLUE}[3/5] Stopping services...${NC}"
sudo systemctl stop 24rx-backend
sudo systemctl stop 24rx-frontend
sleep 2
echo -e "${GREEN}✓ Services stopped${NC}"

# Step 4: Start backend first
echo -e "${BLUE}[4/5] Starting backend...${NC}"
sudo systemctl start 24rx-backend
sleep 5

# Check if backend started
if sudo systemctl is-active --quiet 24rx-backend; then
    echo -e "${GREEN}✓ Backend started successfully${NC}"
else
    echo -e "${RED}✗ Backend failed to start${NC}"
    echo "Checking logs..."
    sudo journalctl -u 24rx-backend -n 30 --no-pager
    exit 1
fi

# Step 5: Start frontend
echo -e "${BLUE}[5/5] Starting frontend...${NC}"
sudo systemctl start 24rx-frontend
sleep 3

if sudo systemctl is-active --quiet 24rx-frontend; then
    echo -e "${GREEN}✓ Frontend started successfully${NC}"
else
    echo -e "${RED}✗ Frontend failed to start${NC}"
    echo "Checking logs..."
    sudo journalctl -u 24rx-frontend -n 30 --no-pager
fi

echo ""
echo -e "${GREEN}=========================================="
echo "Fix Complete!"
echo "=========================================="
echo ""
echo "Service Status:"
sudo systemctl status 24rx-backend --no-pager | grep Active
sudo systemctl status 24rx-frontend --no-pager | grep Active
echo ""
echo "Testing backend API:"
curl -s http://localhost:8080/api/v1/health || echo "Backend not responding"
echo ""
echo ""
echo "If still getting 502, check logs:"
echo "  sudo journalctl -u 24rx-backend -f"
echo "=========================================="

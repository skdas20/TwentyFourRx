#!/bin/bash

# Install Redis on GCP VM
set -e

echo "=========================================="
echo "Installing Redis..."
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Update system
echo -e "${BLUE}[1/4] Updating system packages...${NC}"
sudo apt update

# Step 2: Install Redis
echo -e "${BLUE}[2/4] Installing Redis...${NC}"
sudo apt install -y redis-server

# Step 3: Start Redis
echo -e "${BLUE}[3/4] Starting Redis service...${NC}"
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Step 4: Verify Redis is running
echo -e "${BLUE}[4/4] Verifying Redis installation...${NC}"
redis-cli ping

echo ""
echo -e "${GREEN}=========================================="
echo "Redis Installation Complete!"
echo "=========================================="
echo ""
echo "Redis Status:"
sudo systemctl status redis-server --no-pager | grep Active
echo ""
echo "Redis is running on localhost:6379"
echo "View logs: sudo journalctl -u redis-server -f"
echo "=========================================="

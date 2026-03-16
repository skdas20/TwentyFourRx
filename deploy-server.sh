#!/bin/bash
# Deploy latest changes to server

echo "=== Deploying to 24rxexchange.com ==="

# Pull latest code
cd /home/admin_24rx/24rx
sudo chown -R admin_24rx:admin_24rx .
git reset --hard
git pull

# Backend deployment
echo "=== Building backend ==="
cd backend
npm install
npm run build

# Stop old backend process
echo "=== Restarting backend ==="
pkill -f "node.*main"
nohup npm run start > backend.log 2>&1 &

# Frontend deployment
echo "=== Building frontend ==="
cd ../frontend
npm install
npm run build

# Deploy frontend build
echo "=== Deploying frontend ==="
sudo rm -rf /var/www/24rx/frontend
sudo mkdir -p /var/www/24rx
sudo cp -r .next /var/www/24rx/frontend
sudo chown -R www-data:www-data /var/www/24rx

# Reload nginx
echo "=== Reloading nginx ==="
sudo systemctl reload nginx

echo "=== Deployment complete ==="

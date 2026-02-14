#!/bin/bash

# Manual Courier Dashboard Deployment Fix
echo "🚀 Deploying Courier Dashboard..."

# Navigate to the repo
cd ~/24rx

# Pull latest changes
echo "📥 Pulling latest code..."
git pull origin main

# Ensure courier directory exists and has correct files
echo "📁 Checking courier files..."
ls -la ~/24rx/courier/

# Copy nginx config to sites-available
echo "🌐 Updating nginx configuration..."
sudo cp ~/24rx/courier/nginx-courier.conf /etc/nginx/sites-available/courier

# Create symlink if it doesn't exist
if [ ! -L /etc/nginx/sites-enabled/courier ]; then
    echo "🔗 Creating nginx symlink..."
    sudo ln -s /etc/nginx/sites-available/courier /etc/nginx/sites-enabled/courier
fi

# Set correct permissions for courier files
echo "🔐 Setting file permissions..."
sudo chown -R www-data:www-data ~/24rx/courier/
sudo chmod 755 ~/24rx/courier/
sudo chmod 644 ~/24rx/courier/index.html
sudo chmod 644 ~/24rx/courier/styles.css
sudo chmod 644 ~/24rx/courier/app.js

# Test nginx configuration
echo "✅ Testing nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    # Reload nginx
    echo "🔄 Reloading nginx..."
    sudo systemctl reload nginx
    echo "✨ Deployment complete!"
    echo "🌐 Visit: https://track.24rxexchange.com"
else
    echo "❌ Nginx configuration test failed!"
    exit 1
fi

# Show file listing
echo ""
echo "📋 Deployed files:"
ls -lh ~/24rx/courier/

#!/bin/bash

# Fix Courier Dashboard Deployment
echo "🔧 Fixing Courier Dashboard Deployment..."

# Check if files exist
echo "📁 Checking courier files..."
ls -la ~/24rx/courier/

# Check nginx config
echo "🌐 Checking nginx configuration..."
sudo cat /etc/nginx/sites-available/courier

# Check if files are readable
echo "📄 Checking file permissions..."
ls -la ~/24rx/courier/*.html
ls -la ~/24rx/courier/*.css
ls -la ~/24rx/courier/*.js

# Fix permissions if needed
echo "🔐 Setting correct permissions..."
sudo chown -R www-data:www-data ~/24rx/courier/
sudo chmod -R 755 ~/24rx/courier/
sudo chmod 644 ~/24rx/courier/*.html
sudo chmod 644 ~/24rx/courier/*.css
sudo chmod 644 ~/24rx/courier/*.js

# Test nginx config
echo "✅ Testing nginx configuration..."
sudo nginx -t

# Reload nginx
echo "🔄 Reloading nginx..."
sudo systemctl reload nginx

echo "✨ Done! Check https://track.24rxexchange.com/"

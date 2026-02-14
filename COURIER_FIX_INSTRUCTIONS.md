# Courier Dashboard Deployment Fix

## Problem
The courier dashboard HTML loads but CSS and JS files return 404 errors.

## Root Cause
The files exist in the git repo on the server but aren't being served properly by nginx.

## Solution
Run these commands on the server:

```bash
# SSH into server
ssh -i 24rx_deploy_key admin_24rx@35.225.19.249

# Once connected, run:
cd ~/24rx
git pull origin main

# Check if files exist
ls -la ~/24rx/courier/

# You should see:
# - index.html
# - styles.css
# - app.js
# - nginx-courier.conf

# Update nginx config
sudo cp ~/24rx/courier/nginx-courier.conf /etc/nginx/sites-available/courier

# Create symlink if needed
sudo ln -sf /etc/nginx/sites-available/courier /etc/nginx/sites-enabled/courier

# Fix permissions
sudo chown -R www-data:www-data ~/24rx/courier/
sudo chmod 755 ~/24rx/courier/
sudo chmod 644 ~/24rx/courier/*.html
sudo chmod 644 ~/24rx/courier/*.css
sudo chmod 644 ~/24rx/courier/*.js

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx

# Check if it works
curl -I https://track.24rxexchange.com/styles.css
```

## Quick One-Liner
```bash
ssh -i 24rx_deploy_key admin_24rx@35.225.19.249 "cd ~/24rx && git pull && sudo cp ~/24rx/courier/nginx-courier.conf /etc/nginx/sites-available/courier && sudo ln -sf /etc/nginx/sites-available/courier /etc/nginx/sites-enabled/courier && sudo chown -R www-data:www-data ~/24rx/courier/ && sudo chmod 755 ~/24rx/courier/ && sudo chmod 644 ~/24rx/courier/*.{html,css,js} && sudo nginx -t && sudo systemctl reload nginx"
```

## Verify
After running, check:
- https://track.24rxexchange.com/ - Should show login page
- https://track.24rxexchange.com/styles.css - Should return CSS content
- https://track.24rxexchange.com/app.js - Should return JS content

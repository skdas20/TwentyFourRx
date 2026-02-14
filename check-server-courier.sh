#!/bin/bash
# Check courier deployment status on server

echo "=== Checking Courier Dashboard Deployment ==="
echo ""

echo "1. Checking if courier directory exists:"
ls -la ~/24rx/courier/ 2>&1

echo ""
echo "2. Checking nginx sites-enabled:"
ls -la /etc/nginx/sites-enabled/ | grep courier

echo ""
echo "3. Checking nginx config:"
sudo cat /etc/nginx/sites-available/courier 2>&1 | head -20

echo ""
echo "4. Checking nginx error log:"
sudo tail -20 /var/log/nginx/courier-error.log 2>&1

echo ""
echo "5. Testing nginx config:"
sudo nginx -t 2>&1

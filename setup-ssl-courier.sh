#!/bin/bash

# SSL Setup Script for Courier Dashboard
# Run this after DNS is properly configured

echo "🔒 Setting up SSL for track.24rxexchange.in"
echo "============================================"
echo ""

# Check if DNS is resolving
echo "Checking DNS resolution..."
if nslookup track.24rxexchange.in | grep -q "35.225.19.249"; then
    echo "✅ DNS is resolving correctly"
else
    echo "❌ DNS is not resolving yet. Please wait or check your DNS configuration."
    echo ""
    echo "Expected DNS record:"
    echo "  Type: A"
    echo "  Name: track"
    echo "  Value: 35.225.19.249"
    echo ""
    exit 1
fi

echo ""
echo "Installing SSL certificate..."
sudo certbot --nginx -d track.24rxexchange.in \
    --non-interactive \
    --agree-tos \
    --email admin@24rxexchange.in \
    --redirect

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SSL certificate installed successfully!"
    echo ""
    echo "Your courier dashboard is now accessible at:"
    echo "🌐 https://track.24rxexchange.in"
    echo ""
    echo "Login credentials:"
    echo "  Email: courier@24rx.in"
    echo "  Password: courier123"
    echo ""
else
    echo ""
    echo "❌ SSL installation failed. Please check:"
    echo "  1. DNS is properly configured"
    echo "  2. Port 80 and 443 are open"
    echo "  3. Domain is accessible from internet"
    echo ""
fi

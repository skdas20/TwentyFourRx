#!/bin/bash

echo "🌐 Setting up API subdomain: api.24rxexchange.com"

# Copy nginx config
echo "📝 Copying nginx configuration..."
sudo cp ~/24rx/courier/nginx-api.conf /etc/nginx/sites-available/api

# Create symlink
echo "🔗 Creating symlink..."
sudo ln -sf /etc/nginx/sites-available/api /etc/nginx/sites-enabled/api

# Test nginx config
echo "✅ Testing nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "🔄 Reloading nginx..."
    sudo systemctl reload nginx
    
    echo ""
    echo "✨ Nginx configured successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Add DNS A record: api.24rxexchange.com -> 35.225.19.249"
    echo "2. Wait for DNS propagation (check with: nslookup api.24rxexchange.com)"
    echo "3. Run: sudo certbot --nginx -d api.24rxexchange.com"
    echo ""
else
    echo "❌ Nginx configuration test failed!"
    exit 1
fi

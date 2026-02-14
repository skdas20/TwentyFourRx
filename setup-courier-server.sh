#!/bin/bash

# 24Rx Courier Dashboard - Server Setup Script
# Run this on the server after pulling the code

set -e

echo "🚚 24Rx Courier Dashboard Setup"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as admin_24rx
if [ "$USER" != "admin_24rx" ]; then
    echo -e "${YELLOW}Warning: This script should be run as admin_24rx user${NC}"
    echo "Current user: $USER"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${BLUE}Step 1: Setting up courier directory...${NC}"
cd ~/24rx
mkdir -p courier
echo -e "${GREEN}✓ Directory created${NC}"
echo ""

echo -e "${BLUE}Step 2: Setting permissions...${NC}"
sudo chown -R www-data:www-data ~/24rx/courier
sudo chmod -R 755 ~/24rx/courier
echo -e "${GREEN}✓ Permissions set${NC}"
echo ""

echo -e "${BLUE}Step 3: Setting up Nginx configuration...${NC}"
sudo cp ~/24rx/courier/nginx-courier.conf /etc/nginx/sites-available/courier
sudo ln -sf /etc/nginx/sites-available/courier /etc/nginx/sites-enabled/
echo -e "${GREEN}✓ Nginx config copied${NC}"
echo ""

echo -e "${BLUE}Step 4: Testing Nginx configuration...${NC}"
sudo nginx -t
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
else
    echo -e "${YELLOW}⚠ Nginx configuration has errors. Please fix before continuing.${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}Step 5: Reloading Nginx...${NC}"
sudo systemctl reload nginx
echo -e "${GREEN}✓ Nginx reloaded${NC}"
echo ""

echo -e "${BLUE}Step 6: Running database migration...${NC}"
cd ~/24rx/backend
npx prisma db push
echo -e "${GREEN}✓ Database updated${NC}"
echo ""

echo -e "${BLUE}Step 7: Restarting backend service...${NC}"
sudo systemctl restart 24rx-backend
sleep 3
sudo systemctl status 24rx-backend --no-pager | head -n 10
echo -e "${GREEN}✓ Backend restarted${NC}"
echo ""

echo -e "${BLUE}Step 8: Setting up SSL certificate...${NC}"
echo "Run the following command to get SSL certificate:"
echo -e "${YELLOW}sudo certbot --nginx -d track.24rxexchange.in${NC}"
echo ""
read -p "Do you want to run certbot now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo certbot --nginx -d track.24rxexchange.in
    echo -e "${GREEN}✓ SSL certificate installed${NC}"
else
    echo -e "${YELLOW}⚠ Remember to run certbot manually later${NC}"
fi
echo ""

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Your courier dashboard should now be accessible at:"
echo -e "${BLUE}https://track.24rxexchange.in${NC}"
echo ""
echo "Next steps:"
echo "1. Create a courier user account (see COURIER_SETUP_GUIDE.md)"
echo "2. Test the login at https://track.24rxexchange.in"
echo "3. Verify API endpoints are working"
echo ""
echo "Useful commands:"
echo "  - Check nginx logs: sudo tail -f /var/log/nginx/courier-access.log"
echo "  - Check backend logs: sudo journalctl -u 24rx-backend -f"
echo "  - Restart backend: sudo systemctl restart 24rx-backend"
echo "  - Reload nginx: sudo systemctl reload nginx"
echo ""
echo -e "${GREEN}Happy delivering! 🚚${NC}"

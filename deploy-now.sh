#!/bin/bash
ssh -i 24rx_deploy_key -o StrictHostKeyChecking=no admin_24rx@35.225.19.249 << 'EOF'
cd /home/admin_24rx/24rx
sudo chown -R admin_24rx:admin_24rx .
git reset --hard
git pull
cd backend
npm install
npm run build
sudo systemctl restart backend
cd ../frontend
npm install
npm run build
sudo rm -rf /var/www/24rx/frontend
sudo cp -r .next /var/www/24rx/frontend
sudo chown -R www-data:www-data /var/www/24rx
sudo systemctl reload nginx
echo "Deployment complete!"
EOF

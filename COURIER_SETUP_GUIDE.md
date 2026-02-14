# 🚚 Courier Dashboard Setup Guide

## Overview
This guide will help you set up the courier partner dashboard at `track.24rxexchange.in`.

## Prerequisites
- Server access via SSH (admin_24rx@35.225.19.249)
- Domain `track.24rxexchange.in` pointed to server IP
- Existing 24Rx backend and frontend running

## Setup Steps

### 1. DNS Configuration
Point your subdomain to the server:
```
Type: A Record
Name: track
Value: 35.225.19.249
TTL: 3600
```

### 2. SSH into Server
```bash
ssh admin_24rx@35.225.19.249 -i 24rx_deploy_key
```

### 3. Setup Nginx Configuration
```bash
# Copy nginx config
sudo cp ~/24rx/courier/nginx-courier.conf /etc/nginx/sites-available/courier

# Create symbolic link
sudo ln -s /etc/nginx/sites-available/courier /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 4. Setup SSL Certificate with Certbot
```bash
# Install certbot if not already installed
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d track.24rxexchange.in

# Certbot will automatically configure SSL in nginx
```

### 5. Set Proper Permissions
```bash
# Set ownership
sudo chown -R www-data:www-data ~/24rx/courier

# Set permissions
sudo chmod -R 755 ~/24rx/courier
```

### 6. Update Backend Database
```bash
cd ~/24rx/backend

# Run the migration
npx prisma db push

# Or run migration manually
npx prisma migrate deploy
```

### 7. Restart Backend Service
```bash
# Restart backend to load new routes
sudo systemctl restart 24rx-backend

# Check status
sudo systemctl status 24rx-backend
```

### 8. Test the Setup
```bash
# Test nginx
curl -I https://track.24rxexchange.in

# Should return 200 OK
```

## Create First Courier User

### Option 1: Via Database (Recommended)
```bash
# Connect to PostgreSQL
sudo -u postgres psql 24rx_db

# Create courier user
INSERT INTO users (name, email, password, role_code, status, is_active)
VALUES (
    'Test Courier',
    'courier@24rx.in',
    '$2b$10$YourHashedPasswordHere',  -- Use bcrypt to hash password
    'COURIER',
    'APPROVED',
    true
);

# Exit
\q
```

### Option 2: Via Backend API
Use the existing registration endpoint and then update the role:
```bash
# 1. Register normally via API
# 2. Update role in database:
UPDATE users SET role_code = 'COURIER', status = 'APPROVED' WHERE email = 'courier@24rx.in';
```

## Testing Checklist

- [ ] DNS resolves to correct IP
- [ ] HTTPS works (SSL certificate installed)
- [ ] Courier dashboard loads at https://track.24rxexchange.in
- [ ] Login page displays correctly
- [ ] Can login with courier credentials
- [ ] Dashboard shows delivery list
- [ ] Backend API endpoints respond correctly
- [ ] Status updates work
- [ ] Real-time data loads

## Troubleshooting

### Issue: 502 Bad Gateway
```bash
# Check backend status
sudo systemctl status 24rx-backend

# Check backend logs
sudo journalctl -u 24rx-backend -n 50
```

### Issue: 404 Not Found
```bash
# Check nginx configuration
sudo nginx -t

# Check file permissions
ls -la ~/24rx/courier/

# Reload nginx
sudo systemctl reload nginx
```

### Issue: SSL Certificate Error
```bash
# Renew certificate
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

### Issue: CORS Errors
Update backend CORS settings in `backend/src/main.ts`:
```typescript
app.enableCors({
  origin: [
    'https://24rxexchange.in',
    'https://www.24rxexchange.in',
    'https://track.24rxexchange.in',  // Add this
    'http://localhost:3000',
  ],
  credentials: true,
});
```

## API Endpoints

### Courier Endpoints
- `GET /delivery-requests/courier/my` - Get assigned deliveries
- `POST /delivery-requests/courier/:id/status` - Update delivery status
- `POST /delivery-requests/courier/:id/proof` - Upload delivery proof

### Admin Endpoints
- `POST /delivery-requests/:id/assign-courier` - Assign courier to delivery

## Monitoring

### Check Nginx Logs
```bash
# Access logs
sudo tail -f /var/log/nginx/courier-access.log

# Error logs
sudo tail -f /var/log/nginx/courier-error.log
```

### Check Backend Logs
```bash
sudo journalctl -u 24rx-backend -f
```

## Maintenance

### Update Courier Dashboard
```bash
cd ~/24rx
git pull origin main
sudo chown -R www-data:www-data ~/24rx/courier
sudo chmod -R 755 ~/24rx/courier
sudo systemctl reload nginx
```

### Backup
```bash
# Backup courier files
tar -czf courier-backup-$(date +%Y%m%d).tar.gz ~/24rx/courier/
```

## Security Notes

1. Always use HTTPS in production
2. Keep SSL certificates up to date (Certbot auto-renews)
3. Regularly update nginx and system packages
4. Monitor access logs for suspicious activity
5. Use strong passwords for courier accounts
6. Implement rate limiting if needed

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review nginx and backend logs
3. Verify DNS and SSL configuration
4. Test API endpoints directly with curl/Postman

## Next Steps

After setup:
1. Create courier user accounts
2. Test the complete delivery flow
3. Train courier partners on using the dashboard
4. Monitor system performance
5. Gather feedback and iterate

---

**Setup Complete!** 🎉

Your courier dashboard should now be live at https://track.24rxexchange.in

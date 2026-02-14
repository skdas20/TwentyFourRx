# 🚀 Courier Dashboard - Deployment Checklist

## Pre-Deployment

### 1. Code Review
- [ ] All files created and committed
- [ ] No syntax errors in HTML/CSS/JS
- [ ] Backend compiles successfully
- [ ] Database migration tested locally
- [ ] API endpoints tested with Postman

### 2. Configuration
- [ ] API_BASE_URL in courier/app.js is correct
- [ ] CORS settings in backend include track.24rxexchange.in
- [ ] Environment variables set in backend/.env
- [ ] Nginx config has correct domain name

### 3. DNS Setup
- [ ] A record created: track → 35.225.19.249
- [ ] DNS propagation verified (use dig or nslookup)
- [ ] TTL set appropriately (3600 recommended)

---

## Deployment Steps

### Step 1: Push to GitHub
```bash
git add -A
git commit -m "feat: Add courier dashboard system"
git push origin main
```
- [ ] Code pushed to main branch
- [ ] GitHub Actions workflow triggered
- [ ] All workflows completed successfully

### Step 2: SSH into Server
```bash
ssh admin_24rx@35.225.19.249 -i 24rx_deploy_key
```
- [ ] Successfully connected to server
- [ ] User is admin_24rx
- [ ] In /home/admin_24rx directory

### Step 3: Pull Latest Code
```bash
cd ~/24rx
git pull origin main
```
- [ ] Latest code pulled
- [ ] Courier folder exists
- [ ] All files present

### Step 4: Run Setup Script
```bash
chmod +x setup-courier-server.sh
./setup-courier-server.sh
```
- [ ] Script executed successfully
- [ ] Permissions set correctly
- [ ] Nginx config copied
- [ ] Nginx reloaded
- [ ] Database migrated
- [ ] Backend restarted

### Step 5: Setup SSL Certificate
```bash
sudo certbot --nginx -d track.24rxexchange.in
```
- [ ] Certificate obtained
- [ ] Nginx auto-configured
- [ ] HTTPS working
- [ ] HTTP redirects to HTTPS

### Step 6: Verify Deployment
```bash
# Test nginx
curl -I https://track.24rxexchange.in

# Check logs
sudo tail -f /var/log/nginx/courier-access.log
```
- [ ] Returns 200 OK
- [ ] Dashboard loads in browser
- [ ] No errors in logs

---

## Post-Deployment

### 1. Create Courier User

#### Option A: Via Database
```bash
sudo -u postgres psql 24rx_db
```
```sql
-- Generate password hash first (use bcrypt online tool or Node.js)
-- Example: bcrypt.hash('password123', 10)

INSERT INTO users (name, email, password, role_code, status, is_active)
VALUES (
    'Test Courier',
    'courier@24rx.in',
    '$2b$10$YourHashedPasswordHere',
    'COURIER',
    'APPROVED',
    true
);

-- Verify
SELECT id, name, email, role_code, status FROM users WHERE role_code = 'COURIER';

\q
```
- [ ] User created successfully
- [ ] Role is COURIER
- [ ] Status is APPROVED
- [ ] is_active is true

#### Option B: Via API + Database Update
```bash
# 1. Register via API (use Postman or curl)
# 2. Update role in database
UPDATE users SET role_code = 'COURIER', status = 'APPROVED' WHERE email = 'courier@24rx.in';
```

### 2. Test Login
- [ ] Go to https://track.24rxexchange.in
- [ ] Enter courier credentials
- [ ] Login successful
- [ ] Dashboard displays

### 3. Test Functionality

#### Dashboard
- [ ] Stats cards display (may show 0)
- [ ] Delivery table visible
- [ ] Search box works
- [ ] Filter dropdown works
- [ ] Refresh button works

#### API Integration
- [ ] GET /delivery-requests/courier/my works
- [ ] Returns empty array or deliveries
- [ ] No CORS errors
- [ ] Authentication working

### 4. Create Test Delivery (Optional)
```bash
# In PostgreSQL
-- First, create a test delivery request
-- (This requires existing inventory, orders, etc.)
-- Or use the admin panel to create one
```
- [ ] Test delivery created
- [ ] Appears in courier dashboard
- [ ] Can view details
- [ ] Can update status

### 5. Test Complete Flow
- [ ] Courier logs in
- [ ] Views delivery
- [ ] Updates to "Picked Up"
- [ ] Updates to "Out for Delivery"
- [ ] Updates to "Delivered"
- [ ] OTP generated
- [ ] Buyer receives OTP email
- [ ] Buyer confirms with OTP
- [ ] Status changes to "Delivered"

---

## Verification Checklist

### Frontend
- [ ] Dashboard loads at https://track.24rxexchange.in
- [ ] Loading screen shows for 2 seconds
- [ ] Animated logo displays correctly
- [ ] Login page appears
- [ ] Styling is correct (bluish theme)
- [ ] Responsive on mobile
- [ ] No console errors

### Backend
- [ ] API endpoints respond
- [ ] Authentication works
- [ ] CORS configured correctly
- [ ] Database queries work
- [ ] File uploads work (if tested)
- [ ] Notifications sent

### Database
- [ ] COURIER role exists
- [ ] New columns added to delivery_requests
- [ ] Indexes created
- [ ] Migration successful
- [ ] No data loss

### Nginx
- [ ] Configuration valid
- [ ] SSL certificate installed
- [ ] HTTPS working
- [ ] HTTP redirects
- [ ] Logs being written

### CI/CD
- [ ] Workflow file exists
- [ ] Triggers on courier/ changes
- [ ] Deploys successfully
- [ ] Sets permissions
- [ ] Reloads nginx

---

## Monitoring Setup

### 1. Log Monitoring
```bash
# Create log monitoring script
cat > ~/monitor-courier.sh << 'EOF'
#!/bin/bash
echo "=== Courier Dashboard Logs ==="
echo ""
echo "Nginx Access Log (last 10):"
sudo tail -n 10 /var/log/nginx/courier-access.log
echo ""
echo "Nginx Error Log (last 10):"
sudo tail -n 10 /var/log/nginx/courier-error.log
echo ""
echo "Backend Status:"
sudo systemctl status 24rx-backend --no-pager | head -n 10
EOF

chmod +x ~/monitor-courier.sh
```
- [ ] Monitoring script created
- [ ] Can view logs easily

### 2. Health Check
```bash
# Create health check script
cat > ~/check-courier-health.sh << 'EOF'
#!/bin/bash
echo "Checking courier dashboard health..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://track.24rxexchange.in)
if [ $HTTP_CODE -eq 200 ]; then
    echo "✅ Dashboard is UP (HTTP $HTTP_CODE)"
else
    echo "❌ Dashboard is DOWN (HTTP $HTTP_CODE)"
fi
EOF

chmod +x ~/check-courier-health.sh
```
- [ ] Health check script created
- [ ] Returns 200 OK

### 3. Setup Cron Job (Optional)
```bash
# Add to crontab for hourly health check
crontab -e

# Add this line:
0 * * * * /home/admin_24rx/check-courier-health.sh >> /home/admin_24rx/courier-health.log 2>&1
```
- [ ] Cron job added (optional)
- [ ] Health checks running

---

## Rollback Plan

### If Something Goes Wrong

#### 1. Rollback Nginx
```bash
sudo rm /etc/nginx/sites-enabled/courier
sudo nginx -t
sudo systemctl reload nginx
```

#### 2. Rollback Database
```bash
cd ~/24rx/backend
# Revert migration if needed
npx prisma migrate resolve --rolled-back 20250215000000_add_courier_system
```

#### 3. Rollback Code
```bash
cd ~/24rx
git log --oneline  # Find previous commit
git reset --hard <commit-hash>
git push -f origin main  # Only if necessary
```

#### 4. Restart Services
```bash
sudo systemctl restart 24rx-backend
sudo systemctl restart nginx
```

---

## Success Criteria

### Must Have (Critical)
- [x] Dashboard accessible at track.24rxexchange.in
- [x] HTTPS working
- [x] Login functional
- [x] API endpoints working
- [x] Database updated
- [x] No critical errors

### Should Have (Important)
- [ ] Courier user created
- [ ] Test delivery working
- [ ] Status updates working
- [ ] OTP generation working
- [ ] Notifications working
- [ ] Mobile responsive

### Nice to Have (Optional)
- [ ] Monitoring setup
- [ ] Health checks
- [ ] Documentation shared
- [ ] Courier training done
- [ ] Feedback collected

---

## Post-Launch Tasks

### Week 1
- [ ] Monitor logs daily
- [ ] Check for errors
- [ ] Gather courier feedback
- [ ] Fix any bugs
- [ ] Update documentation

### Week 2-4
- [ ] Analyze usage patterns
- [ ] Optimize performance
- [ ] Add requested features
- [ ] Train more couriers
- [ ] Scale if needed

### Month 2+
- [ ] Review metrics
- [ ] Plan enhancements
- [ ] Consider mobile app
- [ ] Expand features
- [ ] Celebrate success! 🎉

---

## Contact & Support

### If Issues Arise
1. Check logs first
2. Review this checklist
3. Consult COURIER_SETUP_GUIDE.md
4. Test API endpoints directly
5. Check GitHub Actions logs

### Emergency Contacts
- **Server Issues:** Check systemctl status
- **Database Issues:** Check PostgreSQL logs
- **Nginx Issues:** Check nginx error logs
- **Code Issues:** Review GitHub commits

---

## Final Sign-Off

### Deployment Team
- [ ] Developer: Code reviewed and tested
- [ ] DevOps: Server configured and deployed
- [ ] QA: Functionality tested
- [ ] Admin: User accounts created
- [ ] Manager: Approved for production

### Go-Live Approval
- [ ] All critical items checked
- [ ] Rollback plan understood
- [ ] Monitoring in place
- [ ] Team notified
- [ ] Ready to launch! 🚀

---

**Deployment Date:** _______________

**Deployed By:** _______________

**Status:** _______________

---

## Notes

Use this space for deployment notes, issues encountered, or special configurations:

```
[Your notes here]
```

---

**Good luck with your deployment!** 🎉

Remember: Take it step by step, test thoroughly, and don't hesitate to rollback if needed.

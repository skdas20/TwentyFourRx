# 502 Bad Gateway Troubleshooting Guide

## Quick Diagnosis

Run these commands on your server to diagnose the issue:

```bash
# 1. Check service status
sudo systemctl status 24rx-backend
sudo systemctl status 24rx-frontend

# 2. Check backend logs (most important!)
sudo journalctl -u 24rx-backend -n 100 --no-pager

# 3. Check if ports are listening
sudo netstat -tlnp | grep 8080
sudo netstat -tlnp | grep 3000
```

## Common Causes & Fixes

### 1. Backend Service Crashed

**Symptoms:** Backend service shows as "failed" or "inactive"

**Check:**
```bash
sudo journalctl -u 24rx-backend -n 50
```

**Common Errors:**

#### A. Database Migration Issues
```bash
cd ~/24rx/backend
npx prisma migrate deploy
npx prisma generate
npm run build
sudo systemctl restart 24rx-backend
```

#### B. Missing Dependencies
```bash
cd ~/24rx/backend
npm install
npm run build
sudo systemctl restart 24rx-backend
```

#### C. TypeScript Build Errors
```bash
cd ~/24rx/backend
rm -rf dist
npm run build
# Check for errors in output
sudo systemctl restart 24rx-backend
```

### 2. Database Connection Failed

**Check:**
```bash
sudo systemctl status postgresql
sudo -u postgres psql -d 24rx_db -c 'SELECT 1;'
```

**Fix:**
```bash
sudo systemctl start postgresql
```

### 3. Redis Connection Failed

**Check:**
```bash
sudo systemctl status redis
redis-cli ping
```

**Fix:**
```bash
sudo systemctl start redis
```

### 4. Out of Memory

**Check:**
```bash
free -h
df -h
```

**Fix:**
```bash
# Restart services to free memory
sudo systemctl restart 24rx-backend
sudo systemctl restart 24rx-frontend
```

### 5. Port Already in Use

**Check:**
```bash
sudo lsof -i :8080
sudo lsof -i :3000
```

**Fix:**
```bash
# Kill the process using the port
sudo kill -9 <PID>
sudo systemctl restart 24rx-backend
```

## Step-by-Step Recovery

### Option 1: Use Quick Fix Script

```bash
cd ~/24rx
chmod +x QUICK_FIX_502.sh
./QUICK_FIX_502.sh
```

### Option 2: Manual Recovery

```bash
# 1. Navigate to project
cd ~/24rx

# 2. Pull latest code
git pull origin main

# 3. Update backend
cd backend
npm install
npx prisma migrate deploy
npx prisma generate
npm run build

# 4. Update frontend
cd ../frontend
npm install
npm run build

# 5. Restart services
cd ..
sudo systemctl restart 24rx-backend
sleep 5
sudo systemctl restart 24rx-frontend

# 6. Check status
sudo systemctl status 24rx-backend
sudo systemctl status 24rx-frontend
```

## Checking Logs in Real-Time

```bash
# Backend logs
sudo journalctl -u 24rx-backend -f

# Frontend logs
sudo journalctl -u 24rx-frontend -f

# Both at once
sudo journalctl -u 24rx-backend -u 24rx-frontend -f
```

## Testing Backend API

```bash
# Health check
curl http://localhost:8080/api/v1/health

# If that works, test from outside
curl http://35.225.19.249:8080/api/v1/health
```

## Nginx Configuration Check

```bash
# Test nginx config
sudo nginx -t

# Restart nginx if needed
sudo systemctl restart nginx

# Check nginx logs
sudo tail -f /var/log/nginx/error.log
```

## Most Likely Issue After Deployment

The new modules (delivery-requests, news updates) might have caused:

1. **TypeScript compilation errors** - Check build output
2. **Missing Prisma migrations** - Run `npx prisma migrate deploy`
3. **Module import errors** - Check if all modules are properly exported

## Emergency Rollback

If nothing works, rollback to previous version:

```bash
cd ~/24rx
git log --oneline -5  # Find previous commit
git reset --hard <previous-commit-hash>
./UPDATE_SERVER.sh
```

## Get Help

If still stuck, provide these logs:

```bash
# Backend logs
sudo journalctl -u 24rx-backend -n 200 > backend-logs.txt

# Frontend logs
sudo journalctl -u 24rx-frontend -n 200 > frontend-logs.txt

# System info
free -h > system-info.txt
df -h >> system-info.txt
```

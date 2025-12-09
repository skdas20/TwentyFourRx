#!/bin/bash

# 24Rx Server Diagnostic Script
# Run this on the server to check what's wrong

echo "=========================================="
echo "24Rx Server Diagnostics"
echo "=========================================="
echo ""

# Check if services are running
echo "1. Service Status:"
echo "-------------------"
sudo systemctl status 24rx-backend --no-pager | head -20
echo ""
sudo systemctl status 24rx-frontend --no-pager | head -20
echo ""

# Check backend logs for errors
echo "2. Backend Logs (Last 50 lines):"
echo "-------------------"
sudo journalctl -u 24rx-backend -n 50 --no-pager
echo ""

# Check if backend port is listening
echo "3. Port Status:"
echo "-------------------"
echo "Backend (8080):"
sudo netstat -tlnp | grep 8080 || echo "Port 8080 NOT listening"
echo ""
echo "Frontend (3000):"
sudo netstat -tlnp | grep 3000 || echo "Port 3000 NOT listening"
echo ""

# Check database connection
echo "4. Database Status:"
echo "-------------------"
sudo systemctl status postgresql --no-pager | grep Active
echo ""

# Check Redis
echo "5. Redis Status:"
echo "-------------------"
sudo systemctl status redis --no-pager | grep Active || echo "Redis not running"
echo ""

# Check disk space
echo "6. Disk Space:"
echo "-------------------"
df -h | grep -E "Filesystem|/$"
echo ""

# Check memory
echo "7. Memory Usage:"
echo "-------------------"
free -h
echo ""

echo "=========================================="
echo "Quick Fixes:"
echo "=========================================="
echo "If backend crashed, try:"
echo "  1. Check logs: sudo journalctl -u 24rx-backend -n 100"
echo "  2. Restart: sudo systemctl restart 24rx-backend"
echo "  3. Check database: sudo -u postgres psql -d 24rx_db -c 'SELECT 1;'"
echo ""
echo "If out of memory:"
echo "  1. Restart services: sudo systemctl restart 24rx-backend 24rx-frontend"
echo "  2. Check PM2 if used: pm2 list"
echo ""
echo "=========================================="

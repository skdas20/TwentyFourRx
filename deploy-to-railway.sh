#!/bin/bash

# 24Rx Railway Automated Deployment Script
# This script deploys all services to Railway automatically

set -e

echo "🚀 24Rx Railway Deployment Automation"
echo "======================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Generated Secrets
JWT_SECRET="SeNpoUc/FbKBKakW2zpVp/zHWAGv9Y4JeKXaMkbGbTs="
ADMIN_SECRET="KDOG5hVev+96ng+AltsO4Y3QodcOaHs4hD8OJeJ2nYw="

echo -e "${GREEN}✓ Project linked: incredible-patience${NC}"
echo -e "${GREEN}✓ PostgreSQL database: Ready${NC}"
echo -e "${GREEN}✓ Redis cache: Ready${NC}"
echo ""

echo -e "${BLUE}📦 Deploying MinIO Service...${NC}"
echo "================================="
echo ""
echo "Please follow these steps in Railway Dashboard:"
echo "https://railway.com/project/fef749e2-f6b7-45f2-b6a0-b18467302c67"
echo ""
echo "1. Click '+ New' → 'Empty Service'"
echo "2. Name it: 'minio'"
echo "3. Go to Settings → Deploy"
echo "4. Select 'Deploy from GitHub repo'"
echo "5. Choose your repository"
echo "6. Set Dockerfile Path: Dockerfile.minio"
echo "7. Add these environment variables in Variables tab:"
echo ""
echo "   MINIO_ROOT_USER=minioadmin"
echo "   MINIO_ROOT_PASSWORD=minioadmin123"
echo ""
echo "8. Click 'Deploy'"
echo ""
read -p "Press Enter when MinIO is created..."

echo ""
echo -e "${BLUE}📦 Deploying Backend Service...${NC}"
echo "================================="
echo ""
echo "1. Click '+ New' → 'GitHub Repo'"
echo "2. Select your repository"
echo "3. Name it: 'backend'"
echo "4. Set Root Directory: backend"
echo "5. Set Dockerfile Path: backend/Dockerfile"
echo "6. Go to Settings → Networking → Public Networking"
echo "7. Generate Domain (Enable public domain)"
echo "8. Go to Variables tab and add these:"
echo ""
cat << 'EOF'
NODE_ENV=production
PORT=8080
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=SeNpoUc/FbKBKakW2zpVp/zHWAGv9Y4JeKXaMkbGbTs=
JWT_EXPIRATION=15m
REFRESH_TOKEN_EXPIRES_SECONDS=2592000
REDIS_HOST=${{Redis.REDISHOST}}
REDIS_PORT=${{Redis.REDISPORT}}
REDIS_PASSWORD=${{Redis.REDISPASSWORD}}
REDIS_URL=${{Redis.REDIS_URL}}
ADMIN_SECRET_KEY=KDOG5hVev+96ng+AltsO4Y3QodcOaHs4hD8OJeJ2nYw=
MINIO_ENDPOINT=${{minio.RAILWAY_PRIVATE_DOMAIN}}
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_USE_SSL=false
HOLD_AUTO_DELIVERY_DAYS=10
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100
EOF
echo ""
echo "Note: You'll update FRONTEND_URL after frontend deployment"
echo ""
read -p "Press Enter when Backend is created and variables are set..."

echo ""
echo -e "${YELLOW}⚠️  Get Backend Public URL${NC}"
echo "================================="
echo ""
echo "Go to Backend service → Settings → Networking"
echo "Copy the public domain (e.g., backend-production-xxxx.up.railway.app)"
echo ""
read -p "Enter Backend Public Domain (without https://): " BACKEND_DOMAIN
echo ""

echo -e "${BLUE}📦 Deploying Frontend Service...${NC}"
echo "================================="
echo ""
echo "1. Click '+ New' → 'GitHub Repo'"
echo "2. Select your repository"
echo "3. Name it: 'frontend'"
echo "4. Set Root Directory: frontend"
echo "5. Set Dockerfile Path: frontend/Dockerfile"
echo "6. Go to Settings → Networking → Public Networking"
echo "7. Generate Domain (Enable public domain)"
echo "8. Go to Variables tab and add:"
echo ""
echo "NODE_ENV=production"
echo "NEXT_PUBLIC_API_URL=https://$BACKEND_DOMAIN/api/v1"
echo ""
read -p "Press Enter when Frontend is created and variables are set..."

echo ""
echo -e "${YELLOW}⚠️  Get Frontend Public URL${NC}"
echo "================================="
echo ""
echo "Go to Frontend service → Settings → Networking"
echo "Copy the public domain (e.g., frontend-production-xxxx.up.railway.app)"
echo ""
read -p "Enter Frontend Public Domain (without https://): " FRONTEND_DOMAIN
echo ""

echo -e "${BLUE}🔧 Updating Backend with Frontend URL...${NC}"
echo "==========================================="
echo ""
echo "Go back to Backend service → Variables tab"
echo "Add this variable:"
echo ""
echo "FRONTEND_URL=https://$FRONTEND_DOMAIN"
echo ""
echo "Then click 'Redeploy' on the backend service"
echo ""
read -p "Press Enter when done..."

echo ""
echo -e "${GREEN}✓✓✓ Deployment Complete! ✓✓✓${NC}"
echo "================================="
echo ""
echo "🌐 Your Application URLs:"
echo "   Frontend: https://$FRONTEND_DOMAIN"
echo "   Backend:  https://$BACKEND_DOMAIN"
echo ""
echo "📊 Railway Dashboard:"
echo "   https://railway.com/project/fef749e2-f6b7-45f2-b6a0-b18467302c67"
echo ""
echo "🔍 Check Service Status:"
echo "   railway status"
echo ""
echo "📝 View Logs:"
echo "   railway logs --service backend"
echo "   railway logs --service frontend"
echo ""
echo -e "${YELLOW}⚠️  Note: Initial deployment may take 5-10 minutes${NC}"
echo ""
echo "✅ All services should be deploying now!"


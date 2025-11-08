#!/bin/bash

# Railway Deployment Script for 24Rx Platform
# This script deploys all services to Railway

set -e

echo "🚀 Starting Railway Deployment for 24Rx Platform"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}Railway CLI is not installed. Installing...${NC}"
    npm install -g @railway/cli
fi

# Check if logged in
echo -e "${YELLOW}Checking Railway authentication...${NC}"
railway whoami || railway login --browserless

echo ""
echo "📦 Step 1: Creating services..."
echo "================================"

# Get project info
PROJECT_ID=$(railway status --json | jq -r '.project.id' 2>/dev/null || echo "")

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}No Railway project linked. Please run 'railway init' first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Railway project linked: $PROJECT_ID${NC}"

echo ""
echo "📝 Step 2: Service Configuration"
echo "================================"
echo ""
echo "Please manually create the following services in Railway Dashboard:"
echo "https://railway.com/project/$PROJECT_ID"
echo ""
echo "1. PostgreSQL Database"
echo "   - Click '+ New' → 'Database' → 'Add PostgreSQL'"
echo ""
echo "2. Redis Cache"
echo "   - Click '+ New' → 'Database' → 'Add Redis'"
echo ""
echo "3. MinIO Service"
echo "   - Click '+ New' → 'Empty Service'"
echo "   - Name: 'minio'"
echo "   - Settings → Source → Deploy from GitHub"
echo "   - Dockerfile Path: Dockerfile.minio"
echo "   - Environment Variables:"
echo "     MINIO_ROOT_USER=minioadmin"
echo "     MINIO_ROOT_PASSWORD=minioadmin123"
echo ""
echo "4. Backend Service"
echo "   - Click '+ New' → 'GitHub Repo'"
echo "   - Select your repository"
echo "   - Root Directory: backend"
echo "   - Dockerfile Path: backend/Dockerfile"
echo ""
echo "5. Frontend Service"
echo "   - Click '+ New' → 'GitHub Repo'"
echo "   - Select your repository"
echo "   - Root Directory: frontend"
echo "   - Dockerfile Path: frontend/Dockerfile"
echo ""
echo -e "${YELLOW}Press Enter when you've created all services in Railway Dashboard...${NC}"
read

echo ""
echo "🔧 Step 3: Setting Environment Variables"
echo "========================================"

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)
ADMIN_SECRET=$(openssl rand -base64 32)

echo ""
echo "Copy these environment variables to your Backend service in Railway:"
echo "-------------------------------------------------------------------"
cat << EOF

NODE_ENV=production
PORT=8080
JWT_SECRET=$JWT_SECRET
JWT_EXPIRATION=15m
REFRESH_TOKEN_EXPIRES_SECONDS=2592000
ADMIN_SECRET_KEY=$ADMIN_SECRET
HOLD_AUTO_DELIVERY_DAYS=10
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100
MINIO_USE_SSL=false

# Database (Reference from PostgreSQL service)
DATABASE_URL=\${{Postgres.DATABASE_URL}}

# Redis (Reference from Redis service)
REDIS_HOST=\${{Redis.REDIS_HOST}}
REDIS_PORT=\${{Redis.REDIS_PORT}}
REDIS_PASSWORD=\${{Redis.REDIS_PASSWORD}}

# MinIO (Reference from MinIO service)
MINIO_ENDPOINT=\${{minio.RAILWAY_PRIVATE_DOMAIN}}
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123

# Frontend URL (Will be updated after frontend deploys)
FRONTEND_URL=\${{frontend.RAILWAY_PUBLIC_DOMAIN}}

EOF

echo ""
echo "Copy these environment variables to your Frontend service in Railway:"
echo "--------------------------------------------------------------------"
cat << EOF

NODE_ENV=production
NEXT_PUBLIC_API_URL=https://\${{backend.RAILWAY_PUBLIC_DOMAIN}}/api/v1

EOF

echo ""
echo -e "${GREEN}✓ Environment variables generated${NC}"
echo ""
echo "📋 Next Steps:"
echo "=============="
echo "1. Go to Railway Dashboard: https://railway.com/project/$PROJECT_ID"
echo "2. For each service, go to 'Variables' tab and add the environment variables shown above"
echo "3. Make sure to use the Service References syntax: \${{ServiceName.VARIABLE}}"
echo "4. Deploy each service by clicking 'Deploy'"
echo "5. Enable public domains for frontend and backend services"
echo ""
echo "⚠️  Important Notes:"
echo "- PostgreSQL and Redis will have DATABASE_URL and REDIS_URL automatically set"
echo "- Use Service References to connect services internally"
echo "- After deployment, get the frontend public URL from Railway Dashboard"
echo ""
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo "🌐 To get your frontend URL after deployment:"
echo "   railway domain"


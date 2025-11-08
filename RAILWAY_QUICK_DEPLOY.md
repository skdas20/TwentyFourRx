# 24Rx Railway Deployment - Quick Start Guide

## ✅ Project Created
- **Project Name:** incredible-patience
- **Environment:** production
- **Project URL:** https://railway.com/project/fef749e2-f6b7-45f2-b6a0-b18467302c67

## 📦 Services to Deploy

### 1. PostgreSQL Database ✓
```bash
# Add PostgreSQL
railway add
# Select: Database → PostgreSQL
```

### 2. Redis Cache ✓
```bash
# Add Redis
railway add
# Select: Database → Redis
```

### 3. MinIO Object Storage
- Service Type: Empty Service
- Name: `minio`
- Dockerfile: `Dockerfile.minio`
- Environment Variables:
  ```
  MINIO_ROOT_USER=minioadmin
  MINIO_ROOT_PASSWORD=minioadmin123
  ```

### 4. Backend API
- Service Type: GitHub Repo
- Root Directory: `backend`
- Dockerfile: `backend/Dockerfile`
- Port: 8080
- Public Domain: Enable

### 5. Frontend App
- Service Type: GitHub Repo
- Root Directory: `frontend`
- Dockerfile: `frontend/Dockerfile`
- Port: 3000
- Public Domain: Enable

## 🔧 Environment Variables

### Backend Service
```bash
NODE_ENV=production
PORT=8080
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<generated-secret>
JWT_EXPIRATION=15m
REFRESH_TOKEN_EXPIRES_SECONDS=2592000
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
REDIS_URL=${{Redis.REDIS_URL}}
ADMIN_SECRET_KEY=<generated-admin-secret>
MINIO_ENDPOINT=${{minio.RAILWAY_PRIVATE_DOMAIN}}
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_USE_SSL=false
FRONTEND_URL=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
HOLD_AUTO_DELIVERY_DAYS=10
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100
```

### Frontend Service
```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}/api/v1
```

## 🚀 Deployment Steps

### Option 1: Using Railway CLI (Recommended)
```bash
# Navigate to project
cd /workspaces/TwentyFourRx

# Link to existing project
railway link fef749e2-f6b7-45f2-b6a0-b18467302c67

# Add databases
railway add --database postgres
railway add --database redis

# Deploy backend
cd backend
railway up --service backend

# Deploy frontend
cd ../frontend
railway up --service frontend
```

### Option 2: Using Railway Web Dashboard
1. Go to: https://railway.com/project/fef749e2-f6b7-45f2-b6a0-b18467302c67
2. Click "+ New" for each service
3. Configure as described above
4. Set environment variables
5. Deploy

## 🌐 Accessing Your Application

After deployment, you'll get URLs like:
- **Frontend:** https://[service-name].up.railway.app
- **Backend:** https://[service-name].up.railway.app

## ⚠️ Important Notes

1. **Service References:** Use `${{ServiceName.VARIABLE}}` syntax to reference other services
2. **Private Network:** Services communicate via Railway's private network
3. **Public Domains:** Only frontend and backend need public domains
4. **Database URLs:** PostgreSQL and Redis URLs are auto-injected
5. **Build Time:** Initial deployment may take 5-10 minutes

## 🔍 Troubleshooting

### Check Logs
```bash
railway logs --service backend
railway logs --service frontend
```

### Restart Service
```bash
railway restart --service backend
```

### Check Build Status
Go to Railway Dashboard → Select Service → Deployments tab

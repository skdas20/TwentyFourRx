# Railway Deployment Guide for 24Rx

This guide will help you deploy the 24Rx medicine trading platform to Railway.

## Architecture Overview

The application consists of 5 services:
1. **PostgreSQL** - Database (Railway managed service)
2. **Redis** - Cache (Railway managed service)
3. **MinIO** - Object storage (Self-hosted on Railway)
4. **Backend** - NestJS API (Dockerized)
5. **Frontend** - Next.js app (Dockerized)

## Prerequisites

- Railway account (https://railway.app)
- GitHub repository with your code
- Domain name (optional, for custom domain)

## Deployment Steps

### 1. Create a New Railway Project

1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select your repository
4. Railway will create a new project

### 2. Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will provision a PostgreSQL instance
4. Note: The `DATABASE_URL` will be automatically available as an environment variable

### 3. Add Redis Cache

1. Click "+ New" again
2. Select "Database" → "Add Redis"
3. Railway will provision a Redis instance
4. Note: `REDIS_URL` will be automatically available

### 4. Deploy MinIO Service

1. Click "+ New" → "Empty Service"
2. Name it "minio"
3. Go to "Settings" → "Source" → "Deploy from GitHub repo"
4. Select your repo and set:
   - **Root Directory**: Leave empty
   - **Dockerfile Path**: `Dockerfile.minio`
5. Add environment variables:
   ```
   MINIO_ROOT_USER=minioadmin
   MINIO_ROOT_PASSWORD=minioadmin123
   ```
6. Go to "Settings" → "Networking" → "Public Networking"
7. Click "Generate Domain" (you'll need this URL)
8. Add custom port: `9000` (for API) and `9001` (for console)

### 5. Deploy Backend Service

1. Click "+ New" → "GitHub Repo"
2. Select your repository
3. Railway will detect the Dockerfile in `/backend`
4. Configure settings:
   - **Root Directory**: `backend`
   - **Dockerfile Path**: `Dockerfile`
5. Add environment variables:
   ```
   NODE_ENV=production
   PORT=8080
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=your_super_secret_jwt_key_change_this
   JWT_EXPIRATION=15m
   REFRESH_TOKEN_EXPIRES_SECONDS=2592000
   REDIS_HOST=${{Redis.REDIS_HOST}}
   REDIS_PORT=${{Redis.REDIS_PORT}}
   REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
   ADMIN_SECRET_KEY=your_admin_secret_key_change_this
   GMAIL_USER=your_gmail@gmail.com
   GMAIL_APP_PASSWORD=your_gmail_app_password
   FRONTEND_URL=https://your-frontend-domain.railway.app
   MINIO_ENDPOINT=your-minio-domain.railway.app
   MINIO_PORT=443
   MINIO_ACCESS_KEY=minioadmin
   MINIO_SECRET_KEY=minioadmin123
   MINIO_USE_SSL=true
   HOLD_AUTO_DELIVERY_DAYS=10
   DEFAULT_PAGE_SIZE=20
   MAX_PAGE_SIZE=100
   ```
6. Go to "Settings" → "Networking" → "Public Networking"
7. Click "Generate Domain"

### 6. Deploy Frontend Service

1. Click "+ New" → "GitHub Repo"
2. Select your repository
3. Configure settings:
   - **Root Directory**: `frontend`
   - **Dockerfile Path**: `Dockerfile`
4. Add environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-domain.railway.app/api/v1
   ```
5. Go to "Settings" → "Networking" → "Public Networking"
6. Click "Generate Domain"

### 7. Create MinIO Dockerfile

Create a file `Dockerfile.minio` in your project root:

```dockerfile
FROM minio/minio:latest

# Expose ports
EXPOSE 9000 9001

# Set default command
CMD ["server", "/data", "--console-address", ":9001"]
```

### 8. Run Database Migrations

After backend is deployed:

1. Go to backend service
2. Click "Settings" → "Deploy"
3. The migrations will run automatically on startup (see Dockerfile CMD)

Alternatively, you can run manually:
1. Go to backend service
2. Click "Settings" → "Variables"
3. Add a temporary variable: `RUN_MIGRATIONS=true`
4. Redeploy the service

### 9. Verify Deployment

1. **Check Backend Health**:
   - Visit: `https://your-backend-domain.railway.app/health`
   - Should return: `{"status":"ok"}`

2. **Check Frontend**:
   - Visit: `https://your-frontend-domain.railway.app`
   - Should load the landing page

3. **Check MinIO**:
   - Visit: `https://your-minio-domain.railway.app:9001`
   - Login with credentials from env vars

### 10. Create Admin User

Use the backend API to create an admin:

```bash
curl -X POST https://your-backend-domain.railway.app/api/v1/auth/admin/create \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: your_admin_secret_key" \
  -d '{
    "name": "Admin User",
    "email": "admin@24rx.com",
    "password": "SecurePassword123!"
  }'
```

## Environment Variables Reference

### Backend Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Auto-provided by Railway |
| `JWT_SECRET` | Secret for JWT tokens | Random 32+ char string |
| `REDIS_HOST` | Redis hostname | Auto-provided by Railway |
| `GMAIL_USER` | Gmail for sending emails | your-email@gmail.com |
| `GMAIL_APP_PASSWORD` | Gmail app password | 16-char app password |
| `FRONTEND_URL` | Frontend URL for CORS | https://your-app.railway.app |
| `MINIO_ENDPOINT` | MinIO endpoint | your-minio.railway.app |
| `ADMIN_SECRET_KEY` | Secret for creating admins | Random 32+ char string |

### Frontend Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | https://api.railway.app/api/v1 |

## Custom Domain Setup

### For Frontend:
1. Go to frontend service → "Settings" → "Networking"
2. Click "Custom Domain"
3. Add your domain (e.g., `24rx.com`)
4. Add DNS records as shown by Railway

### For Backend:
1. Go to backend service → "Settings" → "Networking"
2. Click "Custom Domain"
3. Add your API subdomain (e.g., `api.24rx.com`)
4. Add DNS records as shown by Railway

## Monitoring and Logs

- **View Logs**: Click on any service → "Deployments" → Click on deployment → "View Logs"
- **Metrics**: Railway provides CPU, Memory, and Network metrics
- **Alerts**: Set up in "Settings" → "Alerts"

## Scaling

Railway automatically scales based on usage. For manual scaling:
1. Go to service → "Settings" → "Resources"
2. Adjust CPU and Memory limits

## Troubleshooting

### Backend won't start
- Check logs for database connection errors
- Verify `DATABASE_URL` is set correctly
- Ensure migrations ran successfully

### Frontend can't connect to backend
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check CORS settings in backend
- Ensure backend is running

### MinIO files not accessible
- Check `MINIO_ENDPOINT` in backend env vars
- Verify MinIO service is running
- Check bucket policy (should be public read)

### Database connection issues
- Verify PostgreSQL service is running
- Check `DATABASE_URL` format
- Ensure network connectivity between services

## Cost Optimization

- **Hobby Plan**: Free tier includes $5/month credit
- **Pro Plan**: $20/month for production apps
- **Database**: PostgreSQL and Redis are included
- **Bandwidth**: First 100GB free, then $0.10/GB

## Backup Strategy

### Database Backups
Railway automatically backs up PostgreSQL daily. To restore:
1. Go to PostgreSQL service → "Data" → "Backups"
2. Select backup and click "Restore"

### MinIO Backups
Set up periodic backups of MinIO data:
1. Use MinIO client (`mc`) to sync data
2. Or use Railway's volume snapshots

## Security Best Practices

1. **Change default secrets** in production
2. **Use strong passwords** for all services
3. **Enable 2FA** on Railway account
4. **Rotate JWT secrets** periodically
5. **Monitor logs** for suspicious activity
6. **Keep dependencies updated**

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Project Issues: GitHub Issues

## Local Testing with Docker

Before deploying to Railway, test locally:

```bash
# Build and run all services
docker-compose up --build

# Stop all services
docker-compose down

# Remove volumes (clean slate)
docker-compose down -v
```

## Continuous Deployment

Railway automatically deploys when you push to your main branch:
1. Push code to GitHub
2. Railway detects changes
3. Builds and deploys automatically
4. Zero-downtime deployment

To disable auto-deploy:
1. Go to service → "Settings" → "Source"
2. Toggle "Auto Deploy" off

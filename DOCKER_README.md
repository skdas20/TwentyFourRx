# 24Rx Docker Deployment Guide

Complete guide for deploying 24Rx using Docker locally and on Railway.

## 📋 Table of Contents

- [Quick Start (Local)](#quick-start-local)
- [Railway Deployment](#railway-deployment)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## 🚀 Quick Start (Local)

### Prerequisites

- Docker Desktop installed
- Docker Compose installed
- 8GB RAM minimum
- 10GB free disk space

### Step 1: Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd 24Rx

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
# At minimum, update:
# - GMAIL_USER
# - GMAIL_APP_PASSWORD
```

### Step 2: Start Services

**On Windows:**
```bash
docker-start.bat
```

**On Linux/Mac:**
```bash
chmod +x docker-start.sh
./docker-start.sh
```

**Or manually:**
```bash
docker-compose up --build
```

### Step 3: Access Services

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin123)
- **MinIO API**: http://localhost:9000

### Step 4: Create Admin User

```bash
curl -X POST http://localhost:8080/api/v1/auth/admin/create \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: 24rx_admin_secret_key_2024" \
  -d '{
    "name": "Admin User",
    "email": "admin@24rx.com",
    "password": "Admin@123"
  }'
```

## ☁️ Railway Deployment

See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for detailed Railway deployment instructions.

### Quick Railway Setup

1. **Create Railway Project**
   - Connect GitHub repo
   - Railway auto-detects services

2. **Add Databases**
   - Add PostgreSQL
   - Add Redis

3. **Deploy Services**
   - MinIO (using Dockerfile.minio)
   - Backend (using backend/Dockerfile)
   - Frontend (using frontend/Dockerfile)

4. **Configure Environment Variables**
   - Set all required env vars
   - Link database URLs

5. **Generate Domains**
   - Enable public networking
   - Generate domains for each service

## 🏗️ Architecture

```
┌─────────────┐
│   Frontend  │ (Next.js)
│   Port 3000 │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────┐
│   Backend   │────▶│PostgreSQL│
│   Port 8080 │     │Port 5432 │
└──────┬──────┘     └──────────┘
       │
       ├────────────▶┌──────────┐
       │             │  Redis   │
       │             │Port 6379 │
       │             └──────────┘
       │
       └────────────▶┌──────────┐
                     │  MinIO   │
                     │Port 9000 │
                     └──────────┘
```

## ⚙️ Configuration

### Environment Variables

#### Backend (.env)

```env
# Server
PORT=8080
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# JWT
JWT_SECRET=your_secret_key_min_32_chars
JWT_EXPIRATION=15m
REFRESH_TOKEN_EXPIRES_SECONDS=2592000

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# Admin
ADMIN_SECRET_KEY=your_admin_secret

# Email
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_app_password

# Frontend
FRONTEND_URL=http://localhost:3000

# MinIO
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_USE_SSL=false
```

#### Frontend (.env)

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

### Docker Compose Services

| Service | Image | Ports | Purpose |
|---------|-------|-------|---------|
| postgres | postgres:15-alpine | 5432 | Database |
| redis | redis:7-alpine | 6379 | Cache |
| minio | minio/minio:latest | 9000, 9001 | Object Storage |
| backend | Custom (NestJS) | 8080 | API Server |
| frontend | Custom (Next.js) | 3000 | Web App |

## 🔧 Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs

# Check specific service
docker-compose logs backend

# Restart services
docker-compose restart

# Clean restart
docker-compose down -v
docker-compose up --build
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d medtrade
```

### MinIO Not Accessible

```bash
# Check MinIO logs
docker-compose logs minio

# Verify MinIO is running
curl http://localhost:9000/minio/health/live

# Access MinIO console
# Open http://localhost:9001
# Login: minioadmin / minioadmin123
```

### Backend API Errors

```bash
# Check backend logs
docker-compose logs backend

# Check if migrations ran
docker-compose exec backend npx prisma migrate status

# Run migrations manually
docker-compose exec backend npx prisma migrate deploy

# Check database connection
docker-compose exec backend node -e "console.log(process.env.DATABASE_URL)"
```

### Frontend Build Errors

```bash
# Check frontend logs
docker-compose logs frontend

# Rebuild frontend
docker-compose up --build frontend

# Check environment variables
docker-compose exec frontend env | grep NEXT_PUBLIC
```

### Port Conflicts

If ports are already in use:

```bash
# Check what's using the port
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000

# Change ports in docker-compose.yml
# Example: "3001:3000" instead of "3000:3000"
```

### Out of Memory

```bash
# Increase Docker memory limit
# Docker Desktop → Settings → Resources → Memory
# Recommended: 8GB minimum

# Check memory usage
docker stats
```

### Clean Slate

```bash
# Stop and remove everything
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Remove all volumes
docker volume prune

# Start fresh
docker-compose up --build
```

## 📊 Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Check Resource Usage

```bash
# Real-time stats
docker stats

# Disk usage
docker system df
```

### Health Checks

```bash
# Backend health
curl http://localhost:8080/health

# Frontend health
curl http://localhost:3000

# MinIO health
curl http://localhost:9000/minio/health/live
```

## 🔒 Security

### Production Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT_SECRET (32+ characters)
- [ ] Use strong ADMIN_SECRET_KEY
- [ ] Enable HTTPS (use reverse proxy)
- [ ] Set MINIO_USE_SSL=true in production
- [ ] Use environment-specific .env files
- [ ] Enable firewall rules
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity

### Secrets Management

**Never commit secrets to Git!**

```bash
# Add to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore
```

## 🚢 Deployment Strategies

### Development

```bash
docker-compose up
```

### Staging

```bash
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up
```

### Production

Use Railway or other cloud platforms. See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md).

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Railway Documentation](https://docs.railway.app/)
- [NestJS Docker Guide](https://docs.nestjs.com/recipes/docker)
- [Next.js Docker Guide](https://nextjs.org/docs/deployment#docker-image)

## 🆘 Support

- **Issues**: Create a GitHub issue
- **Questions**: Check existing issues or create new one
- **Security**: Email security concerns privately

## 📝 License

[Your License Here]

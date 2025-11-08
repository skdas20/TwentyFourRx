# 🚀 24Rx Railway Deployment - Complete Guide

## ✅ Status: Ready to Deploy

### 📍 Project Information
- **Project Name:** incredible-patience
- **Project URL:** https://railway.com/project/fef749e2-f6b7-45f2-b6a0-b18467302c67
- **Environment:** production
- **Account:** Sumit.KumarDas2023@iem.edu.in

### ✓ Pre-Deployment Checklist
- [x] Dockerfiles verified (backend, frontend, minio)
- [x] Railway CLI installed and authenticated
- [x] Railway project created and linked
- [x] PostgreSQL database provisioned
- [x] Redis cache provisioned
- [x] Security secrets generated
- [x] Environment variable files created

---

## 🎯 Deployment Steps

### Step 1: Deploy MinIO Object Storage

1. **Open Railway Dashboard:**
   - Go to: https://railway.com/project/fef749e2-f6b7-45f2-b6a0-b18467302c67

2. **Create MinIO Service:**
   - Click `+ New` → Select `Empty Service`
   - Name it: `minio`

3. **Configure Source:**
   - Go to `Settings` → `Source`
   - Click `Deploy from GitHub repo`
   - Select your repository: `skdas20/TwentyFourRx`
   - Set **Dockerfile Path:** `Dockerfile.minio`

4. **Set Environment Variables:**
   - Go to `Variables` tab
   - Add these variables:
     ```
     MINIO_ROOT_USER=minioadmin
     MINIO_ROOT_PASSWORD=minioadmin123
     ```

5. **Deploy:**
   - Railway will automatically start building and deploying
   - Wait for status to show "Active" (green)

---

### Step 2: Deploy Backend API

1. **Create Backend Service:**
   - Click `+ New` → Select `GitHub Repo`
   - Choose your repository
   - Name it: `backend`

2. **Configure Build Settings:**
   - Go to `Settings` → `Source`
   - Set **Root Directory:** `backend`
   - Set **Dockerfile Path:** `backend/Dockerfile`
   - Set **Build Command:** (leave empty, handled by Dockerfile)
   - Set **Start Command:** (leave empty, handled by Dockerfile)

3. **Enable Public Domain:**
   - Go to `Settings` → `Networking`
   - Click `Generate Domain` under Public Networking
   - Save the generated domain (e.g., `backend-production-xxxx.up.railway.app`)

4. **Set Environment Variables:**
   - Go to `Variables` tab
   - Copy and paste from `.env.backend.railway` file:
     ```
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
     ```
   - **Note:** Leave `FRONTEND_URL` empty for now, will update after frontend deploys

5. **Deploy:**
   - Click `Deploy` or it will auto-deploy
   - Wait for build and deployment to complete (~5-10 minutes)

---

### Step 3: Deploy Frontend Application

1. **Create Frontend Service:**
   - Click `+ New` → Select `GitHub Repo`
   - Choose your repository
   - Name it: `frontend`

2. **Configure Build Settings:**
   - Go to `Settings` → `Source`
   - Set **Root Directory:** `frontend`
   - Set **Dockerfile Path:** `frontend/Dockerfile`

3. **Enable Public Domain:**
   - Go to `Settings` → `Networking`
   - Click `Generate Domain` under Public Networking
   - Save the generated domain (e.g., `frontend-production-xxxx.up.railway.app`)

4. **Set Environment Variables:**
   - Go to `Variables` tab
   - Add these variables:
     ```
     NODE_ENV=production
     NEXT_PUBLIC_API_URL=https://[YOUR-BACKEND-DOMAIN]/api/v1
     ```
   - Replace `[YOUR-BACKEND-DOMAIN]` with the backend domain from Step 2

5. **Deploy:**
   - Click `Deploy` or it will auto-deploy
   - Wait for build and deployment to complete (~5-10 minutes)

---

### Step 4: Final Configuration

1. **Update Backend with Frontend URL:**
   - Go back to Backend service → Variables tab
   - Add this variable:
     ```
     FRONTEND_URL=https://[YOUR-FRONTEND-DOMAIN]
     ```
   - Replace `[YOUR-FRONTEND-DOMAIN]` with the frontend domain from Step 3

2. **Redeploy Backend:**
   - Go to Backend service
   - Click the three dots menu → `Restart`
   - This will restart the backend with the new FRONTEND_URL

3. **Verify All Services:**
   - Check all services show "Active" status in Railway dashboard
   - All services should have green status indicators

---

## 🌐 Access Your Application

### Frontend URL (Main Application)
```
https://[YOUR-FRONTEND-DOMAIN]
```

### Backend API URL
```
https://[YOUR-BACKEND-DOMAIN]/api/v1
```

### Health Check Endpoints
```
https://[YOUR-BACKEND-DOMAIN]/health
https://[YOUR-BACKEND-DOMAIN]/api/v1/health
```

---

## 📊 Monitoring & Logs

### View Logs via CLI
```bash
# Backend logs
railway logs --service backend

# Frontend logs
railway logs --service frontend

# MinIO logs
railway logs --service minio
```

### View Logs via Dashboard
1. Go to Railway Dashboard
2. Click on any service
3. Go to `Deployments` tab
4. Click on latest deployment to view logs

---

## 🔧 Troubleshooting

### Service Won't Start
1. Check logs for errors: `railway logs --service [service-name]`
2. Verify environment variables are set correctly
3. Check Dockerfile paths are correct
4. Ensure all dependent services (Postgres, Redis) are running

### Database Connection Issues
- Verify `DATABASE_URL` references `${{Postgres.DATABASE_URL}}`
- Check Postgres service is "Active"
- Verify backend can reach Postgres on private network

### Redis Connection Issues
- Verify Redis variables are correctly referenced
- Check Redis service is "Active"
- Ensure REDIS_URL is set correctly

### Frontend Can't Reach Backend
- Verify `NEXT_PUBLIC_API_URL` points to correct backend domain
- Check backend has public domain enabled
- Test backend health endpoint directly

### MinIO Connection Issues
- Verify MINIO_ENDPOINT uses private domain: `${{minio.RAILWAY_PRIVATE_DOMAIN}}`
- Check MinIO credentials match in both MinIO and Backend
- Ensure MINIO_USE_SSL is set to `false`

---

## 🔒 Security Notes

### Generated Secrets (DO NOT SHARE)
```
JWT_SECRET=SeNpoUc/FbKBKakW2zpVp/zHWAGv9Y4JeKXaMkbGbTs=
ADMIN_SECRET_KEY=KDOG5hVev+96ng+AltsO4Y3QodcOaHs4hD8OJeJ2nYw=
```

### Production Recommendations
- [ ] Change MinIO credentials from default
- [ ] Add custom domain for frontend
- [ ] Enable SSL/TLS certificates
- [ ] Configure CORS properly in backend
- [ ] Set up monitoring alerts
- [ ] Configure backup strategy for PostgreSQL
- [ ] Review and update rate limiting settings
- [ ] Set up error tracking (e.g., Sentry)

---

## 📈 Scaling Considerations

### Horizontal Scaling
Railway supports horizontal scaling for your services:
- Go to Service → Settings → Deploy
- Adjust number of replicas

### Vertical Scaling
Railway automatically scales resources based on usage:
- Monitor resource usage in Railway dashboard
- Upgrade plan if needed for more resources

---

## 💰 Cost Estimation

### Railway Pricing (as of current date)
- **Hobby Plan:** $5/month + usage
- **Pro Plan:** $20/month + usage

### Estimated Monthly Cost
- PostgreSQL: ~$5-10
- Redis: ~$5-10
- Backend: ~$5-15 (depending on traffic)
- Frontend: ~$5-15 (depending on traffic)
- MinIO: ~$5-10 (depending on storage)

**Total Estimated:** $25-60/month

---

## ✅ Post-Deployment Checklist

- [ ] All services show "Active" status
- [ ] Frontend loads successfully
- [ ] Backend API responds to health check
- [ ] Database migrations ran successfully
- [ ] Redis connection working
- [ ] MinIO storage accessible
- [ ] User registration works
- [ ] User login works
- [ ] All API endpoints responding
- [ ] File uploads working
- [ ] Email notifications working (if configured)

---

## 📞 Support & Resources

### Railway Resources
- Documentation: https://docs.railway.app
- Community: https://discord.gg/railway
- Status: https://status.railway.app

### 24Rx Resources
- Project Repository: https://github.com/skdas20/TwentyFourRx
- Issues: https://github.com/skdas20/TwentyFourRx/issues

---

## 🎉 Deployment Complete!

Your 24Rx platform is now live on Railway! 

**Next Steps:**
1. Test all functionality
2. Set up custom domain (optional)
3. Configure monitoring
4. Share the frontend URL with stakeholders

**Remember to save your frontend URL for the owner!**


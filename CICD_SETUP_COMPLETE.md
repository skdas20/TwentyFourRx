# ✅ CI/CD Setup - Ready to Deploy!

## 🔑 Step 1: Add SSH Key to GCP Metadata

Run this command from your local machine (where you have gcloud configured):

```bash
gcloud compute instances add-metadata new24rx-server \
    --metadata="ssh-keys=claude-24rx-deploy:ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFW0QpS0BDPvg8N5eE+s2s+eQIUWFVs7hs7GZGqPUgBx github-actions-deploy@24rx" \
    --zone=us-central1-a
```

This ensures the key persists even after GCP maintenance/reboots.

## 📝 Step 2: Add GitHub Secrets

Go to: **GitHub → skdas20/TwentyFourRx → Settings → Secrets and variables → Actions**

Click **"New repository secret"** and add these **3 secrets**:

### Secret 1: SSH_PRIVATE_KEY

**Name:** `SSH_PRIVATE_KEY`

**Value:** (Copy the ENTIRE block below including BEGIN/END lines)

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBVtEKUtAQz74PDeXhPrNrPnkCFFhVbO4bOxmRqj1IAcQAAAKCpArCIqQKw
iAAAAAtzc2gtZWQyNTUxOQAAACBVtEKUtAQz74PDeXhPrNrPnkCFFhVbO4bOxmRqj1IAcQ
AAAEC1hAdLyh6MNW3XDML37NaD9TqS0kZ8DwBkHmV6l4ey61W0QpS0BDPvg8N5eE+s2s+e
QIUWFVs7hs7GZGqPUgBxAAAAGmdpdGh1Yi1hY3Rpb25zLWRlcGxveUAyNHJ4AQID
-----END OPENSSH PRIVATE KEY-----
```

### Secret 2: SERVER_HOST

**Name:** `SERVER_HOST`

**Value:** `35.225.19.249`

### Secret 3: SERVER_USER

**Name:** `SERVER_USER`

**Value:** `claude-24rx-deploy`

## 🚀 Step 3: Push Everything and Watch It Deploy!

```bash
# Stage all changes
git add -A

# Commit with message
git commit -m "feat: Add CI/CD pipeline + seller confirmation flow improvements"

# Push to main
git push origin main
```

## 📊 Step 4: Monitor Deployment

1. Go to: https://github.com/skdas20/TwentyFourRx/actions
2. You'll see workflows running for backend and/or frontend
3. Click on a workflow to see live deployment logs

## 🎯 What Happens Automatically

✅ **Backend Deployment** (when `backend/` files change):
- Pulls latest code
- Installs dependencies
- Runs Prisma migrations
- Builds the app
- Restarts backend service

✅ **Frontend Deployment** (when `frontend/` files change):
- Pulls latest code
- Installs dependencies
- Builds the app
- Restarts frontend service

## 🔍 Current Server Status

- **Server IP:** 35.225.19.249
- **Deploy User:** claude-24rx-deploy
- **Project Path:** /home/admin_24rx/24rx/
- **Backend Service:** 24rx-backend (✅ Running)
- **Frontend Service:** 24rx-frontend (✅ Running)
- **Sudo Access:** Full (NOPASSWD)

## 📝 Manual Deployment (if needed)

If you ever need to deploy manually:

```bash
# Backend
ssh claude-24rx-deploy@35.225.19.249
cd /home/admin_24rx/24rx/backend
git pull origin main
npm install
npx prisma db push
npm run build
sudo systemctl restart 24rx-backend

# Frontend
cd /home/admin_24rx/24rx/frontend
git pull origin main
npm install
npm run build
sudo systemctl restart 24rx-frontend
```

## 🎉 You're All Set!

Once you complete steps 1-3, every push to `main` will automatically deploy to your server!

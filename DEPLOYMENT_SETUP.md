# CI/CD Deployment Setup Guide

## Step 1: Generate SSH Key on Server

SSH into your server and generate a new SSH key for GitHub Actions:

```bash
# On your server
ssh-keygen -t ed25519 -C "github-actions@24rx" -f ~/.ssh/github_actions_deploy_key -N ""
```

This creates:
- Private key: `~/.ssh/github_actions_deploy_key`
- Public key: `~/.ssh/github_actions_deploy_key.pub`

## Step 2: Add Public Key to Authorized Keys

```bash
cat ~/.ssh/github_actions_deploy_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## Step 3: Get the Private Key

Copy the private key content (you'll add this to GitHub):

```bash
cat ~/.ssh/github_actions_deploy_key
```

Copy the ENTIRE output including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`

## Step 4: Get Server Details

Get your server's external IP:

```bash
curl ifconfig.me
# Or if you know the GCP instance name:
gcloud compute instances describe 24rx-instance --zone=YOUR_ZONE --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

## Step 5: Add Secrets to GitHub

Go to your GitHub repository:
1. Navigate to: **Settings → Secrets and variables → Actions**
2. Click **"New repository secret"**
3. Add these 3 secrets:

### Secret 1: SSH_PRIVATE_KEY
- Name: `SSH_PRIVATE_KEY`
- Value: The ENTIRE private key from Step 3 (including BEGIN/END lines)

### Secret 2: SERVER_HOST
- Name: `SERVER_HOST`
- Value: Your server IP (e.g., `34.XX.XX.XX`)

### Secret 3: SERVER_USER
- Name: `SERVER_USER`
- Value: Your SSH username (probably `ubuntu` or your username)

## Step 6: Test SSH Connection Locally

Before pushing, test that the key works:

```bash
# From your local machine
ssh -i ~/.ssh/github_actions_deploy_key YOUR_USER@YOUR_SERVER_IP

# If this works, you're good to go!
```

## Step 7: Push and Test

```bash
git add .
git commit -m "feat: Add CI/CD with GitHub Actions"
git push origin main
```

## Step 8: Monitor Deployment

1. Go to your GitHub repository
2. Click **"Actions"** tab
3. You'll see the workflows running
4. Click on a workflow to see detailed logs

## Troubleshooting

### If deployment fails with "Permission denied":
```bash
# On server, ensure the user has sudo without password for systemctl
sudo visudo
# Add this line:
your_username ALL=(ALL) NOPASSWD: /bin/systemctl restart 24rx-backend, /bin/systemctl restart 24rx-frontend, /bin/systemctl status 24rx-backend, /bin/systemctl status 24rx-frontend
```

### If npm install fails:
```bash
# On server, ensure node/npm are in PATH for non-interactive shells
echo 'export PATH="$HOME/.nvm/versions/node/v20.x.x/bin:$PATH"' >> ~/.bashrc
```

### Check logs if deployment succeeds but app fails:
```bash
# Backend logs
sudo journalctl -u 24rx-backend -n 50 --no-pager

# Frontend logs
sudo journalctl -u 24rx-frontend -n 50 --no-pager
```

## Deployment Triggers

- **Backend**: Deploys when files in `backend/` folder change
- **Frontend**: Deploys when files in `frontend/` folder change
- Both deploy when their respective workflow files change

## Manual Deployment

If you need to manually trigger a deployment:
1. Go to **Actions** tab
2. Select the workflow
3. Click **"Run workflow"**
4. Choose branch and click **"Run workflow"**

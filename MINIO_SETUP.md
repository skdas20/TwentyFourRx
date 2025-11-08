# MinIO Setup Guide (D: Drive Installation)

## What is MinIO?
MinIO is an S3-compatible object storage server that runs locally. We're using it to store listing documents (invoices, receipts, etc.) on your D: drive.

## Installation Complete ✅
MinIO has been downloaded to: `D:\minio\`
Data will be stored in: `D:\minio\data\`

## How to Start MinIO

### Option 1: Using the Batch File (Recommended)
1. Copy `start-minio.bat` from project root to `D:\minio\`
2. Double-click `D:\minio\start-minio.bat`
3. MinIO will start on port 9000

### Option 2: Manual Start
Open PowerShell and run:
```powershell
cd D:\minio
$env:MINIO_ROOT_USER="minioadmin"
$env:MINIO_ROOT_PASSWORD="minioadmin123"
.\minio.exe server D:\minio\data --console-address ":9001"
```

## Access MinIO

- **API Endpoint**: http://localhost:9000
- **Web Console**: http://localhost:9001
- **Username**: minioadmin
- **Password**: minioadmin123

## Verify Installation

1. Start MinIO using one of the methods above
2. Open browser to http://localhost:9001
3. Login with minioadmin/minioadmin123
4. You should see the MinIO console

## Backend Configuration

The backend is already configured in `.env`:
```
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_USE_SSL=false
```

## How It Works

1. When sellers create listings, they can upload documents (PDF, images)
2. Files are stored in `D:\minio\data\24rx-documents\`
3. Admins can view these documents when approving listings
4. File URLs are stored in the database

## Storage Location

All files are stored on D: drive at:
- MinIO executable: `D:\minio\minio.exe`
- Data storage: `D:\minio\data\`
- Bucket: `24rx-documents`

## Troubleshooting

### MinIO won't start
- Check if port 9000 or 9001 is already in use
- Make sure you have write permissions to D:\minio\data

### Can't upload files
- Ensure MinIO is running
- Check backend logs for connection errors
- Verify .env configuration matches MinIO settings

### Files not accessible
- Check MinIO console at http://localhost:9001
- Verify bucket `24rx-documents` exists
- Check bucket policy allows public read access

## Production Notes

For production deployment:
- Change MINIO_ROOT_USER and MINIO_ROOT_PASSWORD
- Enable SSL (MINIO_USE_SSL=true)
- Consider using MinIO in distributed mode
- Set up proper backup for D:\minio\data

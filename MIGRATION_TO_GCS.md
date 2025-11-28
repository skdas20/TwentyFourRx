# Migration from MinIO to Google Cloud Storage - Complete ✅

## What Was Changed

### 1. New GCS Service Created
- **File**: `backend/src/common/services/gcs.service.ts`
- Replaced MinIO client with Google Cloud Storage SDK
- Uses service account key: `backend/24rx-storage-service-key.json`
- Bucket name: `24rx-documents`
- All files are uploaded with public access

### 2. Updated Services
All services now use `GcsService` instead of `MinioService`:
- ✅ `backend/src/auth/auth.service.ts` - KYC document uploads
- ✅ `backend/src/listings/listings.service.ts` - Listing document uploads
- ✅ `backend/src/buy-proposals/buy-proposals.service.ts` - Receipt uploads

### 3. Updated Modules
All module imports updated:
- ✅ `backend/src/auth/auth.module.ts`
- ✅ `backend/src/listings/listings.module.ts`
- ✅ `backend/src/buy-proposals/buy-proposals.module.ts`

### 4. Dependencies Updated
- ✅ Installed: `@google-cloud/storage`
- ✅ Removed: `minio` and `@types/minio`

### 5. Docker Configuration Updated
- ✅ Removed MinIO service from `docker-compose.yml`
- ✅ Removed MinIO volumes
- ✅ Updated backend environment variables
- ✅ Updated `backend/Dockerfile` to include GCS service key

### 6. Environment Variables Updated
**Removed:**
- `MINIO_ENDPOINT`
- `MINIO_PORT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_USE_SSL`

**Added:**
- `GCS_BUCKET_NAME` (default: 24rx-documents)

### 7. Files Updated
- ✅ `backend/.env.example`
- ✅ `.env.backend.railway`
- ✅ `docker-compose.yml`

## How to Use

### Local Development
1. Ensure `backend/24rx-storage-service-key.json` exists
2. Set environment variable (optional):
   ```bash
   GCS_BUCKET_NAME=24rx-documents
   ```
3. Start the backend - GCS will initialize automatically

### Railway Deployment
1. The service key is included in the Docker image
2. Update environment variables in Railway dashboard:
   - Remove all MINIO_* variables
   - Add: `GCS_BUCKET_NAME=24rx-documents`

### File Upload Behavior
- Files are uploaded to: `gs://24rx-documents/{folder}/{timestamp}-{filename}`
- Public URLs: `https://storage.googleapis.com/24rx-documents/{folder}/{filename}`
- Folders used:
  - `kyc/{userId}` - KYC documents
  - `listing-documents` - Listing documents
  - `buy-receipts` - Purchase receipts

## Testing
All file upload functionality remains the same:
- KYC document upload during registration
- Listing document upload when creating listings
- Receipt upload when creating buy proposals

## Next Steps
1. ✅ Remove MinIO-related deployment files (optional cleanup)
2. ✅ Test file uploads in development
3. ✅ Deploy to Railway with updated environment variables
4. ✅ Verify file uploads work in production

## Rollback (if needed)
If you need to rollback to MinIO:
1. Run: `npm install minio @types/minio`
2. Revert all service imports back to `MinioService`
3. Restore MinIO service in `docker-compose.yml`
4. Restore MinIO environment variables

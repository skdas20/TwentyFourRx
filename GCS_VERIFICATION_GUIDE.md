# Google Cloud Storage - Verification Guide

## ✅ Migration Complete!

All MinIO references have been replaced with Google Cloud Storage.

---

## How to Verify GCS is Working

### Method 1: Google Cloud Console (Recommended)

1. **Open Google Cloud Console**
   - Go to: https://console.cloud.google.com/storage
   - Login with your Google account

2. **Select Your Project**
   - Project ID: `black-seer-478409-m8`
   - Project Name: Should appear in the top dropdown

3. **View Your Bucket**
   - Click on bucket: `24rx-documents`
   - You'll see folders:
     - `kyc/` - KYC documents from user registration
     - `listing-documents/` - Documents uploaded with listings
     - `buy-receipts/` - Purchase receipts

4. **Check Uploaded Files**
   - Files appear with format: `{folder}/{timestamp}-{filename}`
   - Example: `kyc/1234567890/1701234567890-license.pdf`
   - Click any file to view details or download

### Method 2: Backend Logs

When you start the backend, look for:

```
🔍 Checking Google Cloud Storage bucket: 24rx-documents
✅ GCS bucket already exists: 24rx-documents
```

When uploading files:

```
📤 Uploading to Google Cloud Storage: {
  bucket: '24rx-documents',
  fileName: 'kyc/user-id/timestamp-filename.pdf',
  size: 12345,
  mimetype: 'application/pdf'
}
✅ File uploaded successfully: https://storage.googleapis.com/24rx-documents/...
```

### Method 3: Test File Upload

**Test 1: Register with KYC Document**
1. Go to: http://localhost:3000/auth/register
2. Fill in registration form
3. Upload a KYC document (license, certificate, etc.)
4. Submit registration
5. Check GCS Console → `24rx-documents` → `kyc/` folder

**Test 2: Create Listing with Document**
1. Login as SELLER
2. Go to: Create New Listing
3. Upload a document (invoice, receipt, etc.)
4. Submit listing
5. Check GCS Console → `24rx-documents` → `listing-documents/` folder

**Test 3: Buy Proposal with Receipt**
1. Login as TRADER
2. Create a buy proposal
3. Upload receipt
4. Submit proposal
5. Check GCS Console → `24rx-documents` → `buy-receipts/` folder

---

## File URL Format

All uploaded files are publicly accessible at:
```
https://storage.googleapis.com/24rx-documents/{folder}/{timestamp}-{filename}
```

Example:
```
https://storage.googleapis.com/24rx-documents/kyc/user-123/1701234567890-license.pdf
```

---

## Troubleshooting

### Issue: "GCS initialization warning"

**Solution:**
1. Check service key file exists: `backend/24rx-storage-service-key.json`
2. Verify file has correct JSON format
3. Ensure project ID matches: `black-seer-478409-m8`

### Issue: "Bucket not found"

**Solution:**
1. Create bucket manually in GCS Console
2. Name: `24rx-documents`
3. Location: US (or your preferred region)
4. Storage class: Standard
5. Access control: Fine-grained

### Issue: "Permission denied"

**Solution:**
1. Check service account has Storage Admin role
2. Go to: IAM & Admin → Service Accounts
3. Find: `rx-storage-service-account@black-seer-478409-m8.iam.gserviceaccount.com`
4. Ensure it has: `Storage Admin` or `Storage Object Admin` role

### Issue: "Files not publicly accessible"

**Solution:**
1. The GCS service automatically makes files public on upload
2. If not working, manually set bucket permissions:
   - Go to bucket → Permissions
   - Add: `allUsers` with role `Storage Object Viewer`

---

## Environment Variables

Make sure these are set in `backend/.env`:

```env
# Google Cloud Storage
GCS_BUCKET_NAME=24rx-documents
```

**Note:** The service account key file path is hardcoded in `gcs.service.ts`:
```typescript
const keyFilePath = path.join(process.cwd(), '24rx-storage-service-key.json');
```

---

## Monitoring Storage Usage

### View Storage Metrics
1. Go to: https://console.cloud.google.com/storage/browser
2. Click on `24rx-documents`
3. View:
   - Total size
   - Number of objects
   - Storage class distribution

### Set Up Alerts
1. Go to: Monitoring → Alerting
2. Create alert for:
   - Storage size exceeds threshold
   - Request count anomalies
   - Error rate increases

---

## Cost Estimation

**Google Cloud Storage Pricing (US Region):**
- Storage: $0.020 per GB/month
- Class A operations (uploads): $0.05 per 10,000 operations
- Class B operations (downloads): $0.004 per 10,000 operations
- Network egress: First 1 GB free, then $0.12 per GB

**Example Monthly Cost:**
- 10 GB storage: $0.20
- 1,000 uploads: $0.005
- 10,000 downloads: $0.004
- **Total: ~$0.21/month**

Much cheaper than running MinIO server! 💰

---

## Backup & Recovery

### Automatic Backups
GCS provides:
- 99.999999999% (11 nines) durability
- Automatic replication across multiple locations
- No manual backup needed

### Enable Versioning (Optional)
1. Go to bucket → Configuration
2. Enable "Object Versioning"
3. Previous versions of files are retained

### Lifecycle Policies (Optional)
Set up automatic archival:
1. Go to bucket → Lifecycle
2. Add rule: Move to Nearline after 30 days
3. Add rule: Move to Coldline after 90 days
4. Add rule: Delete after 365 days

---

## Security Best Practices

1. **Service Account Key**
   - Keep `24rx-storage-service-key.json` secure
   - Never commit to Git (already in .gitignore)
   - Rotate keys periodically

2. **Bucket Permissions**
   - Files are public by default (for easy access)
   - Consider signed URLs for sensitive documents

3. **Access Logs**
   - Enable access logging in bucket settings
   - Monitor for unusual activity

---

## Next Steps

1. ✅ Start backend and check logs
2. ✅ Test file upload through UI
3. ✅ Verify files appear in GCS Console
4. ✅ Check file URLs are accessible
5. ✅ Monitor storage usage

---

## Support

If you encounter issues:
1. Check backend logs for error messages
2. Verify service account permissions
3. Ensure bucket exists and is accessible
4. Check network connectivity to GCS

**GCS Documentation:** https://cloud.google.com/storage/docs

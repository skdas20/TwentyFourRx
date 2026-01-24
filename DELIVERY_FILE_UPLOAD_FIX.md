# Delivery File Upload Bug Fix

## Issue
When sellers submitted delivery dispatch forms with courier invoice and package images, the files were NOT being uploaded to Google Cloud Storage. The database showed `invoiceUrl: null` and `packageImageUrl: null` even though tracking number and delivery partner were saved correctly.

## Root Cause
**Mismatch between FormData fieldnames and backend file extraction:**

### Frontend (BEFORE):
```typescript
formData.append('files', file, 'invoice');  // fieldname = 'files', filename = 'invoice'
formData.append('files', packageImage, 'packageImage');  // fieldname = 'files', filename = 'packageImage'
```

### Backend Controller (BEFORE):
```typescript
@UseInterceptors(FilesInterceptor('files', 2))  // Extracts all files with fieldname 'files'
async markDispatched(
  @UploadedFiles() files: Express.Multer.File[],
  ...
) {
  const invoiceFile = files?.find(f => f.fieldname === 'invoice');  // ❌ Never found!
  const packageImageFile = files?.find(f => f.fieldname === 'packageImage');  // ❌ Never found!
}
```

**Problem**: `FilesInterceptor('files', 2)` extracts files with fieldname `'files'`, but the service tried to find files by `fieldname === 'invoice'` or `fieldname === 'packageImage'`. Since all files had fieldname `'files'`, they were never found, so `invoiceFile` and `packageImageFile` were always `undefined`.

## Solution
Use `FileFieldsInterceptor` to properly handle multiple files with different fieldnames:

### Frontend (AFTER):
```typescript
formData.append('invoice', file);  // fieldname = 'invoice'
formData.append('packageImage', packageImage);  // fieldname = 'packageImage'
```

### Backend Controller (AFTER):
```typescript
@UseInterceptors(FileFieldsInterceptor([
  { name: 'invoice', maxCount: 1 },
  { name: 'packageImage', maxCount: 1 },
]))
async markDispatched(
  @UploadedFiles() files: { invoice?: Express.Multer.File[], packageImage?: Express.Multer.File[] },
  ...
) {
  const invoiceFile = files?.invoice?.[0];  // ✅ Correctly extracted
  const packageImageFile = files?.packageImage?.[0];  // ✅ Correctly extracted
}
```

## Changes Made

### 1. Backend Controller (`backend/src/delivery-requests/delivery-requests.controller.ts`)
- Added `FileFieldsInterceptor` import
- Changed from `FilesInterceptor('files', 2)` to `FileFieldsInterceptor([...])`
- Updated file extraction logic to use the fields object structure

### 2. Frontend (`frontend/app/dashboard/seller/deliveries/page.tsx`)
- Changed `formData.append('files', file, 'invoice')` to `formData.append('invoice', file)`
- Changed `formData.append('files', packageImage, 'packageImage')` to `formData.append('packageImage', packageImage)`

## Testing
After this fix:
1. Sellers can upload courier invoice (required) and package image (optional)
2. Files are properly uploaded to GCS buckets:
   - Invoice → `delivery-receipts/` folder
   - Package image → `package-images/` folder
3. Database correctly stores `invoiceUrl` and `packageImageUrl`
4. Admin can view both documents in the delivery requests panel

## Deployment Status
- ✅ Code committed and pushed to GitHub (commit: 8899c3a)
- ✅ Backend built successfully
- ⏳ Needs deployment to production server

## Next Steps
1. Deploy backend to production server
2. Test file upload with actual files
3. Verify GCS upload is working correctly
4. Confirm admin can see uploaded documents

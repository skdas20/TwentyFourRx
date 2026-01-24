# Delivery Documents Display - Debugging Guide

## Issue
Admin cannot see the courier invoice or package picture after seller uploads them.

## Root Cause Analysis

The issue is likely one of the following:

### 1. **Backend Server Not Restarted** (Most Likely)
After running `prisma db push` and `prisma generate`, the backend server needs to be restarted to load the new Prisma client that knows about the `packageImageUrl` field.

**Solution**:
```bash
# Stop the backend if running
# Then restart it
cd backend
npm run build
npm run start:dev
# OR if using production
npm run start:prod
```

### 2. **Database Column Not Added**
The `package_image_url` column might not exist in the database.

**Check**:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'delivery_requests' 
AND column_name = 'package_image_url';
```

**Solution**:
```bash
cd backend
npx prisma db push
```

### 3. **Files Not Uploaded Properly**
The seller might not have actually uploaded the files, or the upload failed.

**Check Backend Logs** for upload errors when seller submits the form.

## Debugging Steps

### Step 1: Check Browser Console
I've added console logging to the admin page. Open the browser console (F12) and check for:

```
📦 Delivery Requests Response: [...]
📦 First Request: {...}
📦 Selected Request: {...}
📦 Invoice URL: https://...
📦 Package Image URL: https://...
```

**What to look for**:
- If `invoiceUrl` and `packageImageUrl` are `null` or `undefined`, the backend isn't returning them
- If they have values but don't display, it's a frontend rendering issue

### Step 2: Check Backend Response
Use the browser Network tab (F12 → Network) and look for the request to `/delivery-requests?status=PENDING`

**Check the response JSON**:
```json
{
  "id": "...",
  "invoiceUrl": "https://storage.googleapis.com/...",
  "packageImageUrl": "https://storage.googleapis.com/...",
  ...
}
```

### Step 3: Check Database Directly
Connect to your database and check if the URLs are stored:

```sql
SELECT id, invoice_url, package_image_url, status 
FROM delivery_requests 
WHERE status = 'PENDING'
ORDER BY created_at DESC 
LIMIT 5;
```

### Step 4: Test File Upload
1. As a seller, create a new delivery request
2. Upload both invoice and package image
3. Check backend logs for upload success messages
4. Check if files appear in Google Cloud Storage

## Expected Behavior

### Seller Side
1. Seller uploads:
   - Tracking number ✓
   - Delivery partner ✓
   - Courier invoice (PDF/image) ✓
   - Package photo (optional) ✓

2. Backend receives files and uploads to GCS
3. Backend stores URLs in database:
   - `invoice_url` → GCS URL
   - `package_image_url` → GCS URL (if provided)

### Admin Side
1. Admin sees delivery request in PENDING status
2. Admin clicks on request to view details
3. Admin sees "Dispatch Proof" section with:
   - "View Invoice" button (if `invoiceUrl` exists)
   - "View Package Photo" button (if `packageImageUrl` exists)
4. Clicking buttons opens files in new tab

## Quick Fix Checklist

- [ ] Run `npx prisma db push` in backend directory
- [ ] Run `npx prisma generate` in backend directory
- [ ] Rebuild backend: `npm run build`
- [ ] Restart backend server
- [ ] Clear browser cache and reload admin page
- [ ] Check browser console for the debug logs
- [ ] Test with a fresh delivery request

## Code Locations

### Backend
- **Service**: `backend/src/delivery-requests/delivery-requests.service.ts`
  - `markDispatched()` method handles file uploads
  - `getAllRequests()` method returns data to admin

- **Controller**: `backend/src/delivery-requests/delivery-requests.controller.ts`
  - `/delivery-requests/:id/dispatch` endpoint accepts files

- **Schema**: `backend/prisma/schema.prisma`
  - `DeliveryRequest` model has `packageImageUrl` field

### Frontend
- **Admin Page**: `frontend/app/dashboard/admin/delivery-requests/page.tsx`
  - Lines 274-295: Display logic for invoice and package image
  - Console logs added for debugging

- **Seller Page**: `frontend/app/dashboard/seller/deliveries/page.tsx`
  - Upload form with both file inputs

## Testing After Fix

1. **Create Test Delivery Request**:
   - Login as buyer
   - Request delivery for an inventory item

2. **Upload Documents as Seller**:
   - Login as seller
   - Go to deliveries page
   - Upload tracking, partner, invoice, and package photo
   - Submit

3. **Verify as Admin**:
   - Login as admin
   - Go to delivery requests
   - Filter by PENDING
   - Click on the request
   - Verify both "View Invoice" and "View Package Photo" buttons appear
   - Click each button to verify files open correctly

## Common Issues

### Issue: "Column does not exist" Error
**Cause**: Database not migrated
**Fix**: Run `npx prisma db push`

### Issue: Files Upload But URLs Not Saved
**Cause**: Backend not restarted after Prisma generate
**Fix**: Restart backend server

### Issue: Buttons Don't Appear
**Cause**: Frontend not checking for the fields correctly
**Fix**: Check browser console logs to see if URLs are in the data

### Issue: Files Upload to Wrong Location
**Cause**: GCS configuration issue
**Fix**: Check `backend/src/common/services/gcs.service.ts` and GCS credentials

---
**Date**: January 24, 2026
**Status**: Debugging in progress
**Related**: DELIVERY_PACKAGE_IMAGE_AND_QUERY_FIX.md

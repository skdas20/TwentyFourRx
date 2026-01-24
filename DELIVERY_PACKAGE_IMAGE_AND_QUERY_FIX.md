# Delivery Request Enhancements

## Changes Summary

### 1. Added Package Image Upload Field
**Feature**: Sellers can now upload a photo of the packaged medicine when confirming dispatch.

**Benefits**:
- Provides visual proof of packaging for admin verification
- Helps resolve delivery disputes
- Improves transparency in the delivery process

**Implementation**:
- Added `packageImageUrl` field to `DeliveryRequest` model in database
- Updated backend service to handle package image upload
- Modified controller to accept multiple files (invoice + package image)
- Updated frontend seller deliveries page with package image upload field
- Admin can view both invoice and package photo when reviewing delivery requests

### 2. Fixed "No Delivery Requests" Issue
**Problem**: When sellers clicked on delivery request notifications, the page showed "No Delivery Requests" even though they had pending requests.

**Root Cause**: The `getMyRequests` method was filtering by `inventoryLot.userId` (the current owner/buyer), not the original seller who needs to ship the medicine.

**Fix**: Updated the query to fetch delivery requests where the user is the ORIGINAL SELLER by following the chain:
```
InventoryLot → sourceOrder → listing → seller
```

Now sellers will see delivery requests for medicines they originally sold, even after the buyer purchased them.

## Files Modified

### Backend
1. **`backend/prisma/schema.prisma`**
   - Added `packageImageUrl` field to `DeliveryRequest` model

2. **`backend/src/delivery-requests/delivery-requests.service.ts`**
   - Updated `getMyRequests()` to query by original seller ID
   - Updated `markDispatched()` to accept and upload package image
   - Fixed seller verification to check original seller from listing
   - Added package image URL to admin notification emails

3. **`backend/src/delivery-requests/delivery-requests.controller.ts`**
   - Changed from `FileInterceptor` to `FilesInterceptor` to handle multiple files
   - Updated to extract both invoice and package image from files array

4. **`backend/prisma/migrations/20250124000000_add_package_image_to_delivery_requests/migration.sql`**
   - Migration to add `package_image_url` column

### Frontend
1. **`frontend/app/dashboard/seller/deliveries/page.tsx`**
   - Added package image upload field (optional)
   - Updated form submission to send both invoice and package image
   - Added state management for package image selection

2. **`frontend/app/dashboard/admin/delivery-requests/page.tsx`**
   - Updated to display package image link alongside invoice
   - Improved UI with separate buttons for viewing invoice and package photo

## Database Migration Required

Run this migration on the production database:
```sql
ALTER TABLE "delivery_requests" ADD COLUMN "package_image_url" TEXT;
```

Or use Prisma migrate:
```bash
cd backend
npx prisma migrate deploy
```

## Testing Checklist

### Seller Flow
- [ ] Seller receives notification when buyer requests delivery
- [ ] Seller can see the delivery request in their deliveries page
- [ ] Seller can upload tracking number, delivery partner, invoice, and package photo
- [ ] Package photo upload is optional (form submits without it)
- [ ] Seller receives confirmation after successful submission

### Admin Flow
- [ ] Admin receives notification when seller confirms dispatch
- [ ] Admin can view both invoice and package photo (if uploaded)
- [ ] Admin can approve/reject the delivery request
- [ ] Package photo link opens in new tab

### Buyer Flow
- [ ] Buyer receives notification when seller confirms dispatch
- [ ] Buyer receives OTP after admin approval

## API Changes

### POST `/delivery-requests/:id/dispatch`
**Before**: Accepted single file with fieldname `invoice`
**After**: Accepts multiple files with fieldnames:
- `invoice` (required)
- `packageImage` (optional)

**Request Format**:
```javascript
const formData = new FormData();
formData.append('files', invoiceFile, 'invoice');
formData.append('files', packageImageFile, 'packageImage');
formData.append('trackingNumber', '1234567890');
formData.append('deliveryPartner', 'Blue Dart');
```

## Deployment Steps

1. **Pull latest code**:
   ```bash
   cd ~/24rx
   git pull origin main
   ```

2. **Run database migration**:
   ```bash
   cd backend
   npx prisma migrate deploy
   # OR manually run the SQL:
   # psql -U 24rx_user -d 24rx_db -c "ALTER TABLE delivery_requests ADD COLUMN package_image_url TEXT;"
   ```

3. **Rebuild and restart backend**:
   ```bash
   npm install
   npx prisma generate
   npm run build
   sudo systemctl restart 24rx-backend
   ```

4. **Rebuild and restart frontend**:
   ```bash
   cd ../frontend
   npm install
   npm run build
   sudo systemctl restart 24rx-frontend
   ```

5. **Verify services**:
   ```bash
   sudo systemctl status 24rx-backend
   sudo systemctl status 24rx-frontend
   ```

## Status
✅ **Code Complete**: All changes implemented
✅ **Backend Built**: Successfully compiled
✅ **Frontend Built**: Successfully compiled
✅ **Committed**: Changes pushed to GitHub (commit: 4716d82)
❌ **Not Deployed**: Needs deployment to production server
❌ **Migration Not Run**: Database migration pending

---
**Date**: January 24, 2026
**Commit**: 4716d82
**Related**: DELIVERY_NOTIFICATION_FIX.md

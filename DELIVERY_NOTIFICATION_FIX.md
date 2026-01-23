# Delivery Request Notification Bug Fix

## Issue Summary
**CRITICAL BUG**: When a buyer requested delivery, the notification was incorrectly sent to the BUYER instead of the SELLER who needs to ship the medicine.

## Root Cause
In `backend/src/delivery-requests/delivery-requests.service.ts`, the `createRequest` method was fetching `lot.userId` which represents the CURRENT OWNER (the buyer), not the original seller who should ship the medicine.

## Fix Applied
Modified the code to fetch the ORIGINAL SELLER from the order chain:
- Query: `InventoryLot` → `sourceOrder` → `listing` → `seller`
- This correctly identifies the seller who originally listed the medicine and should handle shipping

### Code Changes (Lines 60-82)
```typescript
// Get the ORIGINAL SELLER (from the source order/listing) who should ship the medicine
// NOT the current inventory owner (buyer)
const inventoryWithOrder = await this.prisma.inventoryLot.findUnique({
    where: { id: inventoryLotId },
    include: {
        sourceOrder: {
            include: {
                listing: {
                    include: {
                        seller: {
                            select: { id: true, name: true, email: true, phone: true },
                        },
                    },
                },
            },
        },
    },
});

if (!inventoryWithOrder?.sourceOrder?.listing?.seller) {
    throw new NotFoundException('Original seller not found for this inventory. Cannot process delivery request.');
}

const seller = inventoryWithOrder.sourceOrder.listing.seller;
```

## Status
✅ **Code Fixed**: Modified `delivery-requests.service.ts`
✅ **Backend Built**: Successfully compiled with `npm run build`
✅ **Committed**: Changes pushed to GitHub (commit: be17f27)
❌ **Not Deployed**: SSH connection issue prevents deployment

## Deployment Required
The fix needs to be deployed to the production server. Two options:

### Option 1: Run UPDATE_SERVER.sh Script
```bash
# SSH into server
vx ssh meds

# Navigate to project directory
cd ~/24rx

# Run update script
bash UPDATE_SERVER.sh
```

### Option 2: Manual Deployment
```bash
# SSH into server
vx ssh meds

# Pull latest code
cd ~/24rx
git pull origin main

# Rebuild backend
cd backend
npm install
npm run build

# Restart backend service
sudo systemctl restart 24rx-backend

# Check status
sudo systemctl status 24rx-backend
```

## Testing After Deployment
1. Login as a buyer (e.g., "aryan")
2. Request delivery for an inventory item
3. Verify notification goes to the SELLER (not the buyer)
4. Check:
   - In-app notification appears for seller
   - Email sent to seller's email address
   - SMS sent to seller's phone (if configured)

## Files Modified
- `backend/src/delivery-requests/delivery-requests.service.ts` (lines 60-82)

## Related Files
- `backend/src/delivery-requests/delivery-requests.controller.ts`
- `backend/prisma/schema.prisma` (InventoryLot, Order, Listing relationships)

---
**Date**: January 23, 2026
**Commit**: be17f27

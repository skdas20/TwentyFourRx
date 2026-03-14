# Complete Delivery Flow Implementation

## Summary
Implemented complete 8-step physical delivery request flow with payment, invoicing, and courier tracking.

## Database Changes

### Schema Updates (`backend/prisma/schema.prisma`)
- **New Statuses**: 
  - `AWAITING_SELLER_INFO` - Seller needs to provide shipping details
  - `AWAITING_PAYMENT` - Proforma invoice sent, buyer needs to pay
  - `PAYMENT_PENDING_VERIFICATION` - Admin needs to verify payment
  - `AWAITING_SELLER_INVOICE` - Seller needs to upload invoice
  - `AWAITING_ADMIN_DISPATCH` - Admin needs to initiate dispatch
  - `AWAITING_COURIER_PICKUP` - Courier needs to pick up
  - `DISPATCHED` - Courier picked up
  - `IN_TRANSIT` - At hub
  - `OUT_FOR_DELIVERY` - Out for delivery
  - `PENDING_OTP_VERIFICATION` - Awaiting OTP
  - `DELIVERED` - Complete

- **New Fields**:
  - `batchNumber` - Batch number from seller
  - `expiryDate` - Expiry date from seller
  - `parcelWeightKg` - Weight in KG
  - `transportMode` - 'ROAD' or 'AIR'
  - `deliveryCharge` - Calculated charge (₹60/kg road, ₹120/kg air)
  - `proformaInvoiceUrl` - Generated proforma invoice
  - `paymentReceiptUrl` - Buyer's payment proof
  - `sellerInvoiceUrl` - Seller's invoice to 24Rx
  - `adminInvoiceUrl` - Admin's final invoice
  - `sourceAddress` - Pickup address
  - `destinationAddress` - Delivery address
  - Timestamps for each step

### Migration
- File: `backend/prisma/migrations/20260221000000_delivery_flow_complete/migration.sql`
- Run: `npx prisma migrate deploy` (on server)

## Backend Service (`backend/src/delivery-requests/delivery-requests.service.ts`)

### Complete Flow Methods:

1. **createRequest()** - Buyer creates delivery request
   - Status: `AWAITING_SELLER_INFO`
   - Notifies seller to provide shipping details

2. **submitShippingDetails()** - Seller provides batch, expiry, weight, transport mode
   - Calculates delivery charge
   - Generates proforma invoice PDF
   - Status: `AWAITING_PAYMENT`
   - Sends proforma invoice to buyer

3. **uploadPaymentReceipt()** - Buyer uploads payment proof
   - Status: `PAYMENT_PENDING_VERIFICATION`
   - Notifies admin to verify

4. **verifyPayment()** - Admin verifies payment
   - If approved: Status → `AWAITING_SELLER_INVOICE`
   - If rejected: Status → `AWAITING_PAYMENT` (buyer re-uploads)
   - Notifies seller to upload invoice

5. **uploadSellerInvoice()** - Seller uploads invoice to 24Rx
   - Status: `AWAITING_ADMIN_DISPATCH`
   - Notifies admin to dispatch

6. **initiateDispatch()** - Admin uploads final invoice, sets addresses, assigns courier
   - Status: `AWAITING_COURIER_PICKUP`
   - Notifies courier

7. **updateCourierStatus()** - Courier updates status
   - `DISPATCHED` - Picked up
   - `IN_TRANSIT` - At hub
   - `OUT_FOR_DELIVERY` - Generates & sends OTP to buyer
   - Auto-transitions to `PENDING_OTP_VERIFICATION`

8. **confirmDeliveryWithOtp()** - Buyer confirms with OTP
   - Status: `DELIVERED`
   - Notifies admin & courier

### Helper Methods:
- `getMyRequests()` - Buyer's requests
- `getSellerRequests()` - Seller's requests
- `getCourierRequests()` - Courier's requests
- `getAllRequests()` - Admin view

## PDF Service Updates (`backend/src/common/services/pdf.service.ts`)

### New Method:
- `generateProformaInvoice(data)` - Generates delivery charge invoice PDF
  - Professional layout with 24Rx branding
  - Shows weight, transport mode, rate, total
  - Returns Buffer for upload

## GCS Service Updates (`backend/src/common/services/gcs.service.ts`)

### New Method:
- `uploadBuffer(buffer, folder, fileName)` - Uploads PDF buffer to GCS
  - Used for proforma invoices
  - Returns public URL

## Delivery Rates
- **Road**: ₹60 per kg
- **Air**: ₹120 per kg

## Next Steps

### Controller Updates Needed:
- Add endpoints for all 8 steps
- File upload handling for receipts/invoices
- Role-based access control

### Frontend Updates Needed:
1. **Buyer Portfolio**:
   - "Request Delivery" button
   - Upload payment receipt
   - Enter OTP for confirmation
   - View proforma invoice

2. **Seller Dashboard**:
   - Form: batch, expiry, weight, transport mode
   - Upload invoice to 24Rx

3. **Admin Dashboard**:
   - Verify payment receipts
   - Upload admin invoice
   - Set addresses
   - Assign courier

4. **Courier Dashboard**:
   - Update delivery status
   - View addresses & invoices

## Testing Checklist
- [ ] Database migration runs successfully
- [ ] All 8 steps work end-to-end
- [ ] PDF generation works
- [ ] File uploads work
- [ ] OTP generation & validation works
- [ ] Notifications sent at each step
- [ ] Emails sent with correct templates
- [ ] Role-based access enforced

## Deployment
1. Push to GitHub
2. CI/CD auto-deploys
3. Run migration on server:
   ```bash
   cd ~/24rx/backend
   npx prisma migrate deploy
   ```
4. Restart backend:
   ```bash
   sudo systemctl restart 24rx-backend
   ```

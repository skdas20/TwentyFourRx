# Delivery Flow - Remaining Work

## Current Status
✅ Backend 8-step flow COMPLETE
✅ Seller deliveries page updated for new flow
✅ Courier dashboard working
❌ Buyer portfolio page needs update
❌ Admin delivery requests page needs update

## Issues to Fix

### 1. Proforma Invoice Format
- **Issue**: PI shows seller details instead of buyer details
- **Location**: `backend/src/delivery-requests/delivery-requests.service.ts` line 837-856
- **Fix**: Verify the `invoiceData.buyer` object is using `request.requester` (buyer) not seller

### 2. Portfolio Page - Upload Payment Receipt
- **Issue**: After PI received (status: AWAITING_PAYMENT), buyer can't upload payment receipt
- **Location**: `frontend/app/portfolio/page.tsx`
- **What to do**:
  1. Add new statuses to the status switch (lines 113-130):
     - AWAITING_SELLER_INFO
     - AWAITING_PAYMENT (should show "Upload Payment Receipt" button)
     - PAYMENT_PENDING_VERIFICATION
     - AWAITING_SELLER_INVOICE
     - AWAITING_ADMIN_DISPATCH
  2. Update the delivery button logic (around line 464) to:
     - Show "Upload Payment Receipt" when status is AWAITING_PAYMENT
     - Show "View Proforma Invoice" link
     - Show "Confirm Delivery (OTP)" when status is PENDING_OTP_VERIFICATION
  3. Add payment receipt upload handler:
     - Endpoint: `POST /delivery-requests/:id/payment-receipt`
     - FormData with `paymentReceipt` file
  4. Add OTP confirmation handler:
     - Endpoint: `POST /delivery-requests/:id/confirm-delivery`
     - Body: `{ otp: string }`

### 3. Admin Delivery Requests Page
- **Location**: `frontend/app/dashboard/admin/delivery-requests/page.tsx`
- **What to do**:
  1. Update to show all new statuses
  2. Add "Verify Payment" action for PAYMENT_PENDING_VERIFICATION status:
     - Endpoint: `POST /delivery-requests/:id/verify-payment`
     - Body: `{ approved: boolean, note?: string }`
  3. Add "Initiate Dispatch" action for AWAITING_ADMIN_DISPATCH status:
     - Endpoint: `POST /delivery-requests/:id/initiate-dispatch`
     - FormData with: sourceAddress, destinationAddress, adminInvoice file, optional courierPartnerId

## Backend Endpoints (Already Implemented)
- ✅ POST /:id/shipping-details - Seller provides details
- ✅ POST /:id/payment-receipt - Buyer uploads receipt
- ✅ POST /:id/verify-payment - Admin verifies payment
- ✅ POST /:id/seller-invoice - Seller uploads invoice
- ✅ POST /:id/initiate-dispatch - Admin dispatches
- ✅ POST /courier/:id/accept - Courier accepts
- ✅ POST /courier/:id/status - Courier updates status
- ✅ POST /:id/confirm-delivery - Buyer confirms with OTP

## Complete 8-Step Flow

1. **Buyer creates delivery request** → Status: AWAITING_SELLER_INFO
2. **Seller provides shipping details** (batch, expiry, weight, transport, package image) → Status: AWAITING_PAYMENT, PI generated
3. **Buyer uploads payment receipt** → Status: PAYMENT_PENDING_VERIFICATION
4. **Admin verifies payment** → Status: AWAITING_SELLER_INVOICE
5. **Seller uploads invoice** → Status: AWAITING_ADMIN_DISPATCH
6. **Admin dispatches** (addresses, invoice, courier) → Status: AWAITING_COURIER_PICKUP
7. **Courier updates status** (DISPATCHED → IN_TRANSIT → OUT_FOR_DELIVERY) → OTP sent
8. **Buyer confirms with OTP** → Status: DELIVERED

## Priority
1. Fix portfolio page to show "Upload Payment Receipt" button for AWAITING_PAYMENT status
2. Fix proforma invoice buyer details
3. Update admin page for payment verification and dispatch

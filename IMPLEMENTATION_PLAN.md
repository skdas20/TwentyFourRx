# Comprehensive Implementation Plan: Notifications, Invoice Upload & Support System

## Overview
This document outlines the complete implementation for:
1. Functional notification system
2. Seller invoice upload for delivery
3. Admin verification workflow
4. Support ticket system for buyers

---

## Database Changes (COMPLETED ✅)

### 1. DeliveryRequest Model
- Added `invoiceUrl` field for seller invoice upload

### 2. SupportTicket Model (NEW)
```prisma
model SupportTicket {
  id                String   @id
  userId            String   // Buyer who created ticket
  deliveryRequestId String?  // Optional: related delivery request
  subject           String
  message           String
  status            String   // OPEN, IN_PROGRESS, RESOLVED, CLOSED
  adminResponse     String?
  createdAt         DateTime
  updatedAt         DateTime
  resolvedAt        DateTime?
}
```

---

## Backend Implementation

### Phase 1: Support Ticket System

#### A. Create Support Module
**File:** `backend/src/support/support.service.ts`
- `createTicket(userId, data)` - Buyer creates support ticket
- `getMyTickets(userId)` - Buyer views their tickets
- `getAllTickets()` - Admin views all tickets (ADMIN only)
- `respondToTicket(ticketId, response)` - Admin responds (ADMIN only)
- `resolveTicket(ticketId)` - Admin closes ticket (ADMIN only)

**File:** `backend/src/support/support.controller.ts`
- `POST /support` - Create ticket
- `GET /support/my` - Get user's tickets
- `GET /support` - Get all tickets (ADMIN)
- `POST /support/:id/respond` - Admin responds (ADMIN)
- `POST /support/:id/resolve` - Admin resolves (ADMIN)

**File:** `backend/src/support/support.module.ts`

---

### Phase 2: Enhanced Delivery Flow with Invoice

#### A. Update Delivery Service
**File:** `backend/src/delivery-requests/delivery-requests.service.ts`

**Modified `markDispatched()` method:**
```typescript
async markDispatched(requestId: string, invoiceFile: File, sellerId: string) {
  // 1. Upload invoice to Google Cloud Storage
  // 2. Save invoice URL to delivery request
  // 3. Generate OTP
  // 4. Send OTP email to buyer
  // 5. Notify admin for verification
  // 6. Status remains APPROVED (not DISPATCHED yet)
}
```

**New `verifyAndDispatch()` method (ADMIN only):**
```typescript
async verifyAndDispatch(requestId: string, approved: boolean, note?: string) {
  // 1. Admin reviews invoice
  // 2. If approved: status → DISPATCHED
  // 3. If rejected: notify seller, status → APPROVED (retry)
}
```

---

### Phase 3: Notification Enhancements

#### A. Add Notifications for New Events
**File:** `backend/src/notifications/notifications.service.ts`

**New notification triggers:**
1. When buyer purchases medicine → Notify SELLER
2. When buyer requests delivery → Notify SELLER
3. When seller uploads invoice → Notify ADMIN
4. When admin approves dispatch → Notify BUYER (dispatched)
5. When support ticket created → Notify ADMIN

---

## Frontend Implementation

### Phase 1: Functional Notifications Page

**File:** `frontend/app/notifications/page.tsx`
- Fetch real notifications from `/api/notifications`
- Display with proper icons and formatting
- Mark as read functionality
- Filter by type (order, delivery, system, etc.)
- Real-time updates (polling or websockets)

---

### Phase 2: Seller Dispatch Interface

**File:** `frontend/app/dashboard/seller/deliveries/page.tsx`
- List pending delivery requests
- Upload invoice form (Google Cloud Storage)
- Confirm dispatch button
- View dispatch history

**Workflow:**
1. Seller sees notification: "New delivery request"
2. Seller goes to Deliveries page
3. Uploads invoice PDF
4. Clicks "Confirm Dispatch"
5. Request goes to admin for verification

---

### Phase 3: Admin Delivery Verification

**File:** `frontend/app/dashboard/admin/delivery-verification/page.tsx`
- List delivery requests with uploaded invoices
- View invoice (preview or download)
- Approve/Reject buttons
- Add verification notes

**Workflow:**
1. Admin sees notification: "Invoice uploaded for verification"
2. Admin reviews invoice
3. Approves → Status changes to DISPATCHED
4. Buyer sees "Dispatched" in portfolio

---

### Phase 4: Buyer Support System

**File:** `frontend/app/portfolio/page.tsx` (UPDATE)
- Add "Support" button next to each delivery
- Opens support modal

**File:** `frontend/components/SupportModal.tsx` (NEW)
- Subject and message input
- Links to delivery request automatically
- Submit creates support ticket

**File:** `frontend/app/support/page.tsx` (NEW)
- Buyer views all their support tickets
- See admin responses
- Track ticket status

---

### Phase 5: Admin Support Queries

**File:** `frontend/app/dashboard/admin/support/page.tsx`
- List all support tickets
- Filter by status (OPEN, IN_PROGRESS, RESOLVED)
- View ticket details
- Respond to tickets
- Mark as resolved

---

## Updated Delivery Status Flow

```
BUYER CREATES ORDER
      ↓
PENDING (Awaiting admin approval of delivery request)
      ↓
APPROVED (Admin approved, awaiting seller dispatch)
      ↓
SELLER UPLOADS INVOICE + Confirms
      ↓
AWAITING_VERIFICATION (Admin needs to verify invoice)
      ↓
ADMIN APPROVES
      ↓
DISPATCHED (In transit, OTP sent to buyer)
      ↓
BUYER ENTERS OTP
      ↓
DELIVERED (Complete!)
```

**Alternative paths:**
- Admin rejects invoice → Back to APPROVED (seller re-uploads)
- Buyer has issue → Creates support ticket

---

## Google Cloud Storage Setup

**File:** `backend/src/common/services/storage.service.ts`
```typescript
@Injectable()
export class StorageService {
  async uploadInvoice(file: Express.Multer.File, deliveryRequestId: string): Promise<string> {
    // Upload to GCS bucket
    // Return public URL
  }
}
```

**Environment variables needed:**
```
GCS_BUCKET_NAME=your-bucket-name
GCS_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json
```

---

## API Endpoints Summary

### Support Tickets
- `POST /support` - Create ticket
- `GET /support/my` - Get my tickets
- `GET /support` - Get all (ADMIN)
- `POST /support/:id/respond` - Respond (ADMIN)
- `POST /support/:id/resolve` - Resolve (ADMIN)

### Delivery Requests (UPDATED)
- `POST /delivery-requests/:id/dispatch` - Upload invoice & mark dispatched
- `POST /delivery-requests/:id/verify` - Admin verify invoice (NEW)
- `GET /delivery-requests/pending-verification` - Admin get pending (NEW)

### Notifications
- `GET /notifications` - Get my notifications
- `POST /notifications/:id/read` - Mark as read
- `POST /notifications/read-all` - Mark all as read

---

## Migration Steps

1. Run Prisma migration:
   ```bash
   cd backend
   npx prisma migrate dev --name add_invoice_and_support
   ```

2. Install Google Cloud Storage SDK:
   ```bash
   npm install @google-cloud/storage
   ```

3. Set up GCS credentials

4. Create new backend modules

5. Update frontend pages

6. Test complete flow

---

## Testing Checklist

- [ ] Buyer purchases medicine → Seller gets notification
- [ ] Buyer requests delivery → Seller gets notification
- [ ] Seller uploads invoice → Admin gets notification
- [ ] Admin verifies invoice → Buyer sees "DISPATCHED"
- [ ] Buyer enters OTP → Status becomes "DELIVERED"
- [ ] Buyer creates support ticket → Admin sees it
- [ ] Admin responds to ticket → Buyer sees response
- [ ] All notifications display correctly
- [ ] Invoice uploads work correctly

---

## Priority Implementation Order

1. **HIGHEST:** Support ticket system (buyers need help immediately)
2. **HIGH:** Invoice upload for sellers
3. **HIGH:** Admin invoice verification
4. **MEDIUM:** Functional notifications page
5. **LOW:** UI polish and refinements

---

This is a comprehensive plan. Would you like me to start implementing specific parts?

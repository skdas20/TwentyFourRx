# Buy Proposal System Implementation Guide

## ✅ Step 1: Database Schema (COMPLETED)

Added `BuyProposal` model to Prisma schema with:
- Receipt upload support
- Admin approval workflow
- Relations to User, Listing, and Order

## 🔄 Step 2: Run Migration

```bash
cd backend
npx prisma migrate dev --name add_buy_proposals
npx prisma generate
```

## 📝 Step 3: Create Backend Module

### 3.1 Create buy-proposals module
```bash
cd backend/src
nest g module buy-proposals
nest g controller buy-proposals
nest g service buy-proposals
```

### 3.2 Implement BuyProposalsService

Key methods needed:
- `createProposal(buyerId, listingId, qty, orderType, receipt)` - Create proposal with receipt
- `getPendingProposals()` - Get all pending proposals for admin
- `approveProposal(id, reviewerNote)` - Approve and create order
- `rejectProposal(id, reviewerNote)` - Reject proposal

### 3.3 Implement BuyProposalsController

Endpoints needed:
- `POST /buy-proposals` - Create proposal (with file upload)
- `GET /buy-proposals/pending` - Get pending (ADMIN only)
- `GET /buy-proposals/my` - Get user's proposals
- `PATCH /buy-proposals/:id/approve` - Approve (ADMIN only)
- `PATCH /buy-proposals/:id/reject` - Reject (ADMIN only)

## 🎨 Step 4: Update Frontend

### 4.1 Update Medicine Detail Page

Add receipt upload to buy flow:
1. User clicks BUY
2. Modal appears with:
   - Quantity input
   - Receipt/proof upload
   - Confirm button
3. On confirm: Create buy proposal
4. Show "Proposal Pending" message

### 4.2 Add API Client

In `frontend/lib/api.ts`:
```typescript
export const buyProposalsApi = {
  createProposal: (data: FormData) => api.post('/buy-proposals', data),
  getMyProposals: () => api.get('/buy-proposals/my'),
  getPendingProposals: () => api.get('/buy-proposals/pending'),
  approveProposal: (id: string, reviewerNote?: string) => 
    api.patch(`/buy-proposals/${id}/approve`, { reviewerNote }),
  rejectProposal: (id: string, reviewerNote: string) => 
    api.patch(`/buy-proposals/${id}/reject`, { reviewerNote }),
};
```

### 4.3 Create Admin Proposals Page

Update `/frontend/app/dashboard/admin/page.tsx`:
- Add "Pending Buy Proposals" section
- Show proposal details with receipt link
- Approve/Reject buttons

## 🔐 Step 5: Security & Validation

- Validate file types (PDF, JPG, PNG)
- Max file size: 5MB
- Only authenticated users can create proposals
- Only ADMIN can approve/reject

## 📊 Step 6: Testing

Test scenarios:
1. User creates buy proposal with receipt
2. Admin sees proposal in dashboard
3. Admin clicks receipt link (opens in new tab)
4. Admin approves → Order created
5. Admin rejects → User notified

## 🎯 Benefits

- Prevents fraudulent orders
- Admin verification before order creation
- Receipt/proof for all transactions
- Audit trail for compliance

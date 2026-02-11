# Seller Confirmation Flow - Testing Guide

## Prerequisites
- Backend server running: `cd backend && npm run start:dev`
- Frontend server running: `cd frontend && npm run dev`
- Database accessible
- Email service configured (for notification testing)

---

## Test Scenario 1: Seller Confirms Full Quantity

### Steps:
1. **As Buyer (Trader/Seller role)**:
   - Login to the application
   - Browse medicines and select a listing
   - Create a buy proposal with `flowType=SELLER_CONFIRMATION`
   - Note the proposal ID

2. **Verify Database**:
   ```sql
   SELECT id, status, flow_type, seller_timeout_at
   FROM buy_proposals
   WHERE id = 'YOUR_PROPOSAL_ID';
   ```
   Expected: status = 'AWAITING_SELLER', flowType = 'SELLER_CONFIRMATION'

3. **Check Seller Notification**:
   - Login as the seller (who owns the listing)
   - Navigate to `/dashboard/seller/proposals`
   - Verify the proposal appears in the pending list
   - Check email inbox for notification

4. **As Seller**:
   - Click "Confirm" on the proposal
   - Enter batch number (e.g., "BATCH123")
   - Enter expiry date (future date)
   - Enter quantity = SAME as requested
   - Add optional note
   - Submit

5. **Verify Status Change**:
   ```sql
   SELECT status, seller_confirmed_at, confirmed_qty, confirmed_batch_no, confirmed_expiry_date
   FROM buy_proposals
   WHERE id = 'YOUR_PROPOSAL_ID';
   ```
   Expected: status = 'SELLER_CONFIRMED'

6. **As Admin**:
   - Login as admin
   - Navigate to `/dashboard/admin/buy-proposals`
   - Verify the proposal shows "SELLER CONFIRMED" badge
   - Click "Review"
   - Verify seller confirmation details are displayed
   - Upload invoice and approve

---

## Test Scenario 2: Seller Reduces Quantity

### Steps:
1. **As Buyer**: Create proposal (same as Scenario 1)

2. **As Seller**:
   - Confirm proposal but enter confirmedQty < requested qty
   - Example: Requested 100, confirm 70
   - Submit

3. **As Buyer**:
   - Navigate to `/dashboard/my-proposals`
   - See quantity modification details
   - **Option A**: Click "Approve Modified Qty"
   - **Option B**: Click "Reject" with reason

4. **If Approved**: Admin reviews and approves as normal

---

## Test Scenario 3: 24-Hour Reminder & 48-Hour Auto-Reject

### Test 24-Hour Reminder:
```sql
-- Manipulate timestamp for testing
UPDATE buy_proposals
SET created_at = NOW() - INTERVAL '25 hours'
WHERE id = 'YOUR_PROPOSAL_ID';
```

### Test 48-Hour Auto-Reject:
```sql
UPDATE buy_proposals
SET created_at = NOW() - INTERVAL '49 hours'
WHERE id = 'YOUR_PROPOSAL_ID';
```

Then trigger the cron job (manually or wait for hourly run).

---

## API Testing Examples

### Create Proposal with Seller Flow
```bash
curl -X POST http://localhost:4000/api/v1/buy-proposals \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "listingId": "LISTING_ID",
    "qty": 100,
    "orderType": "delivery",
    "flowType": "SELLER_CONFIRMATION"
  }'
```

### Seller Confirm Proposal
```bash
curl -X PATCH http://localhost:4000/api/v1/buy-proposals/PROPOSAL_ID/seller-confirm \
  -H "Authorization: Bearer SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "confirmedQty": 100,
    "batchNo": "BATCH123",
    "expiryDate": "2027-12-31"
  }'
```

---

## Success Criteria

✅ Seller receives email notification
✅ Seller can confirm proposal
✅ Buyer sees quantity modification alerts
✅ Admin sees seller confirmation details
✅ 24-hour reminder works
✅ 48-hour auto-reject works
✅ Legacy flow still works
✅ No errors in console/logs

---

**See SELLER_CONFIRMATION_IMPLEMENTATION_SUMMARY.md for full implementation details.**

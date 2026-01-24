# SMS Fix Summary - Complete Action Plan

## Current Status

❌ **SMS Not Working**
- Error: "Missing TemplateName value"
- Reason: DLT templates not registered
- Impact: Users not receiving SMS notifications

## What is PE Number?

**PE Number** = **Principal Entity Number** = Your business registration ID for sending SMS in India

It's like an Aadhaar card for your business to send SMS legally.

## Why You Need It

TRAI (Telecom Regulatory Authority of India) requires:
1. Every business must register and get PE Number
2. Register SMS templates with DLT
3. Only approved templates can be sent
4. This prevents spam

## Solution: 4-Step Process

### Step 1: Register Business → Get PE Number
**Time**: 2-5 days
**Cost**: ₹0-500
**Action**: 
- Login to https://2factor.in/
- Go to DLT Management
- Register your business entity
- Upload documents (PAN, GST, Incorporation Certificate)
- Submit

**Result**: You'll receive PE Number (16-digit number)

### Step 2: Register Sender ID
**Time**: 1-2 days
**Cost**: ₹0-1000
**Action**:
- Register Sender ID: `24RXMD`
- Type: Transactional
- Submit

**Result**: Sender ID approved (SMS will show "24RXMD")

### Step 3: Register 6 SMS Templates
**Time**: 24-48 hours each
**Cost**: Free
**Action**: Register these templates:

1. **Buy Proposal Created**
   ```
   Your buy proposal for {#var#} has been created on 24Rx. Proposal ID: {#var#}. We will notify you once reviewed. - 24Rx
   ```

2. **Buy Proposal Approved**
   ```
   Great news! Your buy proposal for {#var#} has been approved on 24Rx. The seller will contact you soon. Check: {#var#} - 24Rx
   ```

3. **Buy Request Received**
   ```
   New buy request for {#var#} on 24Rx. Quantity: {#var#} units. Please upload invoice to proceed: {#var#} - 24Rx
   ```

4. **Delivery Requested**
   ```
   Delivery requested for {#var#} on 24Rx. Quantity: {#var#} units. Upload courier invoice: {#var#} - 24Rx
   ```

5. **Account Approved**
   ```
   Welcome to 24Rx! Your account has been approved. You can now start trading medicines. Login: {#var#} - 24Rx
   ```

6. **OTP Verification**
   ```
   Your 24Rx verification code is {#var#}. Valid for 10 minutes. Do not share this code with anyone. - 24Rx
   ```

**Result**: You'll receive Template IDs for each

### Step 4: Update Backend
**Time**: 15 minutes
**Cost**: Free
**Action**:

1. Add to `backend/.env`:
   ```bash
   TWOFACTOR_PE_NUMBER=your_pe_number_here
   TWOFACTOR_TEMPLATE_PROPOSAL_CREATED=template_id_1
   TWOFACTOR_TEMPLATE_PROPOSAL_APPROVED=template_id_2
   TWOFACTOR_TEMPLATE_BUY_REQUEST=template_id_3
   TWOFACTOR_TEMPLATE_DELIVERY=template_id_4
   TWOFACTOR_TEMPLATE_ACCOUNT_APPROVED=template_id_5
   TWOFACTOR_TEMPLATE_OTP=template_id_6
   ```

2. Replace SMS service:
   ```bash
   cp backend/src/common/services/sms.service.DLT-READY.ts backend/src/common/services/sms.service.ts
   ```

3. Build and deploy:
   ```bash
   cd backend
   npm run build
   git add .
   git commit -m "Enable DLT SMS templates"
   git push
   ```

4. Restart on server:
   ```bash
   vx ssh meds
   cd /var/www/24rx/backend
   git pull
   npm run build
   pm2 restart 24rx-backend
   ```

**Result**: SMS working! ✅

## Timeline

| Day | Activity | Duration |
|-----|----------|----------|
| Day 0 | Prepare documents | 1 hour |
| Day 0 | Submit PE Number registration | 30 min |
| Day 2-5 | Wait for PE Number approval | - |
| Day 5 | Submit Sender ID registration | 15 min |
| Day 6-7 | Wait for Sender ID approval | - |
| Day 7 | Submit 6 templates | 30 min |
| Day 8-9 | Wait for template approvals | - |
| Day 9 | Update backend & deploy | 15 min |
| Day 10 | **SMS WORKING** ✅ | - |

**Total Time**: 7-10 days
**Total Cost**: ₹0-1500

## Documents Needed

- [ ] Business PAN Card
- [ ] GST Certificate (if registered)
- [ ] Certificate of Incorporation / Partnership Deed
- [ ] Address Proof (Electricity bill / Rent agreement)
- [ ] Authorized Signatory ID (Aadhaar/PAN)

## Files Created for You

1. **DLT_REGISTRATION_COMPLETE_GUIDE.md** - Detailed explanation of entire process
2. **DLT_QUICK_START_CHECKLIST.md** - Step-by-step checklist with checkboxes
3. **PE_NUMBER_EXPLAINED.md** - Simple explanation of what PE Number is
4. **sms.service.DLT-READY.ts** - Updated SMS service ready to use with templates
5. **SMS_FIX_SUMMARY.md** - This file (quick overview)

## Quick Start

**Start Here**:
1. Open `DLT_QUICK_START_CHECKLIST.md`
2. Follow the checklist step by step
3. Check off items as you complete them

**Need More Details?**:
- Read `DLT_REGISTRATION_COMPLETE_GUIDE.md`
- Read `PE_NUMBER_EXPLAINED.md`

## Support

- **2Factor Support**: support@2factor.in
- **2Factor Phone**: +91-80-6191-4321
- **2Factor Dashboard**: https://2factor.in/

## What Happens After?

Once DLT is set up:
- ✅ Users receive SMS for buy proposals
- ✅ Sellers get SMS for delivery requests
- ✅ Account approval SMS sent
- ✅ OTP SMS working
- ✅ All notifications delivered instantly

## Cost Breakdown

| Item | Cost |
|------|------|
| PE Number Registration | ₹0-500 |
| Sender ID Registration | ₹0-1000 |
| Template Registration (6 templates) | ₹0 |
| SMS Delivery (per SMS) | ₹0.15-0.25 |
| **Total Setup** | **₹0-1500** |

**Note**: You already have 2000 SMS credits (worth ₹300-500)

## Next Action

**RIGHT NOW**:
1. Login to https://2factor.in/
2. Look for "DLT Management" or "Template Management"
3. Click "Register Entity"
4. Start filling the form

**Questions?** Read the detailed guides or contact 2Factor support.

---

**Remember**: PE Number is just your business registration ID for SMS. Once you have it, everything else is straightforward!

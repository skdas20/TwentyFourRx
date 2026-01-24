# DLT Registration Quick Start Checklist

## 📋 What You Need to Know

**PE Number** = Principal Entity Number = Your business registration ID on DLT platform

Think of it like:
- **Aadhaar** for individuals
- **PE Number** for businesses sending SMS

## ✅ Step-by-Step Checklist

### Phase 1: Prepare Documents (Today - 1 hour)

- [ ] **Business Documents**
  - [ ] PAN Card (business)
  - [ ] GST Certificate (if registered)
  - [ ] Certificate of Incorporation / Partnership Deed / Proprietorship Proof
  - [ ] Address Proof (Electricity bill / Rent agreement)
  - [ ] Authorized Signatory ID (Aadhaar/PAN/Passport)

- [ ] **Business Information**
  - [ ] Registered Business Name: _______________
  - [ ] Business Type: [ ] Pvt Ltd [ ] LLP [ ] Partnership [ ] Proprietorship
  - [ ] Business Address: _______________
  - [ ] Contact Person Name: _______________
  - [ ] Contact Email: _______________
  - [ ] Contact Phone: _______________

### Phase 2: Register PE Number (Day 1 - 30 minutes)

- [ ] **Login to 2Factor**
  - URL: https://2factor.in/
  - Username: _______________
  - Password: _______________

- [ ] **Navigate to DLT Section**
  - [ ] Find "DLT Management" or "Template Management"
  - [ ] Click "Register Entity" or "Add Entity"

- [ ] **Fill Registration Form**
  - [ ] Business Name
  - [ ] Business Type
  - [ ] PAN Number
  - [ ] GST Number (if applicable)
  - [ ] Address
  - [ ] Contact Details

- [ ] **Upload Documents**
  - [ ] Certificate of Incorporation
  - [ ] PAN Card
  - [ ] GST Certificate
  - [ ] Address Proof
  - [ ] ID Proof

- [ ] **Submit for Approval**
  - [ ] Review all details
  - [ ] Submit
  - [ ] Note down application reference number: _______________

**Expected Time**: 2-5 business days
**You'll Receive**: PE Number via email

### Phase 3: Register Sender ID (After PE Number - 15 minutes)

- [ ] **Wait for PE Number Approval**
  - [ ] Check email for PE Number
  - [ ] PE Number received: _______________

- [ ] **Register Sender ID**
  - [ ] Go to "Header Registration" in DLT portal
  - [ ] Enter Sender ID: `24RXMD`
  - [ ] Select Type: Transactional
  - [ ] Upload letterhead/trademark (if any)
  - [ ] Submit

**Expected Time**: 1-2 business days
**You'll Receive**: Sender ID approval confirmation

### Phase 4: Register SMS Templates (After Sender ID - 30 minutes)

- [ ] **Wait for Sender ID Approval**
  - [ ] Sender ID approved: [ ] Yes [ ] No

- [ ] **Register Template 1: Buy Proposal Created**
  ```
  Your buy proposal for {#var#} has been created on 24Rx. Proposal ID: {#var#}. We will notify you once reviewed. - 24Rx
  ```
  - [ ] Template Name: `Buy_Proposal_Created`
  - [ ] Type: Transactional
  - [ ] Category: Service Explicit
  - [ ] Submitted: [ ] Yes
  - [ ] Template ID received: _______________

- [ ] **Register Template 2: Buy Proposal Approved**
  ```
  Great news! Your buy proposal for {#var#} has been approved on 24Rx. The seller will contact you soon. Check: {#var#} - 24Rx
  ```
  - [ ] Template Name: `Buy_Proposal_Approved`
  - [ ] Type: Transactional
  - [ ] Category: Service Explicit
  - [ ] Submitted: [ ] Yes
  - [ ] Template ID received: _______________

- [ ] **Register Template 3: Buy Request Received**
  ```
  New buy request for {#var#} on 24Rx. Quantity: {#var#} units. Please upload invoice to proceed: {#var#} - 24Rx
  ```
  - [ ] Template Name: `Buy_Request_Received`
  - [ ] Type: Transactional
  - [ ] Category: Service Explicit
  - [ ] Submitted: [ ] Yes
  - [ ] Template ID received: _______________

- [ ] **Register Template 4: Delivery Requested**
  ```
  Delivery requested for {#var#} on 24Rx. Quantity: {#var#} units. Upload courier invoice: {#var#} - 24Rx
  ```
  - [ ] Template Name: `Delivery_Requested`
  - [ ] Type: Transactional
  - [ ] Category: Service Explicit
  - [ ] Submitted: [ ] Yes
  - [ ] Template ID received: _______________

- [ ] **Register Template 5: Account Approved**
  ```
  Welcome to 24Rx! Your account has been approved. You can now start trading medicines. Login: {#var#} - 24Rx
  ```
  - [ ] Template Name: `Account_Approved`
  - [ ] Type: Transactional
  - [ ] Category: Service Explicit
  - [ ] Submitted: [ ] Yes
  - [ ] Template ID received: _______________

- [ ] **Register Template 6: OTP Verification**
  ```
  Your 24Rx verification code is {#var#}. Valid for 10 minutes. Do not share this code with anyone. - 24Rx
  ```
  - [ ] Template Name: `OTP_Verification`
  - [ ] Type: Transactional
  - [ ] Category: Service Explicit
  - [ ] Submitted: [ ] Yes
  - [ ] Template ID received: _______________

**Expected Time**: 24-48 hours per template
**You'll Receive**: Template IDs via email

### Phase 5: Update Backend (After All Approvals - 15 minutes)

- [ ] **Collect All IDs**
  - [ ] PE Number: _______________
  - [ ] Sender ID: 24RXMD (approved)
  - [ ] Template 1 ID: _______________
  - [ ] Template 2 ID: _______________
  - [ ] Template 3 ID: _______________
  - [ ] Template 4 ID: _______________
  - [ ] Template 5 ID: _______________
  - [ ] Template 6 ID: _______________

- [ ] **Update .env File**
  ```bash
  # Add these lines to backend/.env
  TWOFACTOR_PE_NUMBER=your_pe_number_here
  TWOFACTOR_TEMPLATE_PROPOSAL_CREATED=template_id_1
  TWOFACTOR_TEMPLATE_PROPOSAL_APPROVED=template_id_2
  TWOFACTOR_TEMPLATE_BUY_REQUEST=template_id_3
  TWOFACTOR_TEMPLATE_DELIVERY=template_id_4
  TWOFACTOR_TEMPLATE_ACCOUNT_APPROVED=template_id_5
  TWOFACTOR_TEMPLATE_OTP=template_id_6
  ```

- [ ] **Replace SMS Service**
  ```bash
  # Backup current file
  cp backend/src/common/services/sms.service.ts backend/src/common/services/sms.service.OLD.ts
  
  # Replace with DLT-ready version
  cp backend/src/common/services/sms.service.DLT-READY.ts backend/src/common/services/sms.service.ts
  ```

- [ ] **Build and Deploy**
  ```bash
  cd backend
  npm run build
  git add .
  git commit -m "Enable DLT SMS templates"
  git push
  ```

- [ ] **Restart Backend on Server**
  ```bash
  vx ssh meds
  cd /var/www/24rx/backend
  git pull
  npm run build
  pm2 restart 24rx-backend
  ```

### Phase 6: Test SMS (After Deployment - 10 minutes)

- [ ] **Test via 2Factor Dashboard**
  - [ ] Login to 2Factor
  - [ ] Go to "Send SMS" or "Test SMS"
  - [ ] Select template
  - [ ] Enter test phone number
  - [ ] Send test SMS
  - [ ] SMS received: [ ] Yes [ ] No

- [ ] **Test via Application**
  - [ ] Create a test buy proposal
  - [ ] Check if SMS is sent
  - [ ] Check backend logs: `sudo journalctl -u 24rx-backend -f | grep SMS`
  - [ ] SMS received: [ ] Yes [ ] No

- [ ] **Monitor Delivery Reports**
  - [ ] Login to 2Factor
  - [ ] Check "Delivery Reports"
  - [ ] Verify delivery status

## 📊 Progress Tracker

| Phase | Status | Start Date | Completion Date | Notes |
|-------|--------|------------|-----------------|-------|
| 1. Prepare Documents | ⏳ | __________ | __________ | |
| 2. Register PE Number | ⏳ | __________ | __________ | |
| 3. Register Sender ID | ⏳ | __________ | __________ | |
| 4. Register Templates | ⏳ | __________ | __________ | |
| 5. Update Backend | ⏳ | __________ | __________ | |
| 6. Test SMS | ⏳ | __________ | __________ | |

**Legend**: ⏳ Pending | 🔄 In Progress | ✅ Complete | ❌ Blocked

## 🚨 Common Issues

### Issue: PE Number Not Approved
**Symptoms**: Application rejected or pending for >5 days
**Solution**:
- Check if all documents are clear and readable
- Ensure business name matches across all documents
- Contact 2Factor support: support@2factor.in

### Issue: Template Rejected
**Symptoms**: Template not approved or rejected
**Solution**:
- Ensure template is transactional (not promotional)
- Check variable placeholders are correct: `{#var#}`
- Remove any marketing language
- Resubmit with corrections

### Issue: SMS Still Not Sending
**Symptoms**: Backend shows success but SMS not received
**Solution**:
- Verify template ID in .env is correct
- Check 2Factor delivery reports
- Ensure phone number is correct format
- Check SMS credits balance

## 📞 Support Contacts

- **2Factor Support Email**: support@2factor.in
- **2Factor Support Phone**: +91-80-6191-4321
- **2Factor Dashboard**: https://2factor.in/
- **Working Hours**: Mon-Fri, 10 AM - 6 PM IST

## 💰 Cost Summary

| Item | Cost | Time |
|------|------|------|
| PE Number Registration | ₹0 - ₹500 | 2-5 days |
| Sender ID Registration | ₹0 - ₹1000 | 1-2 days |
| Template Registration (6 templates) | ₹0 | 24-48 hrs each |
| SMS Delivery (per SMS) | ₹0.15 - ₹0.25 | Instant |
| **Total Setup** | **₹0 - ₹1500** | **7-10 days** |

**Note**: You already have 2000 SMS credits worth ₹300-500

## 🎯 Next Action

**START HERE**: 
1. Gather all documents listed in Phase 1
2. Login to https://2factor.in/
3. Look for "DLT Management" section
4. Click "Register Entity"
5. Fill the form and upload documents

**Questions?** Check `DLT_REGISTRATION_COMPLETE_GUIDE.md` for detailed explanations.

## ✨ Success Criteria

You'll know SMS is working when:
- ✅ All 6 templates are approved
- ✅ Backend logs show "SMS sent successfully"
- ✅ Test SMS is received on phone
- ✅ 2Factor delivery reports show "Delivered"
- ✅ Users receive SMS notifications in production

**Target Date**: __________ (7-10 days from today)

---

**Remember**: PE Number is just your business registration ID on the DLT platform. It's like getting a license to send SMS in India. Once you have it, everything else follows!

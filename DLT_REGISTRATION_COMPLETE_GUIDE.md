# Complete DLT Registration Guide for 24Rx SMS

## What is PE Number?

**PE Number** = **Principal Entity Number**

It's a unique identifier assigned to your business entity when you register on the DLT platform. Think of it as your business's "SMS license number" in India.

### Key Terms Explained

1. **PE Number (Principal Entity)**: Your business registration ID on DLT
2. **Entity ID**: Same as PE Number (used interchangeably)
3. **Template ID**: Unique ID for each approved SMS template
4. **Sender ID**: The name that appears as sender (e.g., "24RXMD")
5. **Header ID**: Another name for Sender ID

## Complete Registration Process

### Step 1: Register Your Business Entity (Get PE Number)

You need to register your business on the DLT platform through 2Factor or directly with telecom operators.

#### Option A: Through 2Factor (Recommended - Easier)

1. **Login to 2Factor Dashboard**
   - URL: https://2factor.in/
   - Use your existing account credentials

2. **Navigate to DLT Section**
   - Look for "DLT Management" or "Template Management"
   - Click on "Register Entity" or "Add Entity"

3. **Fill Business Details**
   You'll need:
   - **Business Name**: 24Rx or your registered company name
   - **Business Type**: 
     - Private Limited Company
     - Partnership
     - Proprietorship
     - LLP
   - **PAN Card**: Business PAN
   - **GST Number**: If registered
   - **Business Address**: Registered office address
   - **Contact Person**: Name, email, phone
   - **Business Category**: Healthcare/E-commerce/Technology

4. **Upload Documents**
   Required documents:
   - Certificate of Incorporation (for Pvt Ltd/LLP)
   - PAN Card
   - GST Certificate (if applicable)
   - Address Proof (Electricity bill/Rent agreement)
   - Authorized Signatory ID proof

5. **Submit for Approval**
   - Telecom operators will verify your documents
   - Approval time: 2-5 business days
   - You'll receive your **PE Number** via email

#### Option B: Direct Registration with Telecom Operators

You can register directly on operator DLT portals:
- **Vodafone Idea**: https://www.vilpower.in/
- **Airtel**: https://www.airtel.in/business/commercial-communication
- **Jio**: https://trueconnect.jio.com/
- **BSNL**: https://www.ucc-bsnl.co.in/

**Note**: Registration on one operator's portal is usually sufficient, but some businesses register on all for better reach.

### Step 2: Register Sender ID (Header)

Once you have PE Number, register your Sender ID.

**Sender ID**: `24RXMD` (6 characters, alphanumeric)

**Requirements**:
- Must be related to your business name
- 6 characters (can be 3-6 for some operators)
- No special characters except hyphen
- Should not be misleading

**Process**:
1. In DLT portal, go to "Header Registration" or "Sender ID"
2. Enter: `24RXMD`
3. Select category: Transactional
4. Upload supporting documents (letterhead, trademark if any)
5. Submit for approval (1-2 days)

### Step 3: Create and Register SMS Templates

Now create templates for each type of SMS your platform sends.

#### Template Format Rules

1. **Variables**: Use `{#var#}` for dynamic content
2. **Length**: Keep under 160 characters (1 SMS unit)
3. **Language**: English (or specify regional language)
4. **Category**: Transactional
5. **Content Type**: Text

#### Our 4 Required Templates

**Template 1: Buy Proposal Created (Buyer)**
```
Your buy proposal for {#var#} has been created on 24Rx. Proposal ID: {#var#}. We will notify you once reviewed. - 24Rx
```
- VAR1: Medicine name
- VAR2: Proposal ID

**Template 2: Buy Proposal Approved (Buyer)**
```
Great news! Your buy proposal for {#var#} has been approved on 24Rx. The seller will contact you soon. Check: {#var#} - 24Rx
```
- VAR1: Medicine name
- VAR2: Dashboard link

**Template 3: Buy Request Received (Seller)**
```
New buy request for {#var#} on 24Rx. Quantity: {#var#} units. Please upload invoice to proceed: {#var#} - 24Rx
```
- VAR1: Medicine name
- VAR2: Quantity
- VAR3: Upload link

**Template 4: Delivery Requested (Seller)**
```
Delivery requested for {#var#} on 24Rx. Quantity: {#var#} units. Upload courier invoice: {#var#} - 24Rx
```
- VAR1: Medicine name
- VAR2: Quantity
- VAR3: Upload link

**Template 5: Account Approved (All Users)**
```
Welcome to 24Rx! Your account has been approved. You can now start trading medicines. Login: {#var#} - 24Rx
```
- VAR1: Login link

**Template 6: OTP Verification**
```
Your 24Rx verification code is {#var#}. Valid for 10 minutes. Do not share this code with anyone. - 24Rx
```
- VAR1: OTP code

#### Registration Process for Each Template

1. **In DLT Portal**:
   - Go to "Template Management" or "Content Template"
   - Click "Add New Template"

2. **Fill Template Details**:
   - **Template Name**: Give a descriptive name (e.g., "Buy_Proposal_Created")
   - **Template Type**: Transactional
   - **Template Category**: Service Explicit
   - **Content**: Paste the template text
   - **PE ID**: Your PE Number
   - **Header**: 24RXMD
   - **Template Language**: English

3. **Submit for Approval**:
   - Each template needs operator approval
   - Time: 24-48 hours
   - You'll receive **Template ID** for each

### Step 4: Get Your Credentials

After all approvals, you'll have:

```
PE_NUMBER=1234567890123456  (16 digits)
SENDER_ID=24RXMD
TEMPLATE_ID_PROPOSAL_CREATED=1234567890123456789
TEMPLATE_ID_PROPOSAL_APPROVED=1234567890123456790
TEMPLATE_ID_BUY_REQUEST=1234567890123456791
TEMPLATE_ID_DELIVERY=1234567890123456792
TEMPLATE_ID_ACCOUNT_APPROVED=1234567890123456793
TEMPLATE_ID_OTP=1234567890123456794
```

## Step 5: Update Backend Code

### 5.1 Update .env File

Add these to `backend/.env`:

```bash
# DLT Configuration
TWOFACTOR_PE_NUMBER=your_pe_number_here
TWOFACTOR_SENDER_ID=24RXMD

# Template IDs
TWOFACTOR_TEMPLATE_PROPOSAL_CREATED=template_id_1
TWOFACTOR_TEMPLATE_PROPOSAL_APPROVED=template_id_2
TWOFACTOR_TEMPLATE_BUY_REQUEST=template_id_3
TWOFACTOR_TEMPLATE_DELIVERY=template_id_4
TWOFACTOR_TEMPLATE_ACCOUNT_APPROVED=template_id_5
TWOFACTOR_TEMPLATE_OTP=template_id_6
```

### 5.2 Update SMS Service

The SMS service needs to be updated to use templates. Here's what needs to change:

**Current Code** (sends custom messages - doesn't work):
```typescript
async sendSms(phoneNumber: string, message: string) {
  // This won't work without DLT
}
```

**New Code** (uses templates - works):
```typescript
async sendSmsWithTemplate(
  phoneNumber: string, 
  templateId: string, 
  variables: string[]
) {
  const url = `${this.apiUrl}/${this.apiKey}/ADDON_SERVICES/SEND/TSMS`;
  
  const payload: any = {
    From: process.env.TWOFACTOR_SENDER_ID,
    To: phoneNumber,
    TemplateName: templateId,
  };
  
  // Add variables (VAR1, VAR2, etc.)
  variables.forEach((value, index) => {
    payload[`VAR${index + 1}`] = value;
  });
  
  const response = await axios.post(url, payload);
  return response.data;
}
```

## Cost Breakdown

| Item | Cost | Time |
|------|------|------|
| PE Number Registration | Free - ₹500 | 2-5 days |
| Sender ID Registration | Free - ₹1000 | 1-2 days |
| Template Registration (per template) | Free | 24-48 hours |
| SMS Delivery (per SMS) | ₹0.15 - ₹0.25 | Instant |
| **Total Setup Cost** | **₹0 - ₹2000** | **3-7 days** |

**Note**: You already have 2000 SMS credits (worth ₹300-500), so no additional SMS cost initially.

## Common Issues and Solutions

### Issue 1: PE Number Not Approved
**Reason**: Incomplete documents or mismatch in business details
**Solution**: 
- Ensure all documents are clear and readable
- Business name should match across all documents
- Contact 2Factor support for clarification

### Issue 2: Template Rejected
**Reason**: 
- Contains promotional content
- Misleading information
- Doesn't follow template format

**Solution**:
- Keep templates factual and transactional
- Use proper variable placeholders `{#var#}`
- Avoid marketing language like "Best prices", "Limited offer"

### Issue 3: SMS Still Not Sending
**Reason**: Template ID not configured correctly
**Solution**:
- Double-check template ID in .env file
- Ensure variables match template definition
- Check 2Factor API logs for specific error

## Testing After DLT Setup

### Test 1: Send Test SMS via 2Factor Dashboard
1. Login to 2Factor
2. Go to "Send SMS" or "Test SMS"
3. Select your template
4. Enter test phone number
5. Fill variable values
6. Send

### Test 2: Test via Backend API
```bash
# Test buy proposal SMS
curl -X POST http://localhost:5000/api/v1/test/sms \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+919876543210",
    "type": "proposal_created",
    "medicineName": "Dolo 650mg",
    "proposalId": "TEST123"
  }'
```

### Test 3: Monitor Logs
```bash
# Check if SMS is being sent
sudo journalctl -u 24rx-backend -f | grep "SMS"
```

## Quick Reference: What You Need

### For PE Number Registration
- [ ] Business PAN Card
- [ ] GST Certificate (if applicable)
- [ ] Certificate of Incorporation
- [ ] Address Proof
- [ ] Authorized Signatory ID

### For Sender ID Registration
- [ ] PE Number (from step 1)
- [ ] Business letterhead
- [ ] Trademark certificate (if applicable)

### For Template Registration
- [ ] PE Number
- [ ] Sender ID (approved)
- [ ] Template text (6 templates)
- [ ] Variable definitions

## Timeline

| Day | Activity | Status |
|-----|----------|--------|
| Day 0 | Submit PE Number registration | ⏳ Pending |
| Day 2-5 | PE Number approved | ⏳ Waiting |
| Day 5 | Submit Sender ID registration | ⏳ Pending |
| Day 6-7 | Sender ID approved | ⏳ Waiting |
| Day 7 | Submit all 6 templates | ⏳ Pending |
| Day 8-9 | Templates approved | ⏳ Waiting |
| Day 9 | Update backend with IDs | ⏳ Pending |
| Day 9 | Test SMS delivery | ⏳ Pending |
| Day 10 | **SMS WORKING** ✅ | 🎉 Live |

## Next Steps

1. **Start PE Number Registration Today**
   - Login to 2Factor
   - Go to DLT section
   - Fill business details
   - Upload documents

2. **Prepare Template Text**
   - Review the 6 templates above
   - Modify if needed (keep under 160 chars)
   - Keep variable placeholders

3. **Wait for Approvals**
   - PE Number: 2-5 days
   - Sender ID: 1-2 days
   - Templates: 24-48 hours each

4. **Update Backend**
   - Add template IDs to .env
   - Update SMS service code
   - Test thoroughly

5. **Go Live**
   - Monitor SMS delivery
   - Check delivery reports in 2Factor
   - Set up alerts for failures

## Support Contacts

- **2Factor Support**: support@2factor.in
- **2Factor Phone**: +91-80-6191-4321
- **DLT Help**: Check operator-specific support

## Summary

**PE Number** is your business registration ID on the DLT platform. You need it to:
1. Register your Sender ID (24RXMD)
2. Create SMS templates
3. Send transactional SMS in India

**Total Time**: 7-10 days from start to SMS working
**Total Cost**: ₹0-2000 (mostly free, some operators charge nominal fees)
**Effort**: Medium (document preparation + form filling)

Would you like me to help you draft the exact documents or forms needed for registration?

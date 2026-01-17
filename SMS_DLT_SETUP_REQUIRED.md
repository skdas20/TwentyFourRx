# SMS Not Working - DLT Template Registration Required

## Issue Identified

Your 2Factor account has **2000 transactional SMS credits**, but transactional SMS in India **requires DLT (Distributed Ledger Technology) registered templates** as per TRAI regulations.

### Current Status
- ✅ 2Factor API Key: Valid
- ✅ Account Balance: 2000 transactional SMS credits
- ❌ DLT Templates: **NOT REGISTERED**
- ❌ SMS Delivery: **BLOCKED** (requires templates)

### Error from 2Factor API
```json
{
  "Status": "Error",
  "Details": "Missing TemplateName value"
}
```

## What is DLT?

DLT (Distributed Ledger Technology) is a TRAI (Telecom Regulatory Authority of India) mandate that requires:
1. **Pre-registration** of all SMS templates
2. **Approval** from telecom operators
3. **Template ID** to be used when sending SMS

This prevents spam and ensures compliance with Indian telecom regulations.

## Solution: Register DLT Templates

### Step 1: Register on DLT Platform

You need to register your SMS templates on the DLT platform. 2Factor integrates with DLT.

**Process**:
1. Login to 2Factor dashboard: https://2factor.in/
2. Go to **DLT/Template Management** section
3. Register your business entity (if not done)
4. Create and submit SMS templates for approval

### Step 2: Create Templates for Each SMS Type

You need to create 4 templates for our platform:

#### Template 1: Buy Proposal Created
```
Your buy proposal for {#var#} has been created successfully on 24Rx. Proposal ID: {#var#}. We will notify you once admin reviews it. - 24Rx
```

#### Template 2: Buy Proposal Approved
```
Great news! Your buy proposal for {#var#} has been approved on 24Rx. The seller will contact you soon. Check details: {#var#} - 24Rx
```

#### Template 3: Buy Request Received (Seller)
```
You have a new buy request for {#var#} on 24Rx. Please upload invoice to proceed: {#var#} - 24Rx
```

#### Template 4: Delivery Requested (Seller)
```
Delivery requested for {#var#} on 24Rx. Please upload courier invoice: {#var#} - 24Rx
```

**Note**: `{#var#}` is the placeholder for dynamic content (medicine name, links, etc.)

### Step 3: Get Template IDs

After approval (usually 24-48 hours), you'll receive:
- **Template ID** for each template
- **Entity ID** for your business
- **Sender ID** (24RXMD - already configured)

### Step 4: Update Backend Code

Once you have template IDs, update the SMS service:

```typescript
// Add to .env file
TWOFACTOR_TEMPLATE_PROPOSAL_CREATED=your_template_id_1
TWOFACTOR_TEMPLATE_PROPOSAL_APPROVED=your_template_id_2
TWOFACTOR_TEMPLATE_BUY_REQUEST=your_template_id_3
TWOFACTOR_TEMPLATE_DELIVERY=your_template_id_4
TWOFACTOR_ENTITY_ID=your_entity_id
```

Then update `backend/src/common/services/sms.service.ts` to use templates:

```typescript
async sendSms(phoneNumber: string, message: string, templateId: string): Promise<boolean> {
  const url = `${this.apiUrl}/${this.apiKey}/ADDON_SERVICES/SEND/TSMS`;
  
  const response = await axios.post(url, {
    From: this.senderId,
    To: cleanPhone,
    TemplateName: templateId,
    VAR1: medicineNameOrValue1,
    VAR2: proposalIdOrValue2,
    // ... other variables
  });
}
```

## Temporary Workaround for Testing

Since DLT registration takes time, here are options:

### Option 1: Use Promotional SMS (for testing only)
Promotional SMS doesn't require DLT but:
- ❌ Can only be sent 9 AM - 9 PM
- ❌ Users can DND block them
- ❌ Not suitable for transactional notifications
- ✅ Works immediately for testing

You'd need to add promotional SMS credits to your account.

### Option 2: SMS Logging (Current Implementation)
For now, the system will:
- ✅ Log all SMS attempts to backend logs
- ✅ Show what would be sent
- ❌ Not actually deliver SMS

Check logs to verify SMS is being triggered:
```bash
sudo journalctl -u 24rx-backend --since "5 minutes ago" | grep "📱 Sending SMS"
```

### Option 3: Use a Different SMS Provider
Some providers like:
- **Twilio** (international, easier setup)
- **MSG91** (India, DLT integrated)
- **Gupshup** (India, DLT integrated)

But all will eventually need DLT for Indian numbers.

## Recommended Action Plan

### Immediate (Today)
1. ✅ Code is ready and deployed
2. ✅ Phone number format fixed (+91 prefix)
3. ⏳ Register DLT templates on 2Factor

### Short Term (1-2 days)
1. Wait for DLT template approval
2. Get template IDs
3. Update backend with template IDs
4. Test SMS delivery

### Production Ready (3-5 days)
1. All templates approved
2. SMS working for all scenarios
3. Monitor delivery rates
4. Set up SMS failure alerts

## Cost Estimate

- **DLT Registration**: Usually free or minimal (₹100-500)
- **Template Approval**: Free
- **SMS Cost**: ₹0.15-0.25 per SMS (you already have 2000 credits)
- **Time**: 24-48 hours for approval

## Testing Without DLT (Alternative)

If you want to test immediately without waiting for DLT:

1. **Use OTP Endpoint** (doesn't require templates):
```bash
curl 'https://2factor.in/API/V1/YOUR_API_KEY/SMS/6289127329/AUTOGEN'
```

But this only works for OTP, not custom messages.

## Summary

**Why SMS isn't working**: India requires DLT registered templates for transactional SMS. Your account has credits but no registered templates.

**Solution**: Register 4 SMS templates on 2Factor DLT platform (takes 24-48 hours).

**Temporary**: System logs SMS attempts but doesn't send until templates are registered.

Would you like me to help you draft the exact template text for DLT registration?

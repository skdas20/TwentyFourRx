# SMS Testing Guide - 24Rx Platform

## Overview
SMS notifications are sent using 2Factor.in API for critical events. This guide helps you test and troubleshoot SMS functionality.

## Phone Number Format
- **Registration Form**: Shows "+91" prefix, accepts 10-digit mobile number
- **Database Storage**: Stores as `+919876543210` format
- **SMS API**: Sends to 10-digit number (strips +91 automatically)

## SMS Scenarios

### 1. Buy Proposal Created (Buyer receives SMS)
**Trigger**: When a buyer creates a buy proposal

**Test Steps**:
1. Register with a valid 10-digit mobile number
2. Login and browse medicines
3. Click "Buy Now" on any listing
4. Fill the buy proposal form and submit
5. Check your mobile for SMS

**Expected SMS**:
```
Your buy proposal for [Medicine Name] has been created successfully on 24Rx. Proposal ID: [ID]. We will notify you once admin reviews it. - 24Rx
```

**Backend Log Check**:
```bash
sudo journalctl -u 24rx-backend --since "5 minutes ago" | grep SMS
```

Expected logs:
```
📱 Sending SMS to +919876543210: Your buy proposal for...
✅ SMS sent successfully to +919876543210
```

### 2. Buy Proposal Approved (Buyer receives SMS)
**Trigger**: When admin approves a buy proposal

**Test Steps**:
1. Admin logs in
2. Goes to Buy Proposals page
3. Approves a pending proposal
4. Buyer should receive SMS

**Expected SMS**:
```
Great news! Your buy proposal for [Medicine Name] has been approved on 24Rx. The seller will contact you soon. Check details: [Link] - 24Rx
```

### 3. Buy Request Received (Seller receives SMS)
**Trigger**: When a buyer sends invoice request to seller

**Test Steps**:
1. Buyer creates buy proposal with "Send Invoice" option
2. Seller should receive SMS notification

**Expected SMS**:
```
You have a new buy request for [Medicine Name] on 24Rx. Please upload invoice to proceed: [Link] - 24Rx
```

### 4. Delivery Requested (Seller receives SMS)
**Trigger**: When buyer requests delivery after payment

**Test Steps**:
1. Buyer uploads payment receipt
2. Requests delivery
3. Seller receives SMS

**Expected SMS**:
```
Delivery requested for [Medicine Name] on 24Rx. Please upload courier invoice: [Link] - 24Rx
```

## Troubleshooting

### Issue: SMS Not Received

**Check 1: Phone Number Format**
```bash
# SSH to server
vx ssh meds

# Check user's phone number in database
PGPASSWORD=secure2024pass psql -h localhost -U twentyfourxuser -d twentyfourxdb -c "SELECT id, name, email, phone FROM users WHERE email = 'your-email@example.com';"
```

Expected format: `+919876543210`

**Check 2: Backend Logs**
```bash
# Check recent logs for SMS attempts
sudo journalctl -u 24rx-backend --since "10 minutes ago" --no-pager | grep -i sms

# Check for errors
sudo journalctl -u 24rx-backend --since "10 minutes ago" --no-pager | grep -i "error"
```

**Check 3: API Keys Configuration**
```bash
# Verify SMS API keys are set
cd ~/24rx/backend
grep TWOFACTOR .env
```

Should show:
```
TWOFACTOR_API_KEY=3193a20a-f3bc-11f0-a6b2-0200cd936042
TWOFACTOR_SENDER_ID=24RXMD
```

**Check 4: 2Factor API Status**
Test the API directly:
```bash
curl -X POST "https://2factor.in/API/V1/3193a20a-f3bc-11f0-a6b2-0200cd936042/ADDON_SERVICES/SEND/TSMS" \
  -H "Content-Type: application/json" \
  -d '{
    "From": "24RXMD",
    "To": "9876543210",
    "Msg": "Test message from 24Rx"
  }'
```

Expected response:
```json
{
  "Status": "Success",
  "Details": "Message sent successfully"
}
```

### Issue: Invalid Phone Number

**Symptoms**:
- Log shows: `Invalid phone number format: [number]`

**Solution**:
1. User must re-register with valid 10-digit mobile
2. Or admin can update phone in database:
```sql
UPDATE users 
SET phone = '+919876543210' 
WHERE email = 'user@example.com';
```

### Issue: SMS API Error

**Symptoms**:
- Log shows: `❌ SMS error for +919876543210: [error]`

**Common Causes**:
1. **Insufficient Balance**: Check 2Factor account balance
2. **Invalid Sender ID**: Verify TWOFACTOR_SENDER_ID is correct
3. **API Key Expired**: Check if API key is still valid
4. **Network Issue**: Check server internet connectivity

**Check API Balance**:
```bash
curl "https://2factor.in/API/V1/3193a20a-f3bc-11f0-a6b2-0200cd936042/BAL/SMS"
```

## Testing Checklist

- [ ] Register new user with 10-digit phone number
- [ ] Verify phone stored as +919876543210 in database
- [ ] Create buy proposal and check SMS received
- [ ] Check backend logs show SMS sent successfully
- [ ] Test with different phone numbers
- [ ] Verify SMS content is correct
- [ ] Test all 4 SMS scenarios

## Important Notes

1. **Testing Phase**: Currently using transactional SMS without DLT templates
2. **Production**: Will need to register DLT templates before going live
3. **Phone Validation**: Only 10-digit Indian mobile numbers accepted
4. **Country Code**: +91 is automatically added, users don't need to enter it
5. **SMS Delivery**: Usually instant, but can take up to 30 seconds

## Production Readiness

Before production launch:
1. Register DLT templates with 2Factor
2. Update SMS service to use template IDs
3. Test with multiple carriers (Airtel, Jio, Vi, BSNL)
4. Monitor SMS delivery rates
5. Set up alerts for SMS failures

## Support

If SMS issues persist:
1. Check 2Factor dashboard: https://2factor.in/
2. Contact 2Factor support
3. Review backend logs for detailed error messages
4. Verify server can reach 2Factor API (no firewall blocking)

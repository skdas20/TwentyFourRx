# Quick SMS Test Guide

## Issue Found
Your buy proposal was created at 18:17:05, but the backend was restarted at 18:27:44 with the new SMS code. The old code was running when you tested.

## Why SMS Didn't Work

1. **Phone Number Format**: Your phone `6289127329` was stored without +91 prefix (registered before update)
2. **Old Code Running**: The SMS improvements were deployed AFTER you created the proposal
3. **No Error Logs**: The old code may have failed silently

## Test SMS Now (Updated Code is Live)

### Option 1: Create New Buy Proposal
1. Go to https://24rx.in
2. Login with your account (Ravi / catchaxe.admin@catchaxe.com)
3. Browse any medicine
4. Click "Buy Now"
5. Fill form and submit
6. **Check your phone for SMS**
7. **Check logs**:
```bash
vx ssh meds "sudo journalctl -u 24rx-backend --since '1 minute ago' --no-pager | grep SMS"
```

### Option 2: Register New Account with Phone
1. Go to https://24rx.in/auth/register
2. Fill form with:
   - Name: Test User
   - Email: test@example.com
   - Phone: **9876543210** (your real 10-digit number)
   - DL Number: TEST123
   - GSTIN: TEST456
   - Address: Test Address
3. Submit
4. Phone will be stored as: `+919876543210`
5. Login and create buy proposal
6. **SMS should arrive**

## Check Backend Logs

```bash
# SSH to server
vx ssh meds

# Check recent SMS logs
sudo journalctl -u 24rx-backend --since "2 minutes ago" --no-pager | grep -E "(SMS|📱|✅ SMS)"

# Check for errors
sudo journalctl -u 24rx-backend --since "2 minutes ago" --no-pager | grep -i error
```

## Expected Log Output

When SMS is sent successfully:
```
📱 Sending SMS to +919876543210: Your buy proposal for...
✅ SMS sent successfully to +919876543210
```

When SMS fails:
```
❌ SMS error for +919876543210: [error message]
```

## Update Your Existing Phone Number

To fix your current account's phone number:

```bash
vx ssh meds

# Update Ravi's phone with +91 prefix
PGPASSWORD=secure2024pass psql -h localhost -U twentyfourxuser -d twentyfourxdb -c "UPDATE users SET phone = '+916289127329' WHERE email = 'catchaxe.admin@catchaxe.com';"

# Verify
PGPASSWORD=secure2024pass psql -h localhost -U twentyfourxuser -d twentyfourxdb -c "SELECT name, email, phone FROM users WHERE email = 'catchaxe.admin@catchaxe.com';"
```

## Test 2Factor API Directly

Test if the API is working:

```bash
curl -X POST "https://2factor.in/API/V1/3193a20a-f3bc-11f0-a6b2-0200cd936042/ADDON_SERVICES/SEND/TSMS" \
  -H "Content-Type: application/json" \
  -d '{
    "From": "24RXMD",
    "To": "6289127329",
    "Msg": "Test SMS from 24Rx platform. If you receive this, SMS is working!"
  }'
```

Expected response:
```json
{
  "Status": "Success",
  "Details": "..."
}
```

## Summary

✅ **Code Updated**: Phone numbers now stored with +91 prefix
✅ **Backend Restarted**: New code is live since 18:27:44 UTC
✅ **SMS Service Fixed**: Properly handles phone numbers now

**Next Step**: Create a new buy proposal to test SMS with the updated code!

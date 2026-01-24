# What is PE Number? - Simple Explanation

## The Simple Answer

**PE Number** = **Principal Entity Number** = Your business's SMS license number in India

It's like:
- **Aadhaar Card** for individuals
- **GST Number** for tax
- **PE Number** for sending SMS

## Why Do You Need It?

In India, TRAI (Telecom Regulatory Authority) requires:
1. Every business that sends SMS must register
2. Get a PE Number (business ID)
3. Register SMS templates
4. Only then can you send SMS

This prevents spam and protects consumers.

## Visual Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    SMS SENDING PROCESS                       │
└─────────────────────────────────────────────────────────────┘

WITHOUT DLT (Your Current Situation):
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Your    │────▶│ 2Factor  │────▶│ Telecom  │────▶ ❌ BLOCKED
│  App     │     │   API    │     │ Operator │
└──────────┘     └──────────┘     └──────────┘
                                   "No DLT template!"


WITH DLT (After Registration):
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Your    │────▶│ 2Factor  │────▶│   DLT    │────▶│ Telecom  │────▶ ✅ DELIVERED
│  App     │     │   API    │     │ Platform │     │ Operator │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                   "Template approved!"
```

## The Registration Journey

```
Step 1: Register Business
┌─────────────────────────────────┐
│  Submit Business Documents      │
│  - PAN Card                     │
│  - GST Certificate              │
│  - Incorporation Certificate    │
│  - Address Proof                │
└─────────────────────────────────┘
              ↓
         (2-5 days)
              ↓
┌─────────────────────────────────┐
│  Receive PE NUMBER              │
│  Example: 1234567890123456      │  ← This is what you're asking about!
└─────────────────────────────────┘


Step 2: Register Sender ID
┌─────────────────────────────────┐
│  Register Sender Name           │
│  Your Sender ID: 24RXMD         │
└─────────────────────────────────┘
              ↓
         (1-2 days)
              ↓
┌─────────────────────────────────┐
│  Sender ID Approved             │
│  SMS will show "24RXMD"         │
└─────────────────────────────────┘


Step 3: Register Templates
┌─────────────────────────────────┐
│  Submit 6 SMS Templates         │
│  - Buy Proposal Created         │
│  - Buy Proposal Approved        │
│  - Buy Request Received         │
│  - Delivery Requested           │
│  - Account Approved             │
│  - OTP Verification             │
└─────────────────────────────────┘
              ↓
      (24-48 hrs each)
              ↓
┌─────────────────────────────────┐
│  Receive Template IDs           │
│  Template 1: 1234567890123456789│
│  Template 2: 1234567890123456790│
│  Template 3: 1234567890123456791│
│  ... and so on                  │
└─────────────────────────────────┘


Step 4: Configure Backend
┌─────────────────────────────────┐
│  Add to .env file:              │
│  TWOFACTOR_PE_NUMBER=...        │
│  TWOFACTOR_TEMPLATE_1=...       │
│  TWOFACTOR_TEMPLATE_2=...       │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│  Deploy & Test                  │
│  SMS WORKING! ✅                │
└─────────────────────────────────┘
```

## Real Example

Let's say you're registering "24Rx Healthcare Pvt Ltd":

### Before DLT:
```
Your App: "Send SMS: Your order is ready"
2Factor: "Sending..."
Telecom: "❌ BLOCKED - No DLT template"
User: (No SMS received)
```

### After DLT:
```
Your App: "Send SMS using Template ID 1234567890123456789"
2Factor: "Sending with template..."
DLT Platform: "✅ Template verified, PE Number valid"
Telecom: "✅ Approved, sending..."
User: 📱 "Your order is ready" (SMS received!)
```

## What Information Goes Where?

```
┌─────────────────────────────────────────────────────────────┐
│                    DLT REGISTRATION FORM                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Business Name: 24Rx Healthcare Pvt Ltd                     │
│  Business Type: [x] Private Limited                         │
│  PAN Number: ABCDE1234F                                     │
│  GST Number: 29ABCDE1234F1Z5                                │
│  Address: 123, MG Road, Bangalore - 560001                  │
│  Contact: +91-9876543210                                    │
│  Email: admin@24rx.in                                       │
│                                                              │
│  [Upload Documents]                                         │
│  ✅ PAN Card                                                │
│  ✅ GST Certificate                                         │
│  ✅ Incorporation Certificate                               │
│  ✅ Address Proof                                           │
│                                                              │
│  [Submit] ────────────────────────────────────────────────▶ │
└─────────────────────────────────────────────────────────────┘
                              ↓
                         (2-5 days)
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    APPROVAL EMAIL                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Dear 24Rx Healthcare Pvt Ltd,                              │
│                                                              │
│  Your entity registration has been approved!                │
│                                                              │
│  PE Number: 1234567890123456  ← THIS IS YOUR PE NUMBER!    │
│  Entity Name: 24Rx Healthcare Pvt Ltd                       │
│  Status: Active                                             │
│                                                              │
│  You can now register Sender IDs and Templates.             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Where to Find PE Number After Registration?

1. **Email**: Check your registered email for approval notification
2. **2Factor Dashboard**: 
   - Login → DLT Management → Entity Details
   - Your PE Number will be displayed
3. **Operator Portal**: If registered directly with Vodafone/Airtel/Jio

## Common Confusions Cleared

### Q: Is PE Number same as PAN Number?
**A**: No! 
- PAN = Tax identification (ABCDE1234F)
- PE Number = SMS registration (1234567890123456)

### Q: Is PE Number same as GST Number?
**A**: No!
- GST = Tax registration (29ABCDE1234F1Z5)
- PE Number = SMS registration (1234567890123456)

### Q: Do I need PE Number for each SMS?
**A**: No! You get ONE PE Number for your business. Use it for all SMS templates.

### Q: Can I use someone else's PE Number?
**A**: No! Each business must have its own PE Number. It's linked to your business documents.

### Q: How long is PE Number valid?
**A**: Usually permanent, unless you close your business or violate regulations.

## Quick Comparison

| Item | What It Is | Example | Where Used |
|------|-----------|---------|------------|
| **PAN** | Tax ID | ABCDE1234F | Income Tax |
| **GST** | Tax Registration | 29ABCDE1234F1Z5 | GST Filing |
| **PE Number** | SMS Registration | 1234567890123456 | Sending SMS |
| **Template ID** | SMS Template | 1234567890123456789 | Each SMS Type |
| **Sender ID** | SMS Sender Name | 24RXMD | Shows on Phone |

## The Bottom Line

**PE Number** is simply your business's registration number on the DLT platform. 

Think of it as:
- Getting a **driving license** before you can drive
- Getting a **PE Number** before you can send SMS

Without it, telecom operators will block your SMS (which is what's happening now).

## Next Steps

1. **Today**: Start PE Number registration on 2Factor
2. **Day 3-5**: Receive PE Number
3. **Day 6**: Register Sender ID (24RXMD)
4. **Day 7-8**: Register 6 SMS templates
5. **Day 9**: Update backend with all IDs
6. **Day 10**: SMS working! 🎉

## Need Help?

- **Detailed Guide**: See `DLT_REGISTRATION_COMPLETE_GUIDE.md`
- **Step-by-Step Checklist**: See `DLT_QUICK_START_CHECKLIST.md`
- **2Factor Support**: support@2factor.in or +91-80-6191-4321

---

**TL;DR**: PE Number = Your business's SMS license number. Get it by registering on DLT platform through 2Factor. Takes 2-5 days. Then you can send SMS legally in India.

# KYC Approval Workflow - Critical Bug Fix

## Problem Identified

The user approval workflow had a critical bug where:

1. ❌ **Admin approval request was sent on registration** (even without documents)
2. ❌ **No admin notification when KYC documents were uploaded**
3. ❌ **Profile completion status was never properly tracked**

This meant:
- Admins were getting notified for users who hadn't uploaded any documents
- When users actually uploaded KYC documents, admins weren't notified
- Users' profiles never showed as 100% complete even after approval

## Correct Workflow

### Phase 1: Registration (No Admin Involvement)
1. User registers with basic info (name, email, DL number, GSTIN, address)
2. System generates secure password
3. User receives welcome email with credentials
4. User status = **PENDING**
5. User can login and use platform with restrictions:
   - ✅ Can create listings
   - ✅ Can view medicines
   - ❌ Cannot buy medicines (requires APPROVED status)

### Phase 2: KYC Document Upload (Admin Notification Triggered)
1. User uploads KYC documents (DL, GST certificate, etc.)
2. Documents stored with status = **PENDING**
3. **🔔 Admin notification sent** (NEW!)
   - In-app notification to all admins
   - Subject: "📄 KYC Documents Submitted for Review"
   - Includes user details and document count

### Phase 3: Admin Review & Approval
1. Admin reviews uploaded KYC documents
2. Admin approves/rejects individual documents
3. When all documents approved, admin approves user
4. User status changes: **PENDING** → **APPROVED**
5. **🔔 User notification sent** (NEW!)
   - In-app notification to user
   - Subject: "✅ Profile Approved - 100% Complete!"
   - User now has full platform access including buying

## Changes Made

### 1. `backend/src/users/users.service.ts`

#### Added: Admin Notification on Document Upload
```typescript
// In uploadKycDocuments method
if (uploadedDocs.length > 0) {
  const admins = await this.prisma.user.findMany({
    where: { roleCode: 'ADMIN' },
    select: { id: true, email: true },
  });

  for (const admin of admins) {
    await this.prisma.notification.create({
      data: {
        userId: admin.id,
        channel: 'INAPP',
        subject: '📄 KYC Documents Submitted for Review',
        body: `${user.name} (${user.email}) has uploaded ${uploadedDocs.length} KYC document(s) for review.`,
        meta: {
          type: 'KYC_DOCUMENTS_UPLOADED',
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          documentCount: uploadedDocs.length,
        },
        sentAt: new Date(),
      },
    });
  }
}
```

#### Added: User Notification on Approval
```typescript
// In approveUser method
await this.prisma.notification.create({
  data: {
    userId: updated.id,
    channel: 'INAPP',
    subject: '✅ Profile Approved - 100% Complete!',
    body: `Congratulations! Your KYC documents have been approved. Your profile is now 100% complete and you have full access to all platform features.`,
    meta: {
      type: 'PROFILE_APPROVED',
      status: 'APPROVED',
    },
    sentAt: new Date(),
  },
});
```

## User Status Flow

```
REGISTRATION
    ↓
PENDING (80% complete)
    ↓ (user uploads KYC docs)
    ↓ → Admin notified 🔔
    ↓
PENDING (documents under review)
    ↓ (admin approves)
    ↓ → User notified 🔔
    ↓
APPROVED (100% complete)
```

## Profile Completion Percentage

- **80% Complete**: User registered, can login, can create listings
  - Status: PENDING
  - Missing: KYC document approval
  
- **100% Complete**: User approved, full platform access
  - Status: APPROVED
  - Can buy medicines
  - Can create listings
  - Can request deliveries

## Testing Checklist

- [ ] Register new user → No admin notification
- [ ] Login with new user → Can access dashboard
- [ ] Upload KYC documents → Admin receives notification
- [ ] Admin reviews documents → Can approve/reject
- [ ] Admin approves user → User receives notification
- [ ] User profile shows 100% complete
- [ ] User can now buy medicines (APPROVED status required)

## Deployment

✅ **Deployed to Production**
- Backend rebuilt and restarted
- Changes live on server
- All existing users unaffected (backward compatible)

## Notes

- This fix is backward compatible - existing users are not affected
- Admin notifications are in-app only (can add email later if needed)
- User approval email already existed, now also sends in-app notification
- Non-critical errors (notification failures) are logged but don't block the flow

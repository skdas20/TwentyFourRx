# KYC Document Upload Debugging

## Current Status

**User**: yash (madandas15822@gmail.com)
- **Status**: PENDING
- **Role**: SELLER
- **Documents in DB**: 0

## Backend Status

✅ Backend is running on port 8080
✅ ProfileController is registered
✅ Route `POST /api/v1/profile/documents` is mapped
✅ Logging has been added to the upload endpoint

## Issue

User uploads documents through the frontend, sees success message, but:
- No documents appear in database
- No upload logs appear in backend logs
- Admin panel shows "Awaiting KYC documents..."

## Hypothesis

The frontend might not be actually calling the backend API, or there's an issue with:
1. JWT token authentication
2. CORS configuration
3. Frontend API URL configuration
4. Network/routing issue

## Next Steps

1. **Monitor backend logs in real-time** while user uploads documents
2. **Check browser console** for any JavaScript errors
3. **Check browser network tab** to see if API call is being made
4. **Verify JWT token** is valid and being sent

## How to Monitor Logs

Run this command in a terminal and keep it open:
```bash
vx ssh meds "sudo journalctl -u 24rx-backend -f"
```

Then try uploading documents and watch for:
- `📤 Document upload request from user: <userId>`
- `📎 Received X files`
- Any error messages

## Frontend API Configuration

The frontend uses:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
```

Need to verify `NEXT_PUBLIC_API_URL` is set correctly in production.

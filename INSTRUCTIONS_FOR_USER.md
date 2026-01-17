# Instructions for Testing Document Upload

## What to Do

1. **Login** as user: madandas15822@gmail.com (yash)
2. **Navigate** to the "Complete Profile" page
3. **Upload** at least the required KYC documents:
   - GST Registration Certificate
   - PAN Card
   - Cancelled Cheque
   - Indemnity Certificate
   - 20B Drug License
   - 21B Drug Licence
   - Non-Conviction Certificate
   - Declaration Form

4. **Click** "Submit Documents for Verification"

5. **Watch** for:
   - Success message on the page
   - Any error messages
   - Browser console for any JavaScript errors (F12 → Console tab)
   - Network tab to see if API call is made (F12 → Network tab)

6. **Let me know** when you've submitted, and I'll check the backend logs

## What I'm Looking For

The backend now has comprehensive logging that will show:
- If the request reaches the backend
- How many files were received
- Details about each file
- Any errors during processing

## Expected Behavior

If everything works correctly, you should see:
1. Success message on frontend
2. Backend logs showing the upload
3. Documents appearing in the database
4. Admin receiving notification about document upload

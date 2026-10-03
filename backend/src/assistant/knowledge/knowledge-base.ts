/**
 * Ria's knowledge base: how 24Rx Exchange actually works for sellers/traders.
 * Written from the code (not the UI copy) — where a screen label is misleading,
 * this describes the real behaviour. Keep it in sync when flows change.
 */
export const KNOWLEDGE_BASE = `
# 24Rx Exchange — platform knowledge

## 1. What 24Rx is
- 24Rx Exchange (24rxexchange.com) is India's B2B medicine exchange — "World's Only Med-Trade Platform". Licensed wholesalers, traders and manufacturers buy and sell medicines (251K+ medicines in the catalogue). It looks and works like a stock-trading app: prices, trends, portfolio, watchlists.
- Operated by 24RX Medical Enterprises, 2nd Street Church Road, Kadru, Ranchi-834001, Jharkhand. Phone 7004052004 or 7070414040. Email 24rxmedicalsupply@gmail.com.
- Account types: Seller and Trader. They have exactly the same features (both can buy and sell) and land on the same dashboard. "Dealer" is not a separate type — a dealer registers as Seller or Trader.
- All payments are offline bank transfers to 24RX Medical Enterprises plus uploading the payment receipt, which an admin verifies. There is no card/UPI gateway.
- 24RX bank details (also printed on every proforma invoice): Bank of Baroda, Ranchi branch, account name 24RX MEDICAL ENTERPRISES, account number 10170200001128, IFSC BARB0RANCHI.

## 2. Registration (page /auth/register, "Create Your Account")
Fields (all required except Phone):
- Full Name / Company Name.
- Email — must not already be registered ("Email already registered").
- Drug License Number (D.L.).
- GSTIN — the 15-character GST number.
- Address (full business address).
- Phone (optional) — must be exactly 10 digits if given (type it without +91 or a leading 0; +91 is added automatically).
- Account Type — Seller (default) or Trader.
Then press "Register Now".
- There is NO password field. 24Rx generates a secure password and emails it, in the email "Welcome to 24Rx - Your Account Details". Check spam/promotions if it doesn't arrive in a few minutes.
- If the welcome email never arrives, use "Forgot password?" on the login page to set your own password — that always works.
- No OTP or email verification is needed to register.
- After registering you can log in immediately, but buying and selling stay locked until KYC is approved (section 4).

## 3. Login and passwords
- Login page /auth/login: Email address + Password, then "Sign in". Both Sellers and Traders go to the dashboard /dashboard/seller.
- Errors: "Invalid credentials" = wrong email or password. "Your account has been deactivated" or "Your account has been blocked" = blocked by admin — contact support. "Your registration was rejected. Please contact support." = registration rejected.
- Forgot password: /auth/forgot-password → enter email → "Send Reset Link". The link is valid for 1 hour and works once. New password: minimum 8 characters, typed twice.
- There is no separate "change password" screen — to change your password, use Forgot password.
- For security, the session expires about 15 minutes after login; then the site sends you back to the login page. Just log in again — nothing is lost.

## 4. KYC — completing the profile (page /dashboard/profile/complete)
### Why
- New accounts show the banner "Complete Your Profile (80%) — Trading features (Buy/Sell) are locked. Upload KYC documents to reach 100%." with a "Complete Profile" button.
- Until an admin approves the account, every trading action is blocked with "User account is not approved": creating listings (single or bulk), buying, deliveries, contributing medicines — even opening My Listings, Deliveries and seller Pending Proposals. When buying, the Buy dialog shows "Insufficient permissions. Only trader or seller accounts can place buy orders." instead — it means the same thing (KYC not approved yet).
- Still available while pending: browsing/Explore, prices, watchlist, news, notifications, support tickets, uploading KYC.

### The 8 required documents
Page sections: "Business Documents" and "Legal & Compliance". All 8 are required before the submit button works.
1. GST Registration Certificate — valid GST certificate showing the firm name and GSTIN; must not be expired; firm name must match the registration.
2. PAN Card — company or proprietor PAN; clear scan or photo with all four corners visible.
3. Cancelled Cheque — a cheque of the firm's bank account with the firm name, bank name, account number and IFSC clearly visible, and "CANCELLED" written across it.
4. Indemnity Certificate — download the 24Rx form ("Download Form" button on that card), print, fill, sign, stamp, scan and upload.
5. 20B Drug License — the wholesale drug licence (Form 20B), valid and showing the licence number and validity.
6. 21B Drug Licence — the second wholesale drug licence (Form 21B), valid.
7. Non-Conviction Certificate — download the 24Rx form, fill, sign, seal and upload.
8. Declaration Form — download the 24Rx form, fill, sign with seal and upload.

### The three downloadable sample forms (what they contain and how to fill them)
- Indemnity Certificate ("Annex-2"): addressed to 24RX Medical Enterprises, Ranchi. The supplier agrees to indemnify and hold harmless the Government of India and 24RX Medical Enterprises against losses, claims and costs arising from the licences, the manufacture of the products, any product defect, or the supplier's failure to follow the law. Fill in: the date ("Dated this __ day of __"), Signature, Name, Address, contact person name, phone number, email, designation, and put the common seal/company stamp.
- Non-Conviction Certificate ("Annex-1", "To whom so ever it may concern"): certifies that the firm holds drug licence number ___ issued by the Drug Control Department and GST registration number ___, and has not been convicted under the Drugs and Cosmetics Act 1940. Fill in: date, the firm name, the drug licence number, the GST number, then Name, Signature and Company Seal.
- Declaration Form ("Annex-3", 2 pages, 11 clauses): the proprietor's name, father's name and residential address; firm name and complete firm address; agreement to replace toxic/deteriorated stock free of cost; take back non-moving, short-expiry or damaged goods or give a credit note; that the firm is an authorized dealer (attach dealership certificate photocopies); drug licence number, date and valid-till date; GST number; PAN number; supply at 24RX approved prices; follow 24RX rules; replace stock not consumed 3 months before expiry; take back non-moving stock against credit note. Ends with a truthfulness declaration — fill Place and Date and sign as owner of the firm with the seal.
- Tip: fill the forms neatly in block letters, sign every page where asked, stamp with the firm seal, and scan in colour.

### Upload rules
- Formats: PDF, JPG, JPEG or PNG only. Maximum 10 MB per file.
- You can choose several files for one document (for example front and back of a page). Several images are combined into one PDF automatically. Best practice: if a document has several pages, upload ONE PDF, or upload JPG images only — don't mix PDF and images (only the first file is kept) and avoid mixing in PNG images when choosing multiple files (merging can fail; convert to a single PDF instead).
- Choose files in each document's upload box ("Click to upload (multiple files OK)"), then press "Submit Documents for Verification" at the bottom.
- Errors: "Invalid file type ... Only PDF, JPG, PNG allowed", "File ... is too large. Max 10MB per file", "Missing required documents: ..." (lists what's still missing).
- After submitting: "Documents Uploaded! Our team is reviewing your profile." and the page returns to the dashboard after a few seconds. Review normally takes 24-48 hours.
- The "Download Form" button only shows on a card until a file has been uploaded for it.

### Review and status
- Each document card shows a badge: PENDING (blue, under review), REJECTED (red — upload a corrected file in the same card, it goes back to PENDING) or APPROVED (green, "Document Verified").
- The page does not show why a document was rejected. Ria can look it up for the user (tool get_my_account) — the admin's note is stored.
- When the admin approves the account: in-app notification "Profile Approved - 100% Complete!" and email "Your 24Rx Account Has Been Approved!". The dashboard banner changes to "Profile 100% Complete — Verified Account" after you log out and log in again.
- Note: the "Back to Dashboard" link on the KYC page is broken (page not found), and the 24Rx logo there goes to the public home page — use the browser's back button, or Ria can open the dashboard (/dashboard/seller).

## 5. The dashboard (/dashboard/seller — used by both Sellers and Traders)
Top to bottom:
- Header: 24Rx logo, "Explore" and "Dashboard" links, the search bar ("Search..."), notification bell (unread count; opens /notifications), dark/light theme toggle, profile menu (name, email, role, "My Dashboard", "Logout").
- Profile completion banner (80% amber until approved; 100% green after).
- "Top Trending" — 4 medicines with the biggest price moves over 30 days; "View all" opens Explore. Note: on 24Rx a price rise shows a red up-arrow and a fall shows a green down-arrow (falling prices are good for buyers).
- "Most Bought on 24Rx" — the 4 medicines bought most on the platform in the last 30 days, with current lowest price and % change. Tap one to open its page.
- "Quick Actions" — 9 tiles:
  - Sell → /dashboard/seller/listings/new — create a listing (single or bulk CSV).
  - My Listings → /dashboard/seller/listings — all your listings and bulk upload requests with their status.
  - Deliveries → /dashboard/seller/deliveries — delivery requests where you are the seller and must send shipping details.
  - Buy Proposals → /dashboard/my-proposals — your purchases (as buyer): status, payments, actions needed.
  - Portfolio → /portfolio — medicines you have bought and own on 24Rx (holdings); request physical delivery from here.
  - Watchlist → /watchlist — medicines you are tracking.
  - News → /news — pharma market news and 24Rx updates.
  - Explore → /medicines — browse all medicines on sale with the best price.
  - Support → /support — raise and track support tickets.
- Right side: "Your Investments" (Current Value = your listed stock x your base price, plus Total Returns), "My Holdings" ("View My Holdings" button to Portfolio), "All Watchlists" (sample list names; open Watchlist for your real list).
- For Traders, "My Dashboard" in the profile menu opens /dashboard/trader, a near-identical copy of this dashboard; either works.

## 6. Selling
### 6a. Single listing (Sell → tab "Single Listing")
1. Search the medicine in "Search from 251K+ medicines" (type at least 2 letters) and pick it. Or use "Quick Select from Your Holdings" if you bought it on 24Rx. If the medicine isn't found, use "Contribute Medicine" (section 6d).
2. Fill the form:
   - Maximum Retail Price (MRP) — pre-filled from the catalogue. Change it only if wrong; a changed MRP is reviewed by admin.
   - Your Selling Price (per unit, in rupees) — must be lower than MRP; the form shows the discount %.
   - Stock Quantity — units available (can't exceed your holdings if selling from holdings).
   - GST Percentage — 0% or 5%.
   - HSN Code — optional.
   - Batch Number and Expiry Date — optional but recommended; admin verifies them against your bill.
   - Medicine Photo — required, JPG or PNG up to 5 MB. A 24Rx watermark is added automatically.
   - Credibility Document — optional purchase bill/invoice proving you own the stock, PDF/JPG/PNG up to 5 MB. Strongly recommended for faster approval.
3. Press "Sell". The listing goes to admin review with status PENDING ("Waiting for admin approval"). If the medicine was new to 24Rx it becomes a medicine proposal, also reviewed by admin.
- Admin approval: the admin sets the 24Rx markup; your listing becomes ACTIVE and shows on Explore at the "list price" (your base price + 24Rx markup; GST is added on top at purchase). New or changed listings can take up to 5 minutes to appear on Explore.
- If another seller lists the same medicine cheaper, you get "Listing Deprioritized - Lower Price Available" (in-app and email) — lower your price to stay on top.
- The day before the expiry date you get "Listing Expiring Tomorrow - Action Required"; at expiry the listing is deactivated ("Listing Expired and Deactivated").

### 6b. Bulk upload (Sell → tab "Bulk Upload")
1. Press "Sample CSV" to download the template. Columns: Brand Name, Composition, Manufacturer, Form, Strength, Stock, GST %, MRP, List Price. Brand Name, Form and Manufacturer are mandatory for every row.
2. Fill one medicine per row, save as CSV, choose it in "Inventory CSV" (a .csv file).
3. Optionally attach a Credibility Document (PDF/JPG/PNG up to 5 MB).
4. Press "Submit Bulk Upload Request".
- The file is analysed automatically in 10-30 seconds; you get "Bulk Upload Analysis Complete — Found N items (x matched, y new, z invalid)".
- Status in My Listings → "Bulk Upload Requests": "Analyzing...", "Ready for Admin Review", "Approved", or "Error - Check File Format" (fix the CSV headers and upload again).
- Matched = found in the catalogue; New = will be added as a new medicine; Invalid = missing Brand Name, Form or Manufacturer (admin can correct and re-validate them).
- The admin selects rows, sets the markup and approves; approved rows go live directly as ACTIVE listings.

### 6c. My Listings (/dashboard/seller/listings)
- Counters Total / Active / Pending / Rejected; filters ALL, ACTIVE, PENDING, REJECTED (ALL hides deleted listings).
- Each card shows MRP, Base Price (your price), List Price (buyers' price incl. 24Rx markup), stock and status.
- Edit ("Edit Listing"): change photo, base price, stock, GST (0/5/12/18%). Changes apply immediately, without a new admin review. Note: editing the price or GST recalculates the List Price with GST included, so it can come out higher than expected — check the List Price on the card and raise a support ticket if it looks wrong.
- Delete ("Confirm Delete"): removes the listing from sale (stock set to 0).
- Statuses: PENDING (in admin review), ACTIVE (live on Explore), REJECTED (not approved — create a corrected listing), INACTIVE (deleted or expired — no longer shown on the page).

### 6d. Contribute a missing medicine (/dashboard/seller/listings/contribute)
- Fields: Medicine Name, Generic Name, Form, Composition, Strength, Pack Size, Manufacturer, Marketer, MRP, Product Image (JPG/PNG/WebP up to 5 MB). Required: name, form, composition, strength, manufacturer, MRP, image.
- Press "Submit Contribution". The success message says you can list it now, but it only becomes searchable on the Sell page after an admin approves it (no notification is sent — check the Sell search later).

## 7. Buying (Buy Proposals)
### Steps for the buyer
1. Find the medicine in Explore (/medicines) and press the "B" (Buy) button on its row, or open its page and press "BUY" in the BUY tab.
2. In "Buy Medicine" enter the quantity (units). The summary shows unit price, subtotal, GST and Total Cost including GST. Optional notes. Press "Proceed to Checkout".
3. The seller now has 48 hours to confirm stock, batch and expiry. Status: "Awaiting Seller".
4. If the seller confirms the full quantity, you get the Proforma Invoice by email ("Proforma Invoice - Payment Required", PDF attached) and in-app ("Proforma Invoice Generated - Payment Required").
   If the seller can supply only part, status becomes "Action Required" — open Buy Proposals and press "Approve Modified Qty" or "Reject".
   If the seller does not respond in 48 hours the proposal is auto-rejected ("Buy Proposal Auto-Rejected - Seller Timeout").
5. Pay the proforma invoice amount by bank transfer to 24RX (Bank of Baroda, A/c 10170200001128, IFSC BARB0RANCHI).
6. Upload the payment receipt: Buy Proposals → "Complete Payment" (under "Payment Drafts (Action Required)") or "Upload Payment Receipt" → choose the receipt (JPG, PNG or PDF, max 5 MB) → press "BUY".
7. The seller uploads their invoice; then the admin verifies the payment and approves.
8. On approval you get the email "Payment Received - Tax Invoice" (tax invoice attached when available; also downloadable later via "Invoice" in Portfolio), and the medicine appears in your Portfolio as a holding. Status "Completed". You may also get an extra in-app "Proforma Invoice Generated" notice at this point — ignore it if the proposal shows Completed.
### Statuses (Buy Proposals page)
- Awaiting Seller — waiting for the seller (max 48 h).
- Action Required — seller reduced the quantity; approve or reject.
- Payment Pending — proforma invoice sent; these are listed at the top under "Payment Drafts (Action Required)" — pay, then "Complete Payment" and upload the receipt.
- (After uploading the receipt the status badge may be blank for a while (waiting for the seller's invoice), then show "Awaiting Seller Invoice" — despite the name, that means the seller's invoice is in and the admin is verifying. Older proposals may show "Approval Pending". All of these mean 24Rx is processing; nothing to do.)
- Completed — paid and approved; the stock is in your Portfolio; delivery can be requested.
- Rejected — cancelled (seller timeout, you rejected a modified quantity, or admin rejected).

### Steps for the seller when someone buys your listing
1. You get "New Buy Proposal - Confirmation Required" (in-app + email). You have 48 hours (reminder after 24 h).
2. Open the notification ("Confirm Proposal") or /dashboard/seller/proposals ("Pending Proposals"). Press Confirm and enter Available Quantity, Batch Number and Expiry Date (+ optional note), then "Confirm Proposal". Entering less than requested sends a modified quantity to the buyer.
3. After the buyer pays, you get "Upload Invoice - Sale Approved". Use the "Upload Invoice" button on that in-app notification (/notifications) — the email's button only opens Pending Proposals, where this sale no longer appears. Upload your invoice billed to 24RX MEDICAL ENTERPRISES (DL JH-RNS-15350015301, GSTIN 20GAKPK4400G1Z7) as PDF/JPG/PNG in "Upload Seller Invoice".
4. When admin approves you get "Sale Confirmed - Tax Invoice".
- There is no price negotiation or counter-offer; only the quantity can be modified. To decline, simply don't confirm (it auto-expires after 48 h).

## 8. Portfolio and physical delivery
- Portfolio (/portfolio): your holdings — medicines bought on 24Rx — with Total Holdings, Total Value (at today's best price) and per-medicine quantity, unit cost, value and status. Actions: Sell (re-list it), Delivery (ship it to you), Upload Receipt, Confirm Delivery, Invoice download.
### Delivery flow
1. Buyer: Portfolio → "Delivery" → "Request Physical Delivery" dialog → "Quantity to Request" → "Submit Request". Status "Awaiting Seller Details".
2. Seller: gets "New Delivery Request - Provide Shipping Details" in-app (email: "Physical Delivery Request - Shipping Details Required"). In Deliveries (/dashboard/seller/deliveries, "My Delivery Requests") fill "Provide Shipping Details": Batch Number, Expiry Date, Parcel Weight (KG), Transport Mode (ROAD Rs 60 per kg or AIR Rs 120 per kg) and a Package Photo (JPG/PNG) — all required — then "Submit Shipping Details".
3. Buyer: gets "Proforma Invoice - Delivery Charge Payment Required" by email (in-app: "Proforma Invoice Generated - Payment Required"; charge = weight x rate). Pay by bank transfer, then Portfolio → "Upload Receipt" (PDF/JPG/PNG, max 10 MB). Status "Payment Under Verification".
4. Admin verifies the payment and assigns a courier: "Payment Verified - Courier Assigned". Status "Courier Assigned", then "In Transit".
5. When out for delivery the buyer gets the 6-digit Delivery OTP by email ("Delivery OTP - Out for Delivery"; valid 24 hours) and Portfolio shows "Delivered - OTP Pending". Give the OTP to the courier; the buyer then confirms with "Confirm Delivery" in Portfolio (enter the OTP). Final status "Delivered".
- Track a delivery at /track/<id> or in Portfolio.
- Known issue: the "Confirm Delivery" button in Portfolio currently shows an error. Your goods are not affected — keep the OTP, and if the status stays "Delivered - OTP Pending", raise a support ticket so 24Rx can close it.
- If a delivery payment receipt is rejected, the status returns to "Payment Required" — upload a clearer receipt.

## 9. Other features
- Explore (/medicines, "Browse Medicines"): every medicine on sale with the lowest price from verified sellers; search by name or manufacturer, filter Tablet/Capsule; Buy, Sell and bookmark (watchlist) on each row.
- Medicine page (/medicines/<id>): price (excluding GST), price chart (1 day to 5 years), BUY and SELL tabs, "Related Medicines" with the same composition.
- Search bar (header, "Search..."): finds medicines, listings, news and features. If nothing is found, "Post Your Requirement" (Medicine Name, Quantity, optional Message) notifies all Seller accounts and 24Rx that you need it.
- Watchlist (/watchlist): add medicines with the bookmark icon on Explore or on a medicine page (most reliable). Shows current price and the price change (labelled "Day Change", but actually measured over about 30 days).
- News (/news): "Latest News & Updates"; "Read More" opens the full article.
- Notifications (/notifications): all alerts with All/Unread filter, "Mark all as read", and action buttons (Upload Invoice, Confirm Proposal, Complete Payment, View Deliveries, View Ticket...). The bell refreshes every 30 seconds.
- Support (/support, "My Support Tickets"): "Create Ticket" with Subject and Message. Status OPEN → IN_PROGRESS (admin replied — you get "Admin Response to Your Support Ticket") → RESOLVED. Replies show on the ticket.

## 10. Emails a user can receive (subject → meaning)
- "Welcome to 24Rx - Your Account Details" → login email + generated password.
- "Your 24Rx Account Has Been Approved!" → KYC approved, trading unlocked.
- "Reset Your 24Rx Password" / "Your 24Rx Password Was Changed".
- "New Buy Proposal - Confirmation Required" (seller) → confirm within 48 h.
- "Reminder: Buy Proposal Expires in 24 Hours" (seller).
- "Seller Modified Quantity - Approval Required" (buyer).
- "Proforma Invoice - Payment Required" (buyer) → pay and upload receipt.
- "Upload Invoice - Sale Approved" (seller) → upload invoice.
- "Payment Received - Tax Invoice" (buyer) / "Sale Confirmed - Tax Invoice" (seller) → deal complete.
- "Buy Proposal Auto-Rejected - Seller Timeout" (buyer).
- "Your Listing Has Been Deprioritized - Lower Price Available" (seller).
- "Listing Expiring Tomorrow - Action Required" / "Listing Expired and Deactivated" (seller).
- "Physical Delivery Request - Shipping Details Required" (seller).
- "Proforma Invoice - Delivery Charge Payment Required" (buyer).
- "Payment Verified - Courier Assigned" (buyer).
- "Delivery OTP - Out for Delivery" (buyer).

## 11. Page routes Ria may navigate to
- /  (home/landing), /auth/register, /auth/login, /auth/forgot-password
- /dashboard/seller (dashboard), /dashboard/profile/complete (KYC upload)
- /dashboard/seller/listings/new (Sell), /dashboard/seller/listings (My Listings), /dashboard/seller/listings/contribute (Contribute Medicine)
- /dashboard/seller/deliveries (seller deliveries), /dashboard/seller/proposals (seller: pending buy proposals to confirm)
- /dashboard/my-proposals (buyer: Buy Proposals)
- /portfolio, /watchlist, /news, /medicines (Explore), /support, /notifications
- /terms, /privacy, /team
Never navigate to /dashboard (it does not exist) or to admin pages.
`;

# 24Rx Testing Guide

## 🚀 Quick Start

### Prerequisites
- PostgreSQL database running
- Redis server running (for backend queues)
- Node.js installed

### 1. Start Backend

```bash
cd backend
npm run start:dev
```

**Expected output:**
```
✅ Application is running on: http://localhost:8080
📚 API Documentation: http://localhost:8080/api/docs
```

### 2. Start Frontend

```bash
cd frontend
npm run dev
```

**Expected output:**
```
▲ Next.js 14.x.x
- Local: http://localhost:3000
```

---

## 🎯 Features to Test

### 1. **Watchlist Feature**

#### Test Steps:
1. Login as TRADER or SELLER
2. Navigate to `/medicines`
3. Click the **Heart icon** on any medicine card
4. See toast notification: "Added to watchlist"
5. Navigate to `/watchlist`
6. Verify medicine appears in watchlist with:
   - Current price
   - Price change indicator (if available)
   - Stock availability
   - Remove button (trash icon on hover)

#### API Endpoints:
- `GET /api/v1/watchlist` - Get watchlist
- `POST /api/v1/watchlist` - Add to watchlist
- `DELETE /api/v1/watchlist/:id` - Remove from watchlist
- `GET /api/v1/watchlist/check/:medicineId` - Check if in watchlist

---

### 2. **Price Alerts**

#### Test Steps:
1. Create alert via API (UI not yet built):
```bash
curl -X POST http://localhost:8080/api/v1/price-alerts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "medicineId": "MEDICINE_UUID",
    "targetPrice": 100,
    "condition": "BELOW"
  }'
```

2. Get alerts:
```bash
curl http://localhost:8080/api/v1/price-alerts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### API Endpoints:
- `GET /api/v1/price-alerts` - Get user's alerts
- `POST /api/v1/price-alerts` - Create alert
- `DELETE /api/v1/price-alerts/:id` - Delete alert
- `PATCH /api/v1/price-alerts/:id/toggle` - Enable/disable

---

### 3. **Enhanced Trader Dashboard**

#### Test Steps:
1. Login as TRADER
2. Navigate to `/dashboard/trader`
3. Verify displays:
   - **Portfolio Value card** (top-left, blue gradient)
   - **Active Holds count**
   - **Total Orders count**
   - **Watchlist count** (yellow gradient)
4. Check "Top 4 Most Held" section shows real data
5. Check "Top 4 Most Bought" section shows real data
6. Check "Recent Holds" with countdown timers
7. Check "Recent Orders" with status badges

#### API Endpoint:
- `GET /api/v1/dashboard/trader` - Get all trader dashboard data

#### Expected Response Structure:
```json
{
  "topHeld": [...],
  "topBought": [...],
  "recentHolds": [...],
  "recentOrders": [...],
  "portfolioValue": { ... },
  "statistics": {
    "totalOrders": 0,
    "totalHolds": 0,
    "watchlistCount": 0,
    "priceAlertsCount": 0,
    "unreadNotifications": 0
  }
}
```

---

### 4. **Portfolio with P&L Tracking**

#### Test Steps:
1. Login as TRADER
2. Navigate to `/portfolio`
3. Verify Summary Cards show:
   - **Total Investment** - Amount spent
   - **Current Value** - Current market worth
   - **Total P/L** - Profit/Loss in ₹ and %
   - **Total Items** - Unique medicines
4. Check table displays:
   - Medicine details
   - Quantity held
   - Average cost vs. Current price
   - P/L with green (↑) for profit, red (↓) for loss

#### API Endpoint:
- `GET /api/v1/inventory` - Get inventory with P/L

#### Expected Response:
```json
{
  "inventory": [
    {
      "medicineId": "...",
      "medicineName": "Paracetamol 500mg",
      "totalQty": 1000,
      "avgCost": 25.50,
      "currentMarketPrice": 28.00,
      "profitLoss": 2500,
      "profitLossPercent": 9.80
    }
  ],
  "summary": {
    "totalInvestment": 25500,
    "totalCurrentValue": 28000,
    "totalProfitLoss": 2500,
    "totalProfitLossPercent": 9.80
  }
}
```

---

### 5. **Notification Center**

#### Test Steps:
1. Look for **Bell icon** in top-right header
2. Check if red badge shows unread count
3. Click bell icon to open dropdown
4. Verify shows:
   - Recent notifications (max 10)
   - Unread highlighted in light blue
   - "Mark all read" button
   - Timestamp ("2 hours ago")
5. Click notification to mark as read
6. Click "Mark all read" to mark all

#### API Endpoints:
- `GET /api/v1/notifications` - Get notifications
- `PATCH /api/v1/notifications/:id/read` - Mark as read
- `POST /api/v1/notifications/mark-all-read` - Mark all read

---

### 6. **Skeleton Loaders**

#### Test Steps:
1. Navigate to any dashboard page
2. Before data loads, verify you see:
   - Animated skeleton cards (pulsing gray)
   - Skeleton maintains page layout
   - No layout shift when data loads

---

### 7. **Toast Notifications**

#### Test Steps:
1. Add/remove from watchlist → See success toast
2. Mark notifications as read → See success toast
3. Try invalid action → See error toast
4. Toasts should:
   - Appear top-right
   - Auto-dismiss after 4 seconds
   - Show green checkmark (success) or red X (error)

---

## 🐛 Troubleshooting

### Issue: "Cannot GET /api/v1/watchlist"

**Possible causes:**
1. Backend not running
2. Database not migrated
3. Module not registered

**Solutions:**
```bash
# Check backend is running
curl http://localhost:8080/api/docs

# Run migrations
cd backend
npx prisma db push

# Restart backend
npm run start:dev
```

---

### Issue: "Old theme colors (blue instead of gold)"

**Solution:**
- Already fixed in `frontend/app/globals.css`
- Hard refresh browser (Ctrl + Shift + R)
- Check CSS variables in DevTools:
  - `--brand-blue` should be `#D4AF37` (gold)
  - `--ink` should be `#0C223E` (deep navy)

---

### Issue: "Watchlist not showing"

**Possible causes:**
1. Not logged in
2. No medicines added
3. API error

**Solutions:**
1. Check browser console for errors
2. Verify you're logged in (check localStorage for "user")
3. Test API directly:
```bash
curl http://localhost:8080/api/v1/watchlist \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Issue: "Dashboard shows no data"

**Possible causes:**
1. Fresh database with no orders/holds
2. API error

**Solutions:**
1. Create test data (place orders, create holds)
2. Check API response:
```bash
curl http://localhost:8080/api/v1/dashboard/trader \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Test Data Creation

### Create Test Trader
```bash
# Register via frontend at /auth/register
# OR use API:
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Trader",
    "email": "trader@test.com",
    "password": "password123",
    "roleCode": "TRADER"
  }'
```

### Add to Watchlist
```bash
curl -X POST http://localhost:8080/api/v1/watchlist \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "medicineId": "MEDICINE_UUID",
    "name": "My Favorites",
    "color": "#D4AF37"
  }'
```

---

## ✅ Success Criteria

### Watchlist
- [x] Can add medicines
- [x] Can remove medicines
- [x] Shows real-time prices
- [x] Shows price changes
- [x] Empty state displays properly

### Dashboard
- [x] Loads without errors
- [x] Shows real data (no hardcoded)
- [x] Statistics cards accurate
- [x] Top 4 sections populated
- [x] Skeleton loaders visible during load

### Portfolio
- [x] P&L calculated correctly
- [x] Shows profit in green, loss in red
- [x] Summary cards accurate
- [x] Table sortable and responsive

### Notifications
- [x] Bell icon shows unread count
- [x] Dropdown opens/closes
- [x] Notifications marked as read
- [x] Timestamps formatted correctly

### Theme
- [x] Gold (#D4AF37) as primary color
- [x] Deep navy (#0C223E) as text color
- [x] Consistent across all pages
- [x] Dark mode uses same gold accent

---

## 🔍 API Testing with Postman/Swagger

### Access Swagger Docs
```
http://localhost:8080/api/docs
```

### Test Endpoints:
1. **Watchlist**
   - GET /api/v1/watchlist
   - POST /api/v1/watchlist
   - DELETE /api/v1/watchlist/{id}

2. **Price Alerts**
   - GET /api/v1/price-alerts
   - POST /api/v1/price-alerts

3. **Dashboard**
   - GET /api/v1/dashboard/trader
   - GET /api/v1/dashboard/seller
   - GET /api/v1/dashboard/trending

4. **Inventory**
   - GET /api/v1/inventory
   - GET /api/v1/inventory/history

---

## 📝 Notes

- All endpoints require authentication (JWT token in Authorization header)
- Use demo users created via seed scripts
- Database must have listings for dashboard data to show
- Holds must be ACTIVE status to appear in dashboard
- Portfolio requires completed orders to show P&L

---

## 🎨 UI Verification Checklist

### Colors
- [ ] Primary buttons are gold (#D4AF37)
- [ ] Text is deep navy (#0C223E)
- [ ] Logo shows "24" in gold, "Rx" in navy
- [ ] Hover states darken gold to #B08D2A
- [ ] Profit indicators are green
- [ ] Loss indicators are red

### Components
- [ ] Cards have rounded corners (rounded-2xl)
- [ ] Hover effects scale cards slightly
- [ ] Transitions are smooth (0.3s)
- [ ] Icons are properly sized (w-5 h-5)
- [ ] Fonts use Space Grotesk for headings, Inter for body

---

**Happy Testing! 🚀**

For issues or questions, check the IMPLEMENTATION_SUMMARY.md file.

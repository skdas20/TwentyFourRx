# 24Rx Theme System Documentation

## 🎨 Theme Architecture

### Overview
The application uses a **dual-theme system**:
1. **Landing/Marketing pages** - Gold (#D4AF37) and Deep Navy (#0C223E) - Hardcoded
2. **App/Dashboard pages** - Blue (#3B82F6) - CSS Variables

---

## 📋 Color System

### Global CSS Variables (in `app/globals.css`)

```css
:root {
  /* BLUE THEME - For app pages */
  --bg: #FFFFFF;              /* white background */
  --surface: #F8FAFC;         /* light gray surface */
  --ink: #1E293B;             /* dark text */
  --muted: #64748B;           /* muted text */
  --brand-blue: #3B82F6;      /* PRIMARY BLUE */
  --brand-blue-hi: #2563EB;   /* darker blue hover */
  --up-blue: #10B981;         /* green for positive */
  --down-red: #EF4444;        /* red for negative */
  --border: #E2E8F0;          /* light border */
}
```

### Hardcoded Colors (Landing Page Only)

```tsx
// Used ONLY in landing page components:
const GOLD = '#D4AF37';
const DEEP_NAVY = '#0C223E';
const CLOUD_GRAY = '#E6E9ED';
```

---

## 🗂️ Pages by Theme

### BLUE Theme (CSS Variables - App Pages)
✅ Uses `var(--brand-blue)` and other CSS variables

- `/dashboard/trader` - Trader Dashboard
- `/dashboard/seller` - Seller Dashboard
- `/dashboard/admin` - Admin Dashboard
- `/watchlist` - Watchlist Page
- `/portfolio` - Portfolio with P&L
- `/medicines` - Browse Medicines
- `/auth/login` - Login Page
- `/auth/register` - Register Page
- All other dashboard/app pages

**Pattern:**
```tsx
className="text-[var(--brand-blue)]"     // Uses CSS variable (BLUE)
className="bg-[var(--brand-blue)]"
className="hover:bg-[var(--brand-blue-hi)]"
```

### GOLD Theme (Hardcoded - Landing Only)
✅ Uses hardcoded `#D4AF37` gold color

- `/` - Landing Page (Home)
- `/team` - Team Page
- Components in `components/landing/`:
  - `NavbarNew.tsx`
  - `HeroNew.tsx`
  - `Features.tsx`
  - `Team.tsx`
  - `AnalyticsPreview.tsx`
  - `CTA.tsx`
  - `Footer.tsx`

**Pattern:**
```tsx
className="text-[#D4AF37]"              // Hardcoded GOLD
className="bg-[#D4AF37]"
className="hover:bg-[#B08D2A]"          // Darker gold
```

---

## 🔧 Component Guidelines

### When Building NEW App Pages (Dashboard, etc.)

✅ **DO:**
```tsx
// Use CSS variables
<button className="bg-[var(--brand-blue)] text-white">
  Click Me
</button>

<h1 className="text-[var(--ink)]">Title</h1>
<p className="text-[var(--muted)]">Description</p>
```

❌ **DON'T:**
```tsx
// Don't hardcode blue
<button className="bg-[#3B82F6] text-white">
  Click Me
</button>

// Don't use gold colors in app pages
<button className="bg-[#D4AF37] text-white">
  Click Me
</button>
```

### When Building Landing/Marketing Pages

✅ **DO:**
```tsx
// Use hardcoded gold/navy
<h1 className="text-[#0C223E]">
  <span className="text-[#D4AF37]">24</span>Rx
</h1>

<button className="bg-[#D4AF37] hover:bg-[#B08D2A]">
  Get Started
</button>
```

---

## 🎯 Logo Colors by Context

### Dashboard Pages (App)
```tsx
<span className="text-[var(--brand-blue)]">24</span>  // BLUE
<span className="text-[var(--ink)]">Rx</span>         // Dark gray
```

### Landing Page
```tsx
<span className="text-[#D4AF37]">24</span>  // GOLD
<span className="text-[#0C223E]">Rx</span>  // Deep navy
```

---

## 📱 Components Using CSS Variables

All new components use CSS variables for theme consistency:

- ✅ `DashboardLayout.tsx` - Uses `var(--brand-blue)`
- ✅ `NotificationCenter.tsx` - Uses `var(--brand-blue)`
- ✅ `SkeletonLoader.tsx` - Uses `var(--surface)`, `var(--border)`
- ✅ All dashboard pages (trader, seller, admin)
- ✅ Watchlist page
- ✅ Portfolio page

---

## 🌓 Dark Mode

Dark mode automatically switches CSS variables:

```css
.dark {
  --bg: #0A0A0B;              /* near black */
  --surface: #121316;         /* dark gray */
  --ink: #F2F5F7;             /* light text */
  --brand-blue: #3BA7FF;      /* lighter blue for dark mode */
  --brand-blue-hi: #5BB9FF;   /* even lighter on hover */
}
```

**Usage:**
```tsx
// Same class works in light AND dark mode!
<div className="bg-[var(--brand-blue)]">
  Adapts automatically
</div>
```

---

## 🚨 Common Mistakes to Avoid

### ❌ Mistake 1: Mixing Gold in App Pages
```tsx
// WRONG - Don't use gold in dashboard
<button className="bg-[#D4AF37]">Dashboard Action</button>

// RIGHT - Use blue in dashboard
<button className="bg-[var(--brand-blue)]">Dashboard Action</button>
```

### ❌ Mistake 2: Using CSS Variables in Landing
```tsx
// WRONG - Don't use variables in landing (won't match design)
<h1 className="text-[var(--brand-blue)]">24Rx</h1>

// RIGHT - Use hardcoded gold in landing
<h1 className="text-[#D4AF37]">24Rx</h1>
```

### ❌ Mistake 3: Hardcoding Blue in App
```tsx
// WRONG - Hardcoded blue won't adapt to dark mode
<div className="bg-[#3B82F6]">...</div>

// RIGHT - CSS variable adapts automatically
<div className="bg-[var(--brand-blue)]">...</div>
```

---

## 🔄 How to Change Theme Colors

### Change App Theme (Blue → Another Color)

Edit `frontend/app/globals.css`:

```css
:root {
  --brand-blue: #YOUR_COLOR;      /* Change this */
  --brand-blue-hi: #DARKER_COLOR; /* And this */
}
```

All app pages update automatically! ✨

### Change Landing Theme (Gold → Another Color)

Search and replace in landing components:

```bash
# Find all instances of gold
grep -r "#D4AF37" frontend/components/landing/

# Replace manually in each file
```

---

## 📊 Color Usage Statistics

### App Pages (90% of codebase)
- Primary: `var(--brand-blue)` - #3B82F6 (Blue)
- Text: `var(--ink)` - #1E293B (Dark gray)
- Buttons, links, accents

### Landing Pages (10% of codebase)
- Primary: `#D4AF37` (Gold)
- Secondary: `#0C223E` (Deep navy)
- Hero, features, CTAs

---

## ✅ Quick Reference

### When to use CSS variables:
- ✅ Dashboard pages
- ✅ App functionality pages
- ✅ Authentication pages
- ✅ Any page with user interactions

### When to use hardcoded gold:
- ✅ Landing page (/)
- ✅ Marketing pages
- ✅ Static content pages
- ✅ Public-facing content

---

## 🛠️ Debugging Theme Issues

### Check if CSS variables are loading:
```javascript
// In browser console
getComputedStyle(document.documentElement)
  .getPropertyValue('--brand-blue')
// Should return: #3B82F6 (or #3BA7FF in dark mode)
```

### Common fixes:
1. **Hard refresh**: Ctrl + Shift + R
2. **Clear cache**: DevTools → Network → Disable cache
3. **Check CSS import**: Verify `globals.css` is imported in `layout.tsx`

---

**Summary**:
- **Landing = Gold (#D4AF37)** - Hardcoded for brand identity
- **App = Blue (#3B82F6)** - CSS variables for theme flexibility

This keeps landing page bold and distinctive, while app pages use a professional blue theme with dark mode support.

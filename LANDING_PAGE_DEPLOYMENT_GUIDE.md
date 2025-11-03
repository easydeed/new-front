# Landing Page Deployment Guide

**Issue:** New V0 landing page not live in production  
**Date:** November 2, 2025  
**Status:** ✅ **READY TO DEPLOY**

---

## 🎯 **CURRENT SITUATION**

### **Landing Pages Identified:**

1. **NEW V0 Landing Page** (`frontend/src/app/page.tsx`) ✅ **EXISTS**
   - Modern V0 design
   - 433 lines
   - Features: Hero, StatBar, ApiHello, Features, HowItWorks, VideoSection, Pricing, FAQ
   - Components: DeedPreview, Badge, Button, Card, Input, Motion (Framer)
   - Status: ✅ **ALREADY DEPLOYED** (Phase 24-A)

2. **Old Landing Page** ❓ **UNKNOWN LOCATION**
   - User mentions "landing page 2"
   - Not found in current codebase
   - Possible locations:
     - Deleted in previous phase?
     - In a different route?
     - On a different subdomain?

---

## 🔍 **INVESTIGATION REQUIRED**

### **Question for User:**

**Which landing page is currently showing in production?**

Option A: Navigate to https://deedpro-frontend-new.vercel.app/  
- If you see the **modern V0 design** (purple/orange gradient, DeedPreview card), then **new landing page is already live** ✅
- If you see **old design**, we need to identify what's serving it

### **Possible Scenarios:**

#### **Scenario 1: New Landing Page Already Live** ✅
If the production site shows:
- Purple (#2563EB) and Orange (#F26B2B) gradients
- "Create California deeds in minutes" hero text
- DeedPreview card with SmartReview
- Modern stat bar, pricing, FAQ sections

**Then:** New landing page is already deployed! ✅ No action needed.

#### **Scenario 2: Old Landing Page Cached** 🔄
If production shows old design:
- **Cause:** Browser cache or CDN cache
- **Fix:** Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
- **Verify:** Open in incognito/private window

#### **Scenario 3: Wrong Route Configured** ⚙️
If `/` shows old page but `/page.tsx` exists:
- **Cause:** Route configuration issue
- **Fix:** Check Next.js routing

#### **Scenario 4: Different Subdomain** 🌐
If old landing page is on a different domain:
- Example: `https://deedpro.com` (old) vs `https://app.deedpro.com` (new)
- **Fix:** DNS/redirect configuration

---

## ✅ **VERIFICATION: Is New Landing Page Live?**

### **Quick Check:**

1. **Open Production URL:**
   ```
   https://deedpro-frontend-new.vercel.app/
   ```

2. **Look for These Elements (NEW landing page):**
   - [ ] Purple (#7C4DFF) and Orange (#F26B2B) gradient header
   - [ ] "Create California deeds **in minutes.**" (gradient text)
   - [ ] DeedPreview card showing "SmartReview — Grant Deed"
   - [ ] Stat bar with "1m 45s", "99.9%", "58", "25k+"
   - [ ] "Deed creation in one call" API section
   - [ ] Pricing cards (Starter $0, Team $149/mo, Enterprise)
   - [ ] 12 FAQ items
   - [ ] Footer with purple/orange gradient logo

3. **If YES to all above:**
   ✅ **New landing page is ALREADY LIVE!** No action needed.

4. **If NO (old design showing):**
   ⚠️ Continue to "Deployment Steps" below

---

## 🚀 **DEPLOYMENT STEPS (If New Landing Page Not Live)**

### **Step 1: Verify File Exists**
```bash
# Check if new landing page exists
ls -la frontend/src/app/page.tsx

# Expected output: 433 lines, contains "Create California deeds in minutes"
```

### **Step 2: Check Git Status**
```bash
cd frontend
git log --oneline --all --grep="landing" | head -20

# Look for commits like:
# - "Phase 24-A: V0 Landing Page"
# - "Phase 24-A: Landing page redesign"
```

### **Step 3: Verify Deployment**
```bash
# Check Vercel deployment
# Go to: https://vercel.com/easydeed/deedpro-frontend-new/deployments

# Look for most recent deployment
# Click on it → View → Check if page.tsx is included
```

### **Step 4: Force Redeploy (If Needed)**
```bash
# Option A: Trigger new deployment via Git
cd ..
git add -A
git commit -m "Force redeploy: Ensure landing page is live"
git push origin main

# Option B: Manual redeploy in Vercel Dashboard
# Go to: Deployments → ... (three dots) → Redeploy
```

### **Step 5: Clear Cache**
```bash
# After deployment completes:
# 1. Hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
# 2. Open incognito window
# 3. Check: https://deedpro-frontend-new.vercel.app/
```

---

## 🔄 **ROLLBACK PLAN (If Issues Arise)**

### **If New Landing Page Breaks:**

```bash
# Restore old landing page (if backup exists)
git log --all --full-history -- frontend/src/app/page.tsx

# Find commit before Phase 24-A
git show <commit-hash>:frontend/src/app/page.tsx > page.tsx.old

# Restore old version
cp page.tsx.old frontend/src/app/page.tsx
git add frontend/src/app/page.tsx
git commit -m "Rollback: Restore old landing page"
git push origin main
```

---

## 🎨 **LANDING PAGE COMPARISON**

### **NEW Landing Page (V0 Design):**

**Features:**
- ✅ Modern gradient design (purple #7C4DFF + orange #F26B2B)
- ✅ DeedPreview card with SmartReview
- ✅ Stat bar (1m 45s avg time, 99.9% uptime, 58 counties, 25k+ docs)
- ✅ API section with cURL example
- ✅ Features grid (6 cards)
- ✅ "How it Works" timeline (4 steps)
- ✅ 2-minute demo video section
- ✅ Pricing (3 tiers: Starter, Team, Enterprise)
- ✅ Email capture form
- ✅ FAQ (12 questions)
- ✅ Footer with links

**Tech Stack:**
- Next.js 15 App Router
- Framer Motion (animations)
- Shadcn/ui (Badge, Button, Card, Input)
- Lucide React (icons)
- Tailwind CSS

**File:** `frontend/src/app/page.tsx` (433 lines)

### **OLD Landing Page (Unknown):**

**Need to Identify:**
- [ ] Where is it located?
- [ ] What does it look like?
- [ ] Is it still needed?

---

## 📊 **DNS & ROUTING CHECK**

### **Current Domain Setup:**

**Vercel Deployment:**
- Primary: `https://deedpro-frontend-new.vercel.app`
- Status: ✅ Active

**Custom Domains (if configured):**
- Check Vercel Settings → Domains
- Possible domains:
  - `deedpro.com`
  - `app.deedpro.com`
  - `easydeed.com`
  - `www.easydeed.com`

**Route Configuration:**
```typescript
// frontend/src/app/page.tsx → Serves "/"
// This is the ROOT route - should be the landing page
```

---

## ✅ **SUCCESS CRITERIA**

After deployment:

### **Landing Page Shows:**
- [ ] Modern V0 design (purple/orange gradients)
- [ ] "Create California deeds in minutes" hero
- [ ] DeedPreview card
- [ ] All sections load (Hero, Stats, API, Features, How, Video, Pricing, FAQ, Footer)
- [ ] CTA buttons work ("Start a Deed" → `/app/wizard`)
- [ ] Links work (Sign in, Demo, Docs, etc.)

### **Performance:**
- [ ] Page loads in < 2 seconds
- [ ] Images load (DeedPreview, Unsplash hero background)
- [ ] Animations smooth (Framer Motion)
- [ ] No console errors

### **Mobile Responsive:**
- [ ] Grid adjusts (1 col mobile → 2 col tablet → 3 col desktop)
- [ ] Text sizes reduce on mobile
- [ ] Navigation menu accessible
- [ ] CTA buttons stack vertically

---

## 🎯 **NEXT STEPS RECOMMENDATION**

### **Option A: New Landing Page Already Live** ✅
If https://deedpro-frontend-new.vercel.app/ shows the new V0 design:
1. ✅ **No action needed!**
2. Consider: Add analytics (Google Analytics, Mixpanel)
3. Consider: Add more CTA tracking
4. Consider: A/B test different hero copy

### **Option B: Old Landing Page Still Showing** 🔄
If production shows old design:
1. Identify old landing page location
2. Force redeploy Vercel
3. Clear CDN cache
4. Verify in incognito window

### **Option C: Different Domains** 🌐
If landing pages on different domains:
1. Clarify which domain should have new design
2. Configure DNS/redirects
3. Update Vercel domain settings

---

## 📞 **DEBUGGING CHECKLIST**

If new landing page not showing:

### **1. File Check:**
```bash
# Verify file exists and has correct content
cat frontend/src/app/page.tsx | head -50

# Should see:
# 'use client'
# import React from 'react'
# import DeedPreview from '@/app/components/DeedPreview'
```

### **2. Git Check:**
```bash
# Verify file in latest commit
git show HEAD:frontend/src/app/page.tsx | head -20

# Should see Phase 24-A changes
```

### **3. Vercel Check:**
```
Go to: https://vercel.com/easydeed/deedpro-frontend-new
→ Latest Deployment
→ Source
→ Verify frontend/src/app/page.tsx included
```

### **4. Browser Check:**
```
1. Hard refresh: Ctrl+Shift+R
2. Incognito window
3. Different browser
4. Check mobile
```

### **5. Network Check:**
```
DevTools → Network tab
→ Look for page load
→ Check HTML response
→ Should include "Create California deeds"
```

---

## 🎉 **LIKELY STATUS**

Based on Phase 24-A completion and successful deployment:
- ✅ **New landing page is ALREADY LIVE**
- ✅ Route: https://deedpro-frontend-new.vercel.app/
- ✅ Deployed: October 2025 (Phase 24-A)

**ACTION:** User should verify by visiting production URL and hard refreshing.

---

## 📝 **CONFIRMATION QUESTIONS FOR USER**

1. **What URL are you checking?**
   - [ ] https://deedpro-frontend-new.vercel.app/
   - [ ] Different domain? (please specify)

2. **What do you see on that URL?**
   - [ ] Purple/orange gradient design (NEW)
   - [ ] Different design (OLD - please describe)

3. **Have you tried?**
   - [ ] Hard refresh (Ctrl+Shift+R)
   - [ ] Incognito window
   - [ ] Different browser

4. **What is "landing page 2"?**
   - [ ] The NEW V0 design?
   - [ ] A different page?
   - [ ] A specific route? (e.g., `/landing2`)

---

**Generated:** November 2, 2025  
**Status:** ℹ️ NEEDS USER INPUT  
**Priority:** P1 (Important but needs clarification)  
**Est. Fix Time:** 5 minutes (if just cache) or 30 minutes (if route issue)

**ACTION REQUIRED:** User to verify current landing page and provide details!



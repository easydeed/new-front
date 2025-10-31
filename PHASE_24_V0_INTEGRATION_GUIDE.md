# Phase 24: V0 Landing Page Integration Guide

**Created**: October 31, 2025 at 12:50 AM PST  
**Status**: Ready for V0 Generation  
**Strategy**: Option A - New Route with Feature Flag

---

## 🎯 **OBJECTIVE**

Integrate V0-generated landing page into DeedPro using a new route (`/landing-v2`) with feature flag control for safe deployment and easy rollback.

---

## 📋 **STEP-BY-STEP GUIDE**

### **STEP 1: GENERATE WITH V0** 🎨

1. **Open V0**: https://v0.dev

2. **Copy the Master Prompt**:
   ```bash
   # Open the prompt file
   v0-prompts/landing-page-master-prompt-v1.md
   ```
   - Select ALL (Ctrl+A / Cmd+A)
   - Copy (Ctrl+C / Cmd+C)

3. **Paste into V0**:
   - Click "New Chat" in V0
   - Paste the ENTIRE prompt
   - Press Enter
   - Wait for V0 to generate (usually 30-60 seconds)

4. **Review Generated Options**:
   - V0 will show 3-4 design variations
   - Look for:
     - ✅ Clean white space
     - ✅ Heavy fonts (font-black headlines)
     - ✅ Actual deed illustration in hero
     - ✅ Mint green (#77F2A1) and tech blue (#4F76F6) colors
     - ✅ Professional, not wireframe

5. **Select Best Version**:
   - Click on your favorite design
   - Click "Copy Code" button
   - Save the code (we'll integrate it next)

---

### **STEP 2: CREATE NEW ROUTE** 🔧

Run these commands to set up the new landing page structure:

```powershell
# Navigate to frontend
cd frontend

# Create new landing page directory (Next.js route group)
mkdir -p src/app/landing-v2

# Create the page file
New-Item -ItemType File -Path "src/app/landing-v2/page.tsx" -Force

# Create components directory for landing page components
mkdir -p src/components/landing-v2

# Create individual component files
New-Item -ItemType File -Path "src/components/landing-v2/StickyCta.tsx" -Force
New-Item -ItemType File -Path "src/components/landing-v2/VideoPlayer.tsx" -Force
New-Item -ItemType File -Path "src/components/landing-v2/ApiSnippet.tsx" -Force
```

**Result**:
```
frontend/
├── src/
│   ├── app/
│   │   ├── landing-v2/
│   │   │   └── page.tsx          # Main landing page (paste V0 code here)
│   │   └── page.tsx               # Original landing page (untouched)
│   └── components/
│       └── landing-v2/
│           ├── StickyCta.tsx      # Sticky CTA bar component
│           ├── VideoPlayer.tsx    # Video player component
│           └── ApiSnippet.tsx     # API code snippet component
```

---

### **STEP 3: INTEGRATE V0 CODE** 📝

#### **3.1: Main Page Component**

Paste the V0-generated code into `frontend/src/app/landing-v2/page.tsx`:

```typescript
// frontend/src/app/landing-v2/page.tsx

// Paste the MAIN PAGE code from V0 here
// This will be the Server Component with all sections

// Example structure (V0 will generate the full code):
export default function LandingPageV2() {
  return (
    <main>
      {/* Hero Section */}
      {/* Stats Bar */}
      {/* API/Integrations Section */}
      {/* Video Section */}
      {/* Features */}
      {/* Steps/Workflow */}
      {/* Integrations */}
      {/* Comparison Table */}
      {/* Security & Compliance */}
      {/* Pricing */}
      {/* FAQ */}
      {/* Footer */}
    </main>
  );
}
```

#### **3.2: Extract Components**

If V0 generates separate components, extract them:

1. **StickyCta.tsx** (Client Component):
   ```typescript
   // frontend/src/components/landing-v2/StickyCta.tsx
   'use client';
   
   // Paste V0's StickyCta component code here
   ```

2. **VideoPlayer.tsx** (Client Component):
   ```typescript
   // frontend/src/components/landing-v2/VideoPlayer.tsx
   'use client';
   
   // Paste V0's VideoPlayer component code here
   ```

3. **ApiSnippet.tsx** (Server Component):
   ```typescript
   // frontend/src/components/landing-v2/ApiSnippet.tsx
   
   // Paste V0's ApiSnippet component code here
   ```

#### **3.3: Update Imports**

Make sure imports in `page.tsx` point to the correct component paths:

```typescript
// frontend/src/app/landing-v2/page.tsx

import StickyCta from '@/components/landing-v2/StickyCta';
import VideoPlayer from '@/components/landing-v2/VideoPlayer';
import ApiSnippet from '@/components/landing-v2/ApiSnippet';
```

---

### **STEP 4: WIRE UP FEATURE FLAG** 🎛️

#### **4.1: Update Root Layout** (Optional - for redirect)

Create a conditional redirect in your root layout or middleware:

```typescript
// frontend/src/middleware.ts (if using middleware)
// OR
// frontend/src/app/layout.tsx (server-side redirect)

import { FEATURE_FLAGS } from '@/config/featureFlags';

// If NEW_LANDING_PAGE is true, redirect / to /landing-v2
if (FEATURE_FLAGS.NEW_LANDING_PAGE && pathname === '/') {
  return NextResponse.redirect(new URL('/landing-v2', request.url));
}
```

#### **4.2: Add Navigation Link** (for testing)

Add a link to test the new landing page before enabling the flag:

```typescript
// In your navigation or header component
<Link href="/landing-v2">
  New Landing Page (Preview)
</Link>
```

---

### **STEP 5: TEST LOCALLY** 🧪

```powershell
# Start dev server
npm run dev

# Visit the new landing page
# Open: http://localhost:3000/landing-v2
```

**Test Checklist**:
- [ ] Hero section loads with actual deed illustration
- [ ] Colors match (#f9f9f9, #1F2B37, #77F2A1, #4F76F6)
- [ ] Heavy fonts display correctly (font-black headlines)
- [ ] Generous spacing visible (plenty of white space)
- [ ] Stats bar shows correct numbers
- [ ] Integrations section displays logos
- [ ] Video section loads (youtube-nocookie)
- [ ] Pricing cards display correctly (middle tier highlighted)
- [ ] Sticky CTA appears on scroll (~33%)
- [ ] All CTAs link to correct pages
- [ ] Mobile responsive (test on small screen)
- [ ] No console errors
- [ ] No layout shift (check Lighthouse)

---

### **STEP 6: FIX ANY ISSUES** 🔧

Common V0 integration issues:

#### **Issue 1: Missing shadcn/ui Components**

If V0 uses components you don't have installed:

```bash
# Install missing shadcn/ui components
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
```

#### **Issue 2: Import Path Errors**

Update import paths to match your project structure:

```typescript
// V0 might use:
import { Button } from '@/components/ui/button'

// Make sure it matches your actual path:
import { Button } from '@/components/ui/button'  // Check if this file exists
```

#### **Issue 3: Icon Imports**

Ensure lucide-react is installed:

```bash
npm install lucide-react
```

#### **Issue 4: Tailwind Classes Not Working**

Make sure your `tailwind.config.js` includes the new files:

```javascript
// frontend/tailwind.config.js
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    // Add this if not present:
    './src/components/landing-v2/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // ... rest of config
}
```

---

### **STEP 7: ENABLE FEATURE FLAG** 🚀

Once testing is complete and you're happy with the result:

```typescript
// frontend/src/config/featureFlags.ts

export const FEATURE_FLAGS = {
  // ... other flags
  
  // Phase 24: V0 UI Facelift
  NEW_LANDING_PAGE: true,  // ✅ Enable the new landing page
  // ... rest of flags
}
```

**Deploy**:
```bash
git add .
git commit -m "Phase 24: Enable V0 landing page"
git push origin main
```

---

### **STEP 8: MONITOR & ITERATE** 📊

#### **Track Performance**:
- Run Lighthouse audit (target: 90+ on all metrics)
- Check Core Web Vitals (LCP < 2.5s, CLS < 0.1)
- Monitor conversion rates (compare to old landing page)

#### **Gather Feedback**:
- Share with escrow officers (does it appeal to them?)
- Share with tech partners (does it show integrations well?)
- Internal team review

#### **Iterate**:
- Make small tweaks as needed
- Update V0 prompt and regenerate if major changes needed
- Document learnings for Phase 24-B (Dashboard) and Phase 24-C (Wizard UI)

---

## 🔄 **ROLLBACK PLAN** (If Needed)

If something goes wrong, you can instantly rollback:

### **Quick Rollback** (Disable Feature Flag):
```typescript
// frontend/src/config/featureFlags.ts
NEW_LANDING_PAGE: false,  // ❌ Disable immediately
```

**Deploy**:
```bash
git add frontend/src/config/featureFlags.ts
git commit -m "ROLLBACK: Disable new landing page"
git push origin main
```

**Result**: Users will immediately see the old landing page at `/`

### **Keep for Testing**:
The new landing page will still be accessible at `/landing-v2` for debugging and fixes.

---

## 📁 **FILE STRUCTURE** (Final)

```
frontend/
├── src/
│   ├── app/
│   │   ├── landing-v2/
│   │   │   └── page.tsx              # ✅ New V0 landing page
│   │   ├── page.tsx                   # ✅ Old landing page (backup)
│   │   └── layout.tsx                 # May include redirect logic
│   ├── components/
│   │   ├── landing-v2/
│   │   │   ├── StickyCta.tsx         # Client island
│   │   │   ├── VideoPlayer.tsx       # Client island
│   │   │   └── ApiSnippet.tsx        # Server component
│   │   └── ui/
│   │       ├── badge.tsx             # shadcn/ui components
│   │       ├── button.tsx
│   │       └── card.tsx
│   └── config/
│       └── featureFlags.ts           # ✅ NEW_LANDING_PAGE flag
├── tailwind.config.js                # Includes landing-v2 in content
└── package.json

v0-prompts/
└── landing-page-master-prompt-v1.md  # ✅ Master prompt (ready)

docs/ (or root)
└── PHASE_24_V0_INTEGRATION_GUIDE.md  # ✅ This file
```

---

## 🎯 **SUCCESS CRITERIA**

Before marking Phase 24-A complete:

- [ ] V0 code generated and integrated
- [ ] New landing page accessible at `/landing-v2`
- [ ] All 13 sections present and functional
- [ ] Colors match specification
- [ ] Heavy fonts display correctly
- [ ] Generous spacing visible
- [ ] Actual deed illustration in hero
- [ ] Mobile responsive
- [ ] Lighthouse score ≥ 90 (all metrics)
- [ ] No console errors
- [ ] Feature flag working
- [ ] Rollback plan tested
- [ ] Team reviewed and approved

---

## 📝 **NEXT STEPS** (After Phase 24-A)

Once the landing page is live and stable:

1. **Phase 24-B**: Dashboard UI Facelift
   - Create V0 prompt for dashboard redesign
   - Integrate with same pattern (feature flag + new route)

2. **Phase 24-C**: Wizard UI Facelift
   - Create V0 prompt for wizard UI improvements
   - **CRITICAL**: UI-only changes (don't touch logic/state)

3. **Phase 24-D**: A/B Testing
   - Set up analytics to compare old vs new landing page
   - Gather conversion data
   - Make data-driven decision on full rollout

---

## 🚀 **YOU'RE READY!**

This guide will walk you through every step. Take it slow, test thoroughly, and don't hesitate to rollback if needed.

**NEXT ACTION**: Go to V0.dev and paste the master prompt! 🎨✨


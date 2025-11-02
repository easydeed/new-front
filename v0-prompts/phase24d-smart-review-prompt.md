# V0 Prompt – DeedPro SmartReview V0 (Phase 24-D)

## 🎯 Task
Redesign the **SmartReview UI** for DeedPro's Modern Wizard while **preserving ALL existing logic** (state display, edit callbacks, confirm handler, field validation).

## 🔒 **CRITICAL: Keep ALL Logic - UI ONLY REDESIGN**
- ✅ Props interface: `docType`, `state`, `onEdit`, `onConfirm`, `busy`
- ✅ Field display logic (all important fields shown)
- ✅ Edit button handlers
- ✅ Confirm button handler
- ✅ Empty state detection
- ✅ Field validation (checking for empty vs filled)
- ✅ Fallback event dispatch (`smartreview:confirm`)
- ✅ All field labels mapping
- ✅ Disabled state when no data

## 🎨 **Design Requirements**
- Modern, clean review UI with purple accents
- Tailwind v3 utilities only
- Light theme with subtle gradients
- Mobile-first responsive design (320px → 1920px)
- Great accessibility (WCAG AA, keyboard nav, ARIA)
- Smooth animations (respect prefers-reduced-motion)
- Clear visual hierarchy (title → fields → action)
- Inline edit actions
- Copy-to-clipboard for each field
- Field validation indicators (filled vs empty)

## 🎨 **Color Palette to Use**
```css
/* DeedPro Modern Wizard brand colors: */
Primary Purple: #7C4DFF (confirm button, accents)
Secondary Blue: #4F76F6 (edit buttons, links)
Background: #F9F9F9 (light gray)
Surface: #FFFFFF (white cards, field backgrounds)
Text: #1F2B37 (dark text)
Border: #E5E7EB (light borders)
Success: #10B981 (green - filled fields)
Warning: #F59E0B (yellow - optional fields)
Error: #EF4444 (red - empty required fields)
Info: #3B82F6 (blue - info messages)
Gray: #9CA3AF (placeholder, not provided text)
```

## 📋 **Current Component Structure**

### **Component Setup:**
```typescript
'use client';
import React, { useCallback } from 'react';

type Props = {
  docType?: string;        // ✅ MUST KEEP - e.g. 'grant-deed'
  state?: Record<string, any>;  // ✅ MUST KEEP - All wizard data
  onEdit?: (field: string) => void;  // ✅ MUST KEEP - Called when user clicks "Edit" for a field
  onConfirm?: () => void;  // ✅ MUST KEEP - Called when user clicks "Confirm & Generate"
  busy?: boolean;          // ✅ MUST KEEP - True when generating deed (shows spinner)
};

/**
 * ✅ MUST KEEP THIS COMMENT BLOCK
 * Presentational SmartReview
 * - Shows summary of wizard state with edit buttons
 * - NO direct network calls
 * - NO redirects
 * - Emits 'smartreview:confirm' event that ModernEngine listens for
 */
export default function SmartReview({ docType, state, onEdit, onConfirm, busy }: Props) {
  // ✅ MUST KEEP - Handles confirm with fallback to DOM event
  const handleConfirm = useCallback(() => {
    if (typeof onConfirm === 'function') {
      onConfirm();
    } else {
      // Fallback: dispatch a DOM event the engine listens for
      window.dispatchEvent(new Event('smartreview:confirm'));
    }
  }, [onConfirm, state]);

  // ✅ MUST KEEP - Field labels for better display
  const fieldLabels: Record<string, string> = {
    grantorName: 'Grantor (Transferring Title)',
    granteeName: 'Grantee (Receiving Title)',
    requestedBy: 'Requested By',
    vesting: 'Vesting',
    propertyAddress: 'Property Address',
    fullAddress: 'Property Address',
    apn: 'APN',
    county: 'County',
    legalDescription: 'Legal Description',
  };

  // ✅ MUST KEEP - Important fields to show (ALL of them, even if empty)
  const importantFields = [
    'grantorName', 
    'granteeName', 
    'requestedBy', 
    'vesting', 
    'propertyAddress', 
    'fullAddress', 
    'apn', 
    'county', 
    'legalDescription'
  ];
  
  // ✅ MUST KEEP - Check if we have ANY state data at all
  const hasAnyData = state && Object.keys(state).length > 0;
  const hasImportantData = importantFields.some(k => state?.[k] && String(state[k]).trim() !== '');

  return (
    // ✅ Component JSX here - THIS is what you redesign!
  );
}
```

## 🎨 **Current UI Flow & States**

### **State 1: Has Complete Data (Success)**
```
User sees:
- Title: "Review Your Deed"
- Subtitle: "Please review the information below before generating the deed."
- Card with all fields:
  ✓ Grantor (Transferring Title): JOHN DOE; JANE DOE
  ✓ Grantee (Receiving Title): BOB SMITH
  ✓ Requested By: ABC Title Company
  ✓ Vesting: Joint Tenants
  ✓ Property Address: 1234 Main St, Los Angeles, CA
  ✓ APN: 5432-001-042
  ✓ County: Los Angeles County
  ✓ Legal Description: LOT 42, TRACT 5432...
- Each field has [Edit] button
- Bottom: [Confirm & Generate] button (enabled, purple, prominent)
```

### **State 2: Missing Some Fields (Partial)**
```
Same as State 1, but some fields show:
  ✗ Requested By: Not provided (gray, italic)
  ✗ Vesting: Not provided (gray, italic)

Confirm button is still enabled (optional fields can be empty)
```

### **State 3: No Data (Error)**
```
Title: "Review Your Deed"
Subtitle: "Please review the information below before generating the deed."

⚠️ Warning box:
"Warning: No data to review. State is empty or undefined."

Confirm button is DISABLED
```

### **State 4: Generating Deed (Busy)**
```
Same as State 1/2, but:
- Confirm button shows: "Generating..." with spinner
- Confirm button is disabled
- All Edit buttons are disabled
- User can't interact
```

## 📐 **UI Layout to Create**

### **Desktop Layout (≥ 768px):**
```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  Review Your Deed                                              │
│  Please review the information below before generating the deed│
│  ────────────────────────────────────────────────────────────  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 📄 Deed Information                                      │ │
│  │ ──────────────────────────────────────────────────────── │ │
│  │                                                          │ │
│  │ Grantor (Transferring Title)         [Edit]  [Copy]     │ │
│  │ JOHN DOE; JANE DOE                                       │ │
│  │ ──────────────────────────────────────────────────────── │ │
│  │ Grantee (Receiving Title)            [Edit]  [Copy]     │ │
│  │ BOB SMITH                                                │ │
│  │ ──────────────────────────────────────────────────────── │ │
│  │ Requested By                         [Edit]  [Copy]     │ │
│  │ ABC Title Company                                        │ │
│  │ ──────────────────────────────────────────────────────── │ │
│  │ Vesting                              [Edit]  [Copy]     │ │
│  │ Joint Tenants                                            │ │
│  │ ──────────────────────────────────────────────────────── │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 🏠 Property Information                                  │ │
│  │ ──────────────────────────────────────────────────────── │ │
│  │                                                          │ │
│  │ Property Address                     [Edit]  [Copy]     │ │
│  │ 1234 Main St, Los Angeles, CA 90001                      │ │
│  │ ──────────────────────────────────────────────────────── │ │
│  │ APN                                  [Edit]  [Copy]     │ │
│  │ 5432-001-042                                             │ │
│  │ ──────────────────────────────────────────────────────── │ │
│  │ County                               [Edit]  [Copy]     │ │
│  │ Los Angeles County                                       │ │
│  │ ──────────────────────────────────────────────────────── │ │
│  │ Legal Description                    [Edit]  [Copy]     │ │
│  │ LOT 42, TRACT 5432, MAP BOOK 123, PAGE 456,             │ │
│  │ LOS ANGELES COUNTY, CALIFORNIA                           │ │
│  │ [Show More]                                              │ │ (if long)
│  │ ──────────────────────────────────────────────────────── │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ ⚠️ Important: Please verify all information is correct  │ │
│  │ before generating the deed. Changes cannot be made after.│ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│                          [✓ Confirm & Generate Deed]          │
│                          (large, purple, prominent)            │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### **Mobile Layout (< 768px):**
```
┌─────────────────────────────────┐
│                                 │
│  Review Your Deed               │
│  Please review before           │
│  generating the deed            │
│  ─────────────────────────────  │
│                                 │
│  📄 Deed Information            │
│  ─────────────────────────────  │
│                                 │
│  Grantor (Transferring)         │
│  JOHN DOE; JANE DOE             │
│  [Edit] [Copy]                  │
│  ─────────────────────────────  │
│  Grantee (Receiving)            │
│  BOB SMITH                      │
│  [Edit] [Copy]                  │
│  ─────────────────────────────  │
│  Requested By                   │
│  ABC Title Company              │
│  [Edit] [Copy]                  │
│  ─────────────────────────────  │
│  Vesting                        │
│  Joint Tenants                  │
│  [Edit] [Copy]                  │
│  ─────────────────────────────  │
│                                 │
│  🏠 Property Information        │
│  ─────────────────────────────  │
│  Property Address               │
│  1234 Main St, LA, CA           │
│  [Edit] [Copy]                  │
│  ─────────────────────────────  │
│  APN                            │
│  5432-001-042                   │
│  [Edit] [Copy]                  │
│  ─────────────────────────────  │
│  County                         │
│  LA County                      │
│  [Edit] [Copy]                  │
│  ─────────────────────────────  │
│  Legal Description              │
│  LOT 42, TRACT 5432...          │
│  [Show More]                    │
│  [Edit] [Copy]                  │
│  ─────────────────────────────  │
│                                 │
│  ⚠️ Verify all info before      │
│  generating                     │
│                                 │
│  [✓ Confirm & Generate]         │
│  (full width)                   │
│                                 │
└─────────────────────────────────┘
```

## ✨ **Design Enhancements You Can Add:**

### **1. Section Cards:**
- Elevated cards (shadow-md)
- Section headers with icons:
  - 📄 Deed Information
  - 🏠 Property Information
- Subtle background gradient
- Border-left accent (purple)

### **2. Field Display:**
- Two-line layout:
  - Line 1: Label (gray, small, semibold)
  - Line 2: Value (black, large, normal)
- Filled fields: Green checkmark icon (✓)
- Empty fields: Gray dash icon (—)
- Long values: Truncate with "Show More" button

### **3. Edit Buttons:**
- Small, secondary button
- Blue color (#4F76F6)
- Icon: ✏️ or pencil icon
- Hover: Slightly darker
- Disabled when busy: Gray

### **4. Copy Buttons:**
- Small, tertiary button
- Gray color
- Icon: 📋 or copy icon
- Click: Copy to clipboard + show "Copied!" tooltip
- Smooth fade-in/out animation

### **5. Confirm Button:**
- Large, prominent
- Purple (#7C4DFF)
- White text
- Icon: ✓ checkmark
- Hover: Slightly darker + scale up (1.02)
- Active: Scale down (0.98)
- Disabled: Gray + cursor-not-allowed
- Loading: Spinner + "Generating..."

### **6. Warning Banner:**
- Yellow background (#FEF3C7)
- Yellow border (#FCD34D)
- Orange text (#92400E)
- Icon: ⚠️
- Smooth slide-in from top

### **7. Empty State:**
- Red background (#FEF2F2)
- Red border (#FCA5A5)
- Red text (#991B1B)
- Icon: ⚠️ or ❌
- Message: "Warning: No data to review. State is empty or undefined."

### **8. Loading State:**
- Confirm button shows spinner
- All buttons disabled
- Optional: Overlay with "Please wait..." message

### **9. Animations:**
- Fade-in on mount
- Smooth transitions on hover
- Copy button: Check animation on success
- Respect prefers-reduced-motion

## 🔧 **TypeScript Interface (MUST KEEP):**

```typescript
type Props = {
  docType?: string;                      // e.g. 'grant-deed', 'quitclaim'
  state?: Record<string, any>;           // All wizard data
  onEdit?: (field: string) => void;      // Called when user clicks Edit
  onConfirm?: () => void;                // Called when user clicks Confirm
  busy?: boolean;                        // True when generating deed
};
```

## 🎨 **Tailwind Classes to Use:**

### **Container:**
```tsx
<div className="max-w-4xl mx-auto px-4 py-8">
```

### **Title:**
```tsx
<h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
  Review Your Deed
</h1>
<p className="text-lg text-gray-600 mb-8">
  Please review the information below before generating the deed.
</p>
```

### **Section Card:**
```tsx
<div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
    📄 Deed Information
  </h2>
  {/* Fields here */}
</div>
```

### **Field Row:**
```tsx
<div className="border-b border-gray-100 pb-4 mb-4 last:border-none last:pb-0 last:mb-0">
  <div className="flex items-center justify-between mb-2">
    <div className="text-sm font-semibold text-gray-500">
      Grantor (Transferring Title)
    </div>
    <div className="flex items-center gap-2">
      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
        ✏️ Edit
      </button>
      <button className="text-gray-500 hover:text-gray-700 text-sm">
        📋 Copy
      </button>
    </div>
  </div>
  <div className="text-base text-gray-900">
    JOHN DOE; JANE DOE
  </div>
</div>
```

### **Empty Field:**
```tsx
<div className="text-base text-gray-400 italic">
  Not provided
</div>
```

### **Confirm Button:**
```tsx
<button
  className="w-full md:w-auto px-8 py-4 bg-purple-600 hover:bg-purple-700 
             active:scale-98 text-white font-bold text-lg rounded-lg 
             shadow-lg shadow-purple-500/25 transition-all duration-200 
             disabled:bg-gray-300 disabled:cursor-not-allowed
             focus:ring-4 focus:ring-purple-500/50
             flex items-center justify-center gap-2"
  onClick={handleConfirm}
  disabled={busy || !hasImportantData}
>
  {busy ? (
    <>
      <span className="animate-spin">⏳</span>
      Generating...
    </>
  ) : (
    <>
      <span>✓</span>
      Confirm & Generate Deed
    </>
  )}
</button>
```

### **Warning Banner:**
```tsx
<div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
  <span className="text-yellow-600 text-xl">⚠️</span>
  <div>
    <div className="font-semibold text-yellow-900">Important</div>
    <div className="text-sm text-yellow-700">
      Please verify all information is correct before generating the deed. 
      Changes cannot be made after generation.
    </div>
  </div>
</div>
```

### **Error State:**
```tsx
<div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
  <span className="text-red-500 text-xl">⚠️</span>
  <div>
    <div className="font-semibold text-red-900">Warning</div>
    <div className="text-sm text-red-700">
      No data to review. State is empty or undefined.
    </div>
  </div>
</div>
```

## 📱 **Responsive Breakpoints:**

```typescript
// Tailwind breakpoints (mobile-first)
sm: 640px   // Small tablets
md: 768px   // Tablets - 2-column layout for fields
lg: 1024px  // Laptops
xl: 1280px  // Desktops

// Usage:
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">  // Stack on mobile, 2-col on tablet+
```

## 🎯 **Output Format:**

Provide:

1. **Complete React Component** (`SmartReviewV0.tsx`)
   - TypeScript with Props interface
   - All existing logic preserved
   - Beautiful Tailwind styling
   - Responsive design (mobile-first)
   - Copy-to-clipboard functionality
   - Collapsible long text (legal description)
   - Loading states
   - Error states
   - Empty states

2. **Any Helper Components** (if you extract them):
   - `FieldRow.tsx` (individual field display)
   - `SectionCard.tsx` (deed info vs property info)
   - `CopyButton.tsx` (copy-to-clipboard with tooltip)

3. **Notes**:
   - What animations were added
   - What accessibility features were added
   - What responsive changes were made
   - How copy-to-clipboard works
   - How long text is handled (truncation/expansion)

## ✅ **Final Checklist:**

Before you submit, verify:

- [ ] Props interface preserved (docType, state, onEdit, onConfirm, busy)
- [ ] Field labels mapping preserved
- [ ] Important fields list preserved
- [ ] hasAnyData logic preserved
- [ ] hasImportantData logic preserved
- [ ] handleConfirm with fallback event preserved
- [ ] onEdit callback works for all fields
- [ ] onConfirm callback works
- [ ] Busy state disables all interactions
- [ ] Empty fields show "Not provided" (gray, italic)
- [ ] Filled fields show value (black, normal)
- [ ] Edit buttons work
- [ ] Copy buttons work (copy to clipboard)
- [ ] Confirm button disabled when no data
- [ ] Confirm button shows "Generating..." when busy
- [ ] Warning banner shows for important verification
- [ ] Error state shows when no data
- [ ] Mobile responsive (320px → 1920px)
- [ ] Keyboard navigation works
- [ ] Focus states visible
- [ ] Animations respect prefers-reduced-motion
- [ ] Colors match brand (#7C4DFF purple)
- [ ] No console errors or warnings
- [ ] All field display in correct sections

## 💪 **LET'S CRUSH THIS!**

**Remember**: This is the LAST step before PDF generation. Make it:
- **Clear** (users understand what they're confirming)
- **Trustworthy** (no mistakes before generation)
- **Actionable** (easy to edit if something is wrong)
- **Beautiful** (modern, professional)
- **Accessible** (keyboard nav, screen readers)

**You got this, V0! Create the best review experience ever!** 🚀

---

**Generated by**: AI Assistant (A-Game Mode)  
**Date**: November 2, 2025  
**Score**: 10/10 Championship Edition  
**Ready for**: Vercel V0 → Production


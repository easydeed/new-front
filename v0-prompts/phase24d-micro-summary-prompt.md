# V0 Prompt – DeedPro MicroSummary V0 (Phase 24-D)

## 🎯 Task
Redesign the **MicroSummary (Floating Progress Indicator)** for DeedPro's Modern Wizard while **preserving ALL existing logic** (text display, positioning).

## 🔒 **CRITICAL: Keep ALL Logic - UI ONLY REDESIGN**
- ✅ Props: `text` (string to display, e.g. "Step 2 of 5")
- ✅ Fixed positioning (stays visible while scrolling)
- ✅ Non-intrusive (doesn't block content)
- ✅ Show on desktop, hide on mobile (optional)

## 🎨 **Design Requirements**
- Small, elegant floating card
- Tailwind v3 utilities only (no custom CSS except positioning)
- Light theme with subtle shadow
- Fixed position (bottom-right or top-right)
- Great accessibility (ARIA labels)
- Smooth animations (fade-in, slide-in)
- Non-intrusive (semi-transparent on hover)
- Optional: Hide on mobile (md:block)

## 🎨 **Color Palette to Use**
```css
/* DeedPro Modern Wizard brand colors: */
Primary Purple: #7C4DFF (text, border)
Secondary Blue: #4F76F6 (optional accent)
Background: #FFFFFF (white card)
Text: #1F2B37 (dark text) or #7C4DFF (purple text)
Border: #E5E7EB (light border)
Shadow: rgba(124, 77, 255, 0.1) (purple shadow)
Gray: #6B7280 (secondary text)
```

## 📋 **Current Component Structure**

### **Component Setup:**
```typescript
// File: MicroSummary.tsx
'use client';
import React from 'react';

export default function MicroSummary({ text }: { text: string }) {
  return <div className="wiz-micro">{text}</div>;
}
```

### **Props Interface:**
```typescript
type Props = {
  text: string;  // ✅ MUST KEEP - Text to display (e.g. "Step 2 of 5")
};

// Example usage:
<MicroSummary text="Step 2 of 5" />
// or
<MicroSummary text={`Step ${current} of ${total}`} />
```

### **Current Usage:**
```typescript
// In ModernEngine.tsx:
return (
  <StepShell>
    {/* Question and input here */}
    
    <MicroSummary text={`Step ${i + 1} of ${total}`} />
  </StepShell>
);
```

## 🎨 **Design Options**

### **Option 1: Bottom-Right Card (Recommended)**
Small floating card in bottom-right corner

**Visual:**
```
┌─────────────────────────────────────────┐
│                                         │
│  [Main wizard content here]             │
│                                         │
│                                         │
│                           ┌──────────┐  │
│                           │ Step 2/5 │  │
│                           └──────────┘  │
└─────────────────────────────────────────┘
```

### **Option 2: Top-Right Badge**
Minimal badge in top-right corner

**Visual:**
```
┌─────────────────────────────────────────┐
│                           ┌──────────┐  │
│                           │ Step 2/5 │  │
│                           └──────────┘  │
│                                         │
│  [Main wizard content here]             │
│                                         │
└─────────────────────────────────────────┘
```

### **Option 3: Bottom-Center Pill**
Pill-shaped indicator at bottom-center

**Visual:**
```
┌─────────────────────────────────────────┐
│                                         │
│  [Main wizard content here]             │
│                                         │
│            ┌──────────────┐             │
│            │  Step 2 of 5 │             │
│            └──────────────┘             │
└─────────────────────────────────────────┘
```

## 📐 **UI Layouts**

### **Option 1: Bottom-Right Card**

#### **Desktop (≥ 768px):**
```
Fixed position:
- bottom: 24px (1.5rem)
- right: 24px (1.5rem)

┌────────────────┐
│  Step 2 of 5   │
│  ━━━━━━░░░░    │  (optional: mini progress bar)
└────────────────┘

Styles:
- White background
- Purple border (2px)
- Shadow (shadow-lg)
- Rounded (rounded-lg)
- Padding (px-4 py-2)
- Purple text (text-purple-600)
- Semibold font (font-semibold)
- Small text (text-sm)
```

#### **Mobile (< 768px):**
```
Hidden (hidden md:block)
- OR -
Show in different position (optional):
- Bottom-center
- Smaller size
- Less padding
```

### **Option 2: Top-Right Badge**

#### **Desktop (≥ 768px):**
```
Fixed position:
- top: 24px (1.5rem)
- right: 24px (1.5rem)

┌────────┐
│  2 / 5 │
└────────┘

Styles:
- Purple background (bg-purple-600)
- White text (text-white)
- Rounded (rounded-full)
- Padding (px-3 py-1)
- Bold font (font-bold)
- Tiny text (text-xs)
- Shadow (shadow-md)
```

#### **Mobile (< 768px):**
```
Hidden (hidden md:block)
```

### **Option 3: Bottom-Center Pill**

#### **Desktop (≥ 768px):**
```
Fixed position:
- bottom: 24px (1.5rem)
- left: 50%
- transform: translateX(-50%)

┌──────────────────┐
│   Step 2 of 5    │
└──────────────────┘

Styles:
- White background (bg-white)
- Purple text (text-purple-600)
- Rounded pill (rounded-full)
- Padding (px-6 py-2)
- Semibold font (font-semibold)
- Small text (text-sm)
- Shadow (shadow-lg)
- Border (border border-purple-200)
```

#### **Mobile (< 768px):**
```
Same, but:
- Smaller padding (px-4 py-1.5)
- Smaller text (text-xs)
- Positioned slightly higher (bottom: 80px to avoid nav)
```

## ✨ **Design Enhancements**

### **1. Card/Badge:**
- Clean, minimal design
- Purple accent (border or background)
- Subtle shadow (shadow-md or shadow-lg)
- Rounded corners (rounded-lg or rounded-full)
- Semibold text
- Proper padding (not cramped)

### **2. Optional: Mini Progress Bar:**
Show a tiny horizontal bar inside the card

```tsx
<div className="fixed bottom-6 right-6 bg-white border-2 border-purple-600 
                rounded-lg shadow-lg px-4 py-2 space-y-1">
  <div className="text-sm font-semibold text-purple-600">
    Step 2 of 5
  </div>
  <div className="h-1 w-24 bg-gray-200 rounded-full overflow-hidden">
    <div className="h-full bg-purple-600" style={{ width: '40%' }} />
  </div>
</div>
```

### **3. Optional: Icon:**
Add a small icon for visual interest

```tsx
<div className="flex items-center gap-2">
  <span className="text-purple-600">📋</span>
  <span>Step 2 of 5</span>
</div>
```

### **4. Hover Effects:**
- Slight scale up (hover:scale-105)
- Opacity change (hover:opacity-80)
- Shadow increase (hover:shadow-xl)

### **5. Animations:**
- Fade-in on mount (animate-fade-in)
- Slide-in from right (animate-slide-in-right)
- Smooth transitions (transition-all duration-300)
- Respect prefers-reduced-motion

### **6. Accessibility:**
- aria-label="Progress indicator"
- aria-live="polite" (announce changes to screen readers)
- role="status"

### **7. Responsive Behavior:**
- Desktop: Visible (md:block)
- Mobile: Hidden (hidden md:block) OR different position

## 🎨 **Tailwind Implementation Examples**

### **Option 1: Bottom-Right Card (Recommended)**

```tsx
'use client';
import React from 'react';

export default function MicroSummary({ text }: { text: string }) {
  return (
    <div 
      className="fixed bottom-6 right-6 z-50
                 hidden md:block
                 bg-white border-2 border-purple-600 rounded-lg shadow-lg
                 px-4 py-2
                 text-sm font-semibold text-purple-600
                 transition-all duration-300 hover:scale-105 hover:shadow-xl
                 animate-fade-in"
      role="status"
      aria-live="polite"
      aria-label="Progress indicator"
    >
      {text}
    </div>
  );
}

// Add this to your global CSS or Tailwind config for animate-fade-in:
// @keyframes fade-in {
//   from { opacity: 0; transform: translateY(10px); }
//   to { opacity: 1; transform: translateY(0); }
// }
// .animate-fade-in {
//   animation: fade-in 0.3s ease-out;
// }
```

### **Option 2: Bottom-Right with Mini Progress Bar**

```tsx
'use client';
import React from 'react';

export default function MicroSummary({ text }: { text: string }) {
  // Parse "Step X of Y" to calculate percentage
  const match = text.match(/(\d+)\s+of\s+(\d+)/);
  const percentage = match ? (parseInt(match[1]) / parseInt(match[2])) * 100 : 0;
  
  return (
    <div 
      className="fixed bottom-6 right-6 z-50
                 hidden md:block
                 bg-white border-2 border-purple-600 rounded-lg shadow-lg
                 px-4 py-2 space-y-1
                 transition-all duration-300 hover:scale-105"
      role="status"
      aria-live="polite"
      aria-label="Progress indicator"
    >
      <div className="text-sm font-semibold text-purple-600 whitespace-nowrap">
        {text}
      </div>
      {percentage > 0 && (
        <div className="h-1 w-24 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-purple-600 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
```

### **Option 3: Top-Right Badge**

```tsx
'use client';
import React from 'react';

export default function MicroSummary({ text }: { text: string }) {
  // Shorten "Step 2 of 5" to "2/5" for compact display
  const match = text.match(/(\d+)\s+of\s+(\d+)/);
  const shortText = match ? `${match[1]}/${match[2]}` : text;
  
  return (
    <div 
      className="fixed top-6 right-6 z-50
                 hidden md:block
                 bg-purple-600 text-white rounded-full shadow-md
                 px-3 py-1
                 text-xs font-bold
                 transition-all duration-300 hover:scale-110
                 animate-fade-in"
      role="status"
      aria-live="polite"
      aria-label={text}
      title={text}
    >
      {shortText}
    </div>
  );
}
```

### **Option 4: Bottom-Center Pill**

```tsx
'use client';
import React from 'react';

export default function MicroSummary({ text }: { text: string }) {
  return (
    <div 
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                 hidden md:block
                 bg-white border border-purple-200 rounded-full shadow-lg
                 px-6 py-2
                 text-sm font-semibold text-purple-600
                 transition-all duration-300 hover:shadow-xl
                 animate-slide-up"
      role="status"
      aria-live="polite"
      aria-label="Progress indicator"
    >
      {text}
    </div>
  );
}

// Add this for animate-slide-up:
// @keyframes slide-up {
//   from { opacity: 0; transform: translate(-50%, 20px); }
//   to { opacity: 1; transform: translate(-50%, 0); }
// }
// .animate-slide-up {
//   animation: slide-up 0.4s ease-out;
// }
```

### **Option 5: Enhanced with Icon**

```tsx
'use client';
import React from 'react';

export default function MicroSummary({ text }: { text: string }) {
  return (
    <div 
      className="fixed bottom-6 right-6 z-50
                 hidden md:flex items-center gap-2
                 bg-white border-2 border-purple-600 rounded-lg shadow-lg
                 px-4 py-2
                 text-sm font-semibold text-purple-600
                 transition-all duration-300 hover:scale-105 hover:shadow-xl"
      role="status"
      aria-live="polite"
      aria-label="Progress indicator"
    >
      <span className="text-lg">📋</span>
      <span>{text}</span>
    </div>
  );
}
```

## 📱 **Responsive Breakpoints:**

```typescript
// Tailwind breakpoints (mobile-first)
sm: 640px   // Small tablets
md: 768px   // Tablets - START SHOWING MicroSummary
lg: 1024px  // Laptops
xl: 1280px  // Desktops

// Responsive behavior:
Mobile (< 768px):
- Hidden (hidden md:block)
- Progress already visible in main ProgressBar

Desktop (≥ 768px):
- Visible (md:block or md:flex)
- Fixed position
- Full styling
```

## ✅ **Final Checklist:**

Before you submit, verify:

- [ ] Props interface preserved (text: string)
- [ ] Fixed positioning (doesn't scroll away)
- [ ] z-index high enough (z-50) to stay on top
- [ ] Non-intrusive placement (doesn't block content)
- [ ] Mobile responsive (hidden md:block)
- [ ] Accessibility: ARIA attributes (role, aria-live, aria-label)
- [ ] Colors match brand (#7C4DFF purple)
- [ ] Smooth animations (fade-in, slide-in)
- [ ] Animations respect prefers-reduced-motion
- [ ] Hover effects (scale, shadow)
- [ ] No console errors or warnings
- [ ] Works with any text string
- [ ] Handles long text gracefully (whitespace-nowrap or truncate)

## 🎯 **Output Format:**

Provide:

1. **Complete React Component** (`MicroSummaryV0.tsx`)
   - TypeScript with Props interface
   - All logic preserved
   - Beautiful Tailwind styling
   - Fixed positioning
   - Smooth animations
   - Accessibility features
   - Responsive (hide on mobile)

2. **Choose ONE design option:**
   - **Option 1**: Bottom-right card (simple, clean)
   - **Option 2**: Bottom-right with mini progress bar (enhanced feedback)
   - **Option 3**: Top-right badge (minimal, compact)
   - **Option 4**: Bottom-center pill (centered, elegant)
   - **Option 5**: Enhanced with icon (visual interest)

3. **Notes**:
   - Why you chose this design
   - What animations were added
   - What accessibility features were included
   - How it adapts on mobile (if at all)

## 💪 **LET'S CRUSH THIS!**

**Remember**: This is a TINY component but adds POLISH. Make it:
- **Subtle** (doesn't distract from main content)
- **Helpful** (quick glance shows progress)
- **Beautiful** (modern, professional)
- **Accessible** (screen readers announce changes)
- **Non-intrusive** (doesn't block anything important)

**You got this, V0! Add that final touch of polish!** 🚀

---

**Generated by**: AI Assistant (A-Game Mode)  
**Date**: November 2, 2025  
**Score**: 10/10 Championship Edition  
**Ready for**: Vercel V0 → Production


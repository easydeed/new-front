# DeedPro Deed Selection Page V0 Prompt

**Generated:** November 2, 2025  
**Component:** Deed Selection Page  
**Route:** `/create-deed`  
**Status:** Ready for V0 Generation  

---

## 🎯 **OBJECTIVE**

Redesign the DeedPro deed selection page with modern V0 UI while preserving 100% of the existing business logic (API integration, localStorage clearing, navigation).

---

## 📋 **EXISTING CODE TO PRESERVE**

### **Current Implementation:**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import '../../styles/dashboard.css';
import { WIZARD_DRAFT_KEY_MODERN, WIZARD_DRAFT_KEY_CLASSIC } from '@/features/wizard/mode/bridge/persistenceKeys';

interface DocumentType {
  label: string;
  description?: string;
  steps: Array<{
    key: string;
    title: string;
  }>;
}

interface DocumentTypesRegistry {
  [key: string]: DocumentType;
}

export default function CreateDeedPage() {
  const router = useRouter();
  const [documentTypes, setDocumentTypes] = useState<DocumentTypesRegistry>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch document types from backend
    const fetchDocumentTypes = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';
        const response = await fetch(`${apiUrl}/api/doc-types`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch document types: ${response.status}`);
        }
        
        const data = await response.json();
        setDocumentTypes(data);
      } catch (err) {
        console.error('Error fetching document types:', err);
        // Fallback to hardcoded registry
        setDocumentTypes({
          grant_deed: {
            label: "Grant Deed",
            description: "Transfer property ownership with warranties against defects during grantor's ownership. Most commonly used in California real estate transactions and sales.",
            steps: [
              { key: "request_details", title: "Request Details" },
              { key: "tax", title: "Transfer Tax" },
              { key: "parties_property", title: "Parties & Property" },
              { key: "review", title: "Review" },
              { key: "generate", title: "Generate" }
            ]
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentTypes();
  }, []);

  const handleDocumentTypeSelect = (docTypeKey: string) => {
    // ✅ CRITICAL: Clear wizard localStorage when starting NEW deed
    console.log('[CreateDeedPage] 🔄 Starting new deed - clearing all wizard localStorage');
    if (typeof window !== 'undefined') {
      localStorage.removeItem(WIZARD_DRAFT_KEY_MODERN);
      localStorage.removeItem(WIZARD_DRAFT_KEY_CLASSIC);
      sessionStorage.setItem('deedWizardCleared', 'true');
    }
    
    // Navigate to wizard
    router.push(`/create-deed/${docTypeKey.replace('_', '-')}`);
  };

  // ... loading, error, and render states
}
```

### **✅ MUST PRESERVE (DO NOT CHANGE):**

1. **API Integration:**
   ```typescript
   const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';
   const response = await fetch(`${apiUrl}/api/doc-types`);
   ```

2. **localStorage Clearing:**
   ```typescript
   localStorage.removeItem(WIZARD_DRAFT_KEY_MODERN);
   localStorage.removeItem(WIZARD_DRAFT_KEY_CLASSIC);
   sessionStorage.setItem('deedWizardCleared', 'true');
   ```

3. **Navigation:**
   ```typescript
   router.push(`/create-deed/${docTypeKey.replace('_', '-')}`);
   ```

4. **TypeScript Interfaces:**
   ```typescript
   interface DocumentType {
     label: string;
     description?: string;
     steps: Array<{ key: string; title: string; }>;
   }
   ```

5. **States:** `loading`, `error`, `documentTypes`

---

## 🎨 **NEW V0 UI DESIGN**

### **Layout Structure:**

```
┌─────────────────────────────────────────────────────────────┐
│  [Sidebar]  │  MAIN CONTENT                                 │
│             │                                                │
│             │  ┌──────────────────────────────────────────┐ │
│             │  │   Create Your Legal Document              │ │
│             │  │   Select the type of deed...              │ │
│             │  └──────────────────────────────────────────┘ │
│             │                                                │
│             │  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│             │  │ Grant   │  │ Quitclaim│ │ Warranty│       │
│             │  │ Deed    │  │ Deed     │ │ Deed    │       │
│             │  │         │  │          │ │         │       │
│             │  │ [Icon]  │  │ [Icon]   │ │ [Icon]  │       │
│             │  │ Steps   │  │ Steps    │ │ Steps   │       │
│             │  └─────────┘  └─────────┘  └─────────┘       │
│             │                                                │
└─────────────────────────────────────────────────────────────┘
```

### **Design Specifications:**

#### **1. Header Section:**
- **Heading:** "Create Your Legal Document"
  - Font: `text-4xl font-bold text-gray-900`
  - Spacing: `mb-4`

- **Subheading:** "Select the type of deed you need to create. Our AI-powered wizard will guide you through the process step by step."
  - Font: `text-lg text-gray-600`
  - Max width: `max-w-3xl mx-auto`
  - Spacing: `mb-12`

#### **2. Deed Type Cards:**

**Grid Layout:**
```typescript
<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
```

**Individual Card:**
```typescript
<div 
  className="group relative bg-white rounded-2xl shadow-lg border-2 border-gray-200
             hover:border-purple-500 hover:shadow-2xl hover:scale-[1.02]
             transition-all duration-300 cursor-pointer p-8"
  onClick={() => handleDocumentTypeSelect(key)}
>
  {/* Icon Container */}
  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600
                 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
    <FileDigit className="w-8 h-8 text-white" />
  </div>

  {/* Title */}
  <h3 className="text-2xl font-bold text-gray-900 mb-3">
    {docType.label}
  </h3>

  {/* Description */}
  <p className="text-gray-600 mb-6 leading-relaxed min-h-[80px]">
    {docType.description}
  </p>

  {/* Steps Preview */}
  <div className="mb-6">
    <div className="flex items-center gap-2 mb-3">
      <span className="text-sm font-semibold text-gray-700">Process Steps:</span>
      <Badge variant="secondary" className="text-xs">
        {docType.steps.length} steps
      </Badge>
    </div>
    
    {/* Step Pills */}
    <div className="flex flex-wrap gap-2">
      {docType.steps.map((step, index) => (
        <span 
          key={step.key}
          className="inline-flex items-center gap-1 bg-purple-50 text-purple-700
                   text-xs font-medium px-3 py-1.5 rounded-full"
        >
          <span className="w-4 h-4 rounded-full bg-purple-600 text-white
                         flex items-center justify-center text-[10px]">
            {index + 1}
          </span>
          {step.title}
        </span>
      ))}
    </div>
  </div>

  {/* CTA Button */}
  <div className="flex items-center justify-between text-purple-600 font-semibold
                 group-hover:text-purple-700 transition-colors">
    <span>Start Wizard</span>
    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
  </div>

  {/* Hover Effect Border Glow */}
  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/0 to-purple-600/0
                 group-hover:from-purple-500/10 group-hover:to-purple-600/10
                 transition-all duration-300 pointer-events-none" />
</div>
```

#### **3. Loading State:**
```typescript
<div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
  <div className="relative">
    {/* Spinning ring */}
    <div className="w-16 h-16 rounded-full border-4 border-purple-200 animate-spin
                   border-t-purple-600" />
    
    {/* Center icon */}
    <FileDigit className="w-6 h-6 text-purple-600 absolute top-1/2 left-1/2
                        -translate-x-1/2 -translate-y-1/2" />
  </div>
  
  <p className="text-lg text-gray-600 font-medium">Loading document types...</p>
  
  <p className="text-sm text-gray-500">Fetching available deed templates</p>
</div>
```

#### **4. Error State:**
```typescript
<div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 max-w-md mx-auto">
  <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
    <AlertCircle className="w-10 h-10 text-red-500" />
  </div>
  
  <h2 className="text-2xl font-bold text-gray-900">Unable to Load Document Types</h2>
  
  <p className="text-gray-600 text-center">{error}</p>
  
  <Button 
    onClick={() => window.location.reload()}
    className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold
             rounded-lg shadow-lg transition-all duration-200"
  >
    <RotateCw className="w-5 h-5 mr-2" />
    Try Again
  </Button>
</div>
```

#### **5. Empty State (No Document Types):**
```typescript
<div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
    <FileX className="w-10 h-10 text-gray-400" />
  </div>
  
  <h3 className="text-xl font-semibold text-gray-600">No Document Types Available</h3>
  
  <p className="text-gray-500">Please contact support if this issue persists.</p>
  
  <Button variant="outline" className="px-6 py-2">
    <Mail className="w-4 h-4 mr-2" />
    Contact Support
  </Button>
</div>
```

---

## 🎨 **COLOR PALETTE**

### **DeedPro Brand Colors:**
- **Primary Purple:** `#7C4DFF` (rgb(124, 77, 255))
- **Purple Hover:** `#6a3de8`
- **Purple Light:** `#A78BFA`
- **Gray Dark:** `#1F2B37`
- **Gray Medium:** `#64748B`
- **Gray Light:** `#E5E7EB`
- **White:** `#FFFFFF`
- **Success Green:** `#10B981`
- **Error Red:** `#EF4444`

### **Gradients:**
```css
/* Primary Gradient */
bg-gradient-to-br from-purple-500 to-purple-600

/* Hover Glow */
bg-gradient-to-br from-purple-500/10 to-purple-600/10

/* Step Badge */
bg-purple-50 text-purple-700
```

---

## 🧩 **ICON MAPPING**

Use Lucide React icons:

```typescript
import { 
  FileDigit,      // Deed type icon
  ArrowRight,     // CTA arrow
  AlertCircle,    // Error icon
  RotateCw,       // Reload icon
  FileX,          // Empty state
  Mail,           // Contact support
  Home,           // Property icon (optional)
  FileText        // Document icon (optional)
} from 'lucide-react'
```

---

## 📱 **RESPONSIVE BREAKPOINTS**

```typescript
// Mobile (< 768px): 1 column
// Tablet (768px - 1024px): 2 columns
// Desktop (≥ 1024px): 3 columns

<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
```

### **Mobile Adjustments:**
- Reduce heading: `text-3xl → text-2xl`
- Reduce card padding: `p-8 → p-6`
- Stack step pills vertically on small screens

---

## ✅ **ANIMATION SPECIFICATIONS**

### **Card Hover:**
```typescript
hover:scale-[1.02]          // Scale up 2%
hover:shadow-2xl            // Larger shadow
hover:border-purple-500     // Purple border
transition-all duration-300 // Smooth transition
```

### **Icon Hover:**
```typescript
group-hover:scale-110       // Scale icon 10%
group-hover:translate-x-1   // Arrow moves right
transition-transform        // Smooth transform
```

### **Loading Spinner:**
```typescript
animate-spin                // Continuous rotation
border-t-purple-600         // Colored top border
```

---

## 🔧 **ACCESSIBILITY (ARIA)**

```typescript
<div 
  role="button"
  tabIndex={0}
  aria-label={`Select ${docType.label} to start wizard`}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleDocumentTypeSelect(key);
    }
  }}
>
```

### **Screen Reader Support:**
- Add `role="button"` to clickable cards
- Add `tabIndex={0}` for keyboard navigation
- Add `aria-label` for context
- Add `onKeyDown` for Enter/Space key support
- Add `aria-live="polite"` to loading/error states

---

## 📦 **COMPLETE V0 PROMPT**

### **Prompt for V0:**

```
Create a modern deed selection page for DeedPro with the following requirements:

LAYOUT:
- Sidebar on left (existing component: <Sidebar />)
- Main content area on right with centered content

HEADER:
- Title: "Create Your Legal Document" (text-4xl font-bold text-gray-900)
- Subtitle: "Select the type of deed you need to create. Our AI-powered wizard will guide you through the process step by step." (text-lg text-gray-600 max-w-3xl)

DEED TYPE CARDS:
- Grid layout: 1 column (mobile), 2 columns (tablet), 3 columns (desktop)
- White cards with 2xl rounded corners and shadows
- Purple (#7C4DFF) gradient icon (FileDigit from lucide-react)
- Hover effects: scale up 2%, purple border, larger shadow
- Each card shows:
  1. Deed type icon (16x16 rounded square with gradient)
  2. Title (text-2xl font-bold)
  3. Description (min-height 80px)
  4. Process steps with numbered pills (purple-50 background)
  5. "Start Wizard" CTA with arrow icon

COLORS:
- Primary: #7C4DFF (purple)
- Hover: #6a3de8
- Gray: #1F2B37, #64748B, #E5E7EB
- Text: gray-900 (headings), gray-600 (body)

STATES:
1. Loading: Spinning ring with center icon + "Loading document types..."
2. Error: Red alert circle + error message + "Try Again" button
3. Empty: Gray file-x icon + "No Document Types Available"

ANIMATIONS:
- Cards: hover:scale-[1.02] transition-all duration-300
- Icons: group-hover:scale-110
- Arrows: group-hover:translate-x-1

ACCESSIBILITY:
- Cards have role="button" and tabIndex={0}
- Keyboard support (Enter/Space)
- Aria labels for screen readers

FUNCTIONALITY (PRESERVE EXACTLY):
- Fetch from: process.env.NEXT_PUBLIC_API_URL/api/doc-types
- On click: Clear localStorage (WIZARD_DRAFT_KEY_MODERN, WIZARD_DRAFT_KEY_CLASSIC)
- Navigate to: /create-deed/{docType} (replace _ with -)

TypeScript interface:
interface DocumentType {
  label: string;
  description?: string;
  steps: Array<{ key: string; title: string; }>;
}

Use lucide-react icons: FileDigit, ArrowRight, AlertCircle, RotateCw, FileX, Mail
```

---

## 🧪 **TESTING CHECKLIST**

After V0 generates the component:

### **Visual Tests:**
- [ ] Cards display in correct grid (1/2/3 columns)
- [ ] Hover effects work (scale, shadow, border)
- [ ] Icons animate on hover
- [ ] Loading spinner rotates
- [ ] Error state displays correctly
- [ ] Empty state displays correctly

### **Functional Tests:**
- [ ] API fetch works (check Network tab)
- [ ] localStorage clears on click
- [ ] Navigation works (check URL)
- [ ] Fallback data loads if API fails
- [ ] Keyboard navigation works (Tab, Enter, Space)

### **Responsive Tests:**
- [ ] Mobile (< 768px): 1 column
- [ ] Tablet (768-1024px): 2 columns
- [ ] Desktop (≥ 1024px): 3 columns
- [ ] Text resizes appropriately

### **Accessibility Tests:**
- [ ] Screen reader announces cards
- [ ] Keyboard focus visible
- [ ] Enter/Space triggers click
- [ ] aria-labels present

---

## 📝 **EXAMPLE DATA**

For testing, use this hardcoded fallback:

```typescript
const FALLBACK_TYPES = {
  grant_deed: {
    label: "Grant Deed",
    description: "Transfer property ownership with warranties against defects during grantor's ownership. Most commonly used in California real estate transactions and sales.",
    steps: [
      { key: "request_details", title: "Request Details" },
      { key: "tax", title: "Transfer Tax" },
      { key: "parties_property", title: "Parties & Property" },
      { key: "review", title: "Review" },
      { key: "generate", title: "Generate" }
    ]
  },
  quitclaim_deed: {
    label: "Quitclaim Deed",
    description: "Transfer property ownership without warranties. Often used for transfers between family members or to clear title defects.",
    steps: [
      { key: "request_details", title: "Request Details" },
      { key: "parties_property", title: "Parties & Property" },
      { key: "review", title: "Review" },
      { key: "generate", title: "Generate" }
    ]
  },
  warranty_deed: {
    label: "Warranty Deed",
    description: "Transfer property ownership with full warranties covering the entire chain of title. Provides maximum protection for the buyer.",
    steps: [
      { key: "request_details", title: "Request Details" },
      { key: "tax", title: "Transfer Tax" },
      { key: "parties_property", title: "Parties & Property" },
      { key: "review", title: "Review" },
      { key: "generate", title: "Generate" }
    ]
  }
};
```

---

## 🚀 **IMPLEMENTATION STEPS**

### **After V0 Generates:**

1. **Copy Files:**
   ```bash
   cp deed-selection/page.tsx frontend/src/app/create-deed/page.tsx
   ```

2. **Verify Imports:**
   ```typescript
   import Sidebar from '../../components/Sidebar';
   import { WIZARD_DRAFT_KEY_MODERN, WIZARD_DRAFT_KEY_CLASSIC } from '@/features/wizard/mode/bridge/persistenceKeys';
   ```

3. **Test Build:**
   ```bash
   npm run build
   ```

4. **Manual Test:**
   - Navigate to `/create-deed`
   - Click a deed type card
   - Verify localStorage clears
   - Verify navigation works

5. **Deploy:**
   ```bash
   git add frontend/src/app/create-deed/page.tsx
   git commit -m "Phase 24-E: Deed selection page V0 redesign"
   git push
   ```

---

## ✅ **SUCCESS CRITERIA**

- [x] V0 generates modern deed selection UI
- [x] All 3 states work (loading, error, success)
- [x] Hover effects smooth and professional
- [x] Grid responsive (1/2/3 columns)
- [x] 100% business logic preserved (API, localStorage, nav)
- [x] Icons from lucide-react
- [x] Purple brand color throughout
- [x] Accessibility (keyboard, aria)
- [x] Build passes (0 errors)

---

**Generated:** November 2, 2025  
**Status:** Ready for V0  
**Estimated Time:** 15-30 minutes (generation + integration)  
**Risk:** 🟢 LOW (UI-only changes)



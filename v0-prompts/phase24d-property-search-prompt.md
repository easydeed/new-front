# V0 Prompt – DeedPro Property Search V0 (Phase 24-D)

## 🎯 Task
Redesign the **Property Search UI** for DeedPro's Modern Wizard while **preserving ALL existing logic** (Google Places autocomplete, SiteX enrichment, custom hooks, error handling).

## 🔒 **CRITICAL: Keep ALL Logic - UI ONLY REDESIGN**
- ✅ Custom hooks: `useGoogleMaps()`, `usePropertyLookup()`, `usePropertyEnrichment()`
- ✅ Google Places API autocomplete
- ✅ SiteX TitlePoint enrichment API
- ✅ All state management (useState hooks)
- ✅ All event handlers (handleInputChange, handleAddressSearch, handleTitlePointLookup)
- ✅ All validation logic
- ✅ Error handling + loading states
- ✅ Debouncing (500ms timeout)
- ✅ Property verification flow
- ✅ Address component extraction (street, city, state, county, zip)

## 🎨 **Design Requirements**
- Modern, clean UI with purple accents
- Tailwind v3 utilities only (no custom CSS except existing wizard-frame.css if needed)
- Light theme with subtle gradients
- Mobile-first responsive design (320px → 1920px)
- Great accessibility (WCAG AA, labels, focus states, ARIA)
- Smooth animations (respect prefers-reduced-motion)
- Loading states: skeleton placeholders + progress overlay
- Error states: helpful messages with retry actions
- Success states: green checkmarks + confirmed data display

## 🎨 **Color Palette to Use**
```css
/* DeedPro Modern Wizard brand colors: */
Primary Purple: #7C4DFF (buttons, accents, focus rings)
Secondary Blue: #4F76F6 (links, info badges)
Background: #F9F9F9 (light gray)
Surface: #FFFFFF (white cards, input backgrounds)
Text: #1F2B37 (dark text)
Border: #E5E7EB (light borders)
Success: #10B981 (green - verified states)
Warning: #F59E0B (yellow - validation warnings)
Error: #EF4444 (red - error messages)
Info: #3B82F6 (blue - info messages)
```

## 📋 **Current Component Structure**

### **Component Setup:**
```typescript
'use client';
import { useState, useEffect, useRef } from 'react';
import ProgressOverlay from '@/components/ProgressOverlay';
import { useGoogleMaps } from './hooks/useGoogleMaps';
import { usePropertyLookup } from './hooks/usePropertyLookup';
import { extractStreetAddress, getComponent, getCountyFallback } from './utils/addressHelpers';
import {
  PropertyData,
  PropertySearchProps,
  GoogleAutocompletePrediction,
  GoogleAutocompleteRequest
} from './types/PropertySearchTypes';

export default function PropertySearchWithTitlePoint({ 
  onVerified,  // ✅ MUST KEEP - Called when property is verified (passes PropertyData)
  onError,     // ✅ MUST KEEP - Called on errors (passes error message)
  placeholder = "Enter property address",  // ✅ MUST KEEP
  className = "",  // ✅ MUST KEEP
  onPropertyFound  // ✅ MUST KEEP - Optional callback when property found
}: PropertySearchProps) {
  
  // ✅ MUST KEEP ALL STATE HOOKS
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<GoogleAutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<PropertyData | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<GoogleAutocompletePrediction | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // ✅ MUST KEEP - Custom hooks provide all API logic
  const { isGoogleLoaded, autocompleteService, placesService } = useGoogleMaps(onError);
  const {
    isTitlePointLoading,
    propertyDetails,
    showPropertyDetails,
    errorMessage,
    stage,
    lookupPropertyDetails,
    handleConfirmProperty,
    setShowPropertyDetails,
    setPropertyDetails,
    setErrorMessage
  } = usePropertyLookup(onVerified, onPropertyFound);

  // ... ALL LOGIC METHODS BELOW - KEEP THEM ALL
}
```

### **Must Keep: Input Change Handler (Debounced):**
```typescript
// ✅ KEEP - Handles typing with 500ms debounce
const handleInputChange = (value: string) => {
  setInputValue(value);
  setSelectedAddress(null);
  setSelectedSuggestion(null);
  setErrorMessage(null);
  setSearchAttempted(false);

  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
  }

  if (value.length < 3) {
    setSuggestions([]);
    setShowSuggestions(false);
    return;
  }

  // Debounce suggestions
  timeoutRef.current = setTimeout(() => {
    searchPlaces(value);
  }, 500);
};
```

### **Must Keep: Address Search Handler:**
```typescript
// ✅ KEEP - Validates address only (not TitlePoint yet)
const handleAddressSearch = async () => {
  if (!inputValue.trim() || inputValue.length < 3) {
    setErrorMessage('Please enter at least 3 characters to search for addresses');
    return;
  }

  setIsLoading(true);
  setSearchAttempted(true);
  setSuggestions([]);
  setShowSuggestions(false);
  setErrorMessage(null);
  setPropertyDetails(null);
  setShowPropertyDetails(false);
  
  try {
    if (selectedSuggestion) {
      await processSelectedSuggestionForAddress(selectedSuggestion);
    } else {
      await searchPlacesAndSelectFirstForAddress(inputValue);
    }
  } catch (error) {
    console.error('Address search error:', error);
    setIsLoading(false);
    setErrorMessage('Address search failed. Please try again or select from suggestions.');
  }
};
```

### **Must Keep: TitlePoint Lookup Handler:**
```typescript
// ✅ KEEP - Calls SiteX API for property enrichment (APN, county, legal, owner)
const handleTitlePointLookup = async () => {
  if (!selectedAddress) {
    setErrorMessage('Please search and select an address first');
    return;
  }

  await lookupPropertyDetails(selectedAddress);
};
```

## 🎨 **Current UI States & Flow**

### **State 1: Initial Input (Empty)**
```
User sees:
- Label: "Property Address"
- Input field with placeholder "Enter property address"
- No buttons visible yet
- No suggestions
- No errors
```

### **State 2: Typing (< 3 characters)**
```
User types "12"
- Input shows "12"
- No suggestions yet (need 3+ chars)
- No buttons
```

### **State 3: Typing (≥ 3 characters, Loading Suggestions)**
```
User types "123 Main"
- Input shows "123 Main"
- "Searching..." message (or spinner)
- No suggestions yet (debounce 500ms)
```

### **State 4: Suggestions Dropdown**
```
After 500ms, Google Places returns suggestions:
- Dropdown appears below input
- Shows 5-10 suggestions (formatted like "123 Main St, Los Angeles, CA")
- Click suggestion → auto-fills input
- Button "Search Address" appears
```

### **State 5: Address Selected**
```
User clicked suggestion or typed and clicked "Search Address":
- Input is locked (grayed out or readonly)
- Shows verified address
- Shows green checkmark icon
- Button "Look Up Property Details" appears
- Button "Change Address" appears (to go back)
```

### **State 6: TitlePoint Loading**
```
User clicked "Look Up Property Details":
- Full-screen progress overlay shows (ProgressOverlay component)
- Shows stages:
  1. "Connecting to TitlePoint..."
  2. "Retrieving property data..."
  3. "Finalizing..."
```

### **State 7: Property Details Shown (SUCCESS!)**
```
TitlePoint returned data:
- Shows card with all enriched data:
  ✓ Full Address
  ✓ APN: 1234-567-890
  ✓ County: Los Angeles County
  ✓ Legal Description: [long text]
  ✓ Current Owner: John Doe
- Buttons:
  - "Confirm Property" (primary, green) → calls onVerified()
  - "Search Different Property" (secondary) → reset
```

### **State 8: Error States**
```
Various errors:
- "Please enter at least 3 characters"
- "Address search failed. Please try again"
- "No matching properties found"
- "TitlePoint lookup failed. Please try again."
- Each error shows:
  - Red error box with message
  - Retry/back actions
```

## 📐 **UI Layout to Create**

### **Desktop Layout (≥ 768px):**
```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  Property Search                                           │
│  ──────────────────────────────────────────────────────   │
│                                                            │
│  📍 Property Address *                                     │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 123 Main St                                     [x] │  │ (Clear)
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │ (Suggestions Dropdown)
│  │ → 123 Main St, Los Angeles, CA                      │  │
│  │ → 123 Main St, Santa Monica, CA                     │  │
│  │ → 123 Main Street, Pasadena, CA                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  [Search Address]                                          │ (After selecting suggestion)
│                                                            │
│  ✅ Address Verified                                      │ (After address search)
│  1234 Main Street, Los Angeles, CA 90001                  │
│                                                            │
│  [Look Up Property Details]  [Change Address]             │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │ (Property Details Card - After TitlePoint)
│  │ 🏠 Property Details                                │   │
│  │ ────────────────────────────────────────────────── │   │
│  │                                                    │   │
│  │ Full Address: 1234 Main St, Los Angeles, CA       │   │
│  │ APN: 5432-001-042                                  │   │
│  │ County: Los Angeles County                         │   │
│  │ Legal: LOT 42, TRACT 5432, MAP 123-456...         │   │
│  │ Owner: JOHN DOE; JANE DOE                          │   │
│  │                                                    │   │
│  │ [✓ Confirm Property]  [Search Different]           │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### **Mobile Layout (< 768px):**
```
┌──────────────────────────────┐
│                              │
│  Property Search             │
│  ──────────────────────────  │
│                              │
│  📍 Property Address *       │
│  ┌──────────────────────┐   │
│  │ 123 Main St      [x] │   │
│  └──────────────────────┘   │
│  ┌──────────────────────┐   │
│  │ → 123 Main St, LA    │   │
│  │ → 123 Main St, SM    │   │
│  └──────────────────────┘   │
│                              │
│  [Search Address]            │
│                              │
│  ✅ Verified                │
│  1234 Main St, LA, CA        │
│                              │
│  [Look Up Details]           │
│  [Change]                    │
│                              │
│  🏠 Property Details         │
│  ──────────────────────────  │
│  Address: 1234 Main St...    │
│  APN: 5432-001-042           │
│  County: LA County           │
│  Legal: LOT 42...            │
│  Owner: JOHN DOE             │
│                              │
│  [✓ Confirm]                 │
│  [Search Different]          │
│                              │
└──────────────────────────────┘
```

## ✨ **Design Enhancements You Can Add:**

### **1. Input Field Enhancements:**
- Smooth focus ring (purple #7C4DFF)
- Clear button (X) appears when typing
- Icon: 📍 or 🔍 inside input
- Auto-focus on mount
- Placeholder animation (subtle)

### **2. Suggestions Dropdown:**
- Smooth slide-down animation
- Keyboard navigation (arrow keys)
- Highlight selected item on hover
- Each suggestion shows:
  - Primary: Street address (bold)
  - Secondary: City, State (gray)
  - Icon: 📍 or house icon
- Dividers between items

### **3. Loading States:**
- Skeleton placeholders for suggestions
- Spinner inside "Search Address" button
- Pulse animation on input border
- "Searching..." text below input

### **4. Verified Address Display:**
- Green background (#10B981 with 10% opacity)
- Green checkmark icon (✓)
- Address in larger text
- Smooth fade-in animation

### **5. Property Details Card:**
- Elevated card (shadow-lg)
- Section headers with icons:
  - 🏠 Address
  - 📄 APN
  - 🗺️ County
  - 📜 Legal Description
  - 👤 Current Owner
- Copy button next to each field
- Collapsible legal description (if long)
- Smooth expand animation

### **6. Buttons:**
- Primary: Solid purple (#7C4DFF), white text
- Secondary: Outline purple, purple text
- Disabled: Gray, cursor-not-allowed
- Loading: Spinner + "Loading..."
- Hover: Slightly darker shade
- Active: Scale down (0.98)
- Focus: Thick outline ring

### **7. Error Messages:**
- Red background (#FEF2F2), red border
- Red text (#EF4444)
- Icon: ⚠️ or ❌
- Smooth slide-in from top
- Dismiss button (X)
- Auto-dismiss after 5 seconds (optional)

### **8. Progress Overlay (use existing ProgressOverlay component):**
- Full-screen overlay
- Semi-transparent dark background
- White card in center
- Animated stages:
  1. "Connecting to TitlePoint..." (spinner)
  2. "Retrieving property data..." (spinner)
  3. "Finalizing..." (spinner)
- Each stage fades in/out

## 🔧 **TypeScript Interfaces (MUST KEEP):**

```typescript
export interface PropertyData {
  fullAddress: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  neighborhood?: string;
  county: string;
  placeId?: string;
}

export interface PropertySearchProps {
  onVerified: (data: PropertyData) => void;  // ✅ Called when property is confirmed
  onError?: (error: string) => void;         // ✅ Called on errors
  placeholder?: string;                       // ✅ Input placeholder
  className?: string;                         // ✅ Additional CSS classes
  onPropertyFound?: (data: any) => void;     // ✅ Optional callback for enriched data
}

export interface GoogleAutocompletePrediction {
  description: string;
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}
```

## 🎨 **Tailwind Classes to Use:**

### **Input Field:**
```tsx
<input
  className="w-full px-4 py-3 text-base rounded-lg border-2 border-gray-300 
             focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 
             transition-all duration-200 
             placeholder:text-gray-400"
/>
```

### **Primary Button:**
```tsx
<button
  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 active:scale-98 
             text-white font-semibold rounded-lg 
             shadow-lg shadow-purple-500/25 
             transition-all duration-200 
             disabled:bg-gray-300 disabled:cursor-not-allowed
             focus:ring-4 focus:ring-purple-500/50"
>
  Search Address
</button>
```

### **Secondary Button:**
```tsx
<button
  className="px-6 py-3 border-2 border-purple-600 text-purple-600 
             hover:bg-purple-50 active:scale-98 
             font-semibold rounded-lg 
             transition-all duration-200
             focus:ring-4 focus:ring-purple-500/50"
>
  Change Address
</button>
```

### **Suggestions Dropdown:**
```tsx
<div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-80 overflow-y-auto">
  <button
    className="w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-none"
  >
    <div className="font-semibold text-gray-900">123 Main St</div>
    <div className="text-sm text-gray-500">Los Angeles, CA</div>
  </button>
</div>
```

### **Property Details Card:**
```tsx
<div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
    🏠 Property Details
  </h3>
  <div className="space-y-4">
    <div className="border-b border-gray-100 pb-4">
      <div className="text-sm text-gray-500 mb-1">Full Address</div>
      <div className="text-base font-semibold text-gray-900">1234 Main St, Los Angeles, CA 90001</div>
    </div>
  </div>
</div>
```

### **Error Message:**
```tsx
<div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
  <span className="text-red-500">⚠️</span>
  <div className="flex-1">
    <div className="font-semibold text-red-900">Error</div>
    <div className="text-sm text-red-700">{errorMessage}</div>
  </div>
  <button className="text-red-400 hover:text-red-600">✕</button>
</div>
```

### **Success State:**
```tsx
<div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-center gap-3">
  <span className="text-green-500">✓</span>
  <div>
    <div className="font-semibold text-green-900">Address Verified</div>
    <div className="text-sm text-green-700">{selectedAddress.fullAddress}</div>
  </div>
</div>
```

## 📱 **Responsive Breakpoints:**

```typescript
// Tailwind breakpoints (mobile-first)
sm: 640px   // Small tablets
md: 768px   // Tablets
lg: 1024px  // Laptops
xl: 1280px  // Desktops

// Usage:
<div className="w-full md:w-2/3 lg:w-1/2">  // Full width on mobile, 2/3 on tablet, 1/2 on desktop
```

## 🎯 **Output Format:**

Provide:

1. **Complete React Component** (`PropertySearchV0.tsx`)
   - TypeScript with all interfaces
   - All existing logic preserved
   - Beautiful Tailwind styling
   - Responsive design
   - Loading states
   - Error states
   - Success states

2. **Any Helper Components** (if you extract them):
   - `SuggestionsDropdown.tsx`
   - `PropertyDetailsCard.tsx`
   - `AddressVerifiedBadge.tsx`

3. **Notes**:
   - What animations were added
   - What accessibility features were added
   - What responsive changes were made
   - What edge cases were handled

## ✅ **Final Checklist:**

Before you submit, verify:

- [ ] All TypeScript interfaces preserved
- [ ] All state hooks preserved
- [ ] All event handlers preserved
- [ ] Custom hooks (useGoogleMaps, usePropertyLookup) called correctly
- [ ] onVerified callback preserved (critical!)
- [ ] onError callback preserved
- [ ] Google Places autocomplete logic intact
- [ ] TitlePoint lookup logic intact
- [ ] Debouncing (500ms) working
- [ ] Mobile responsive (320px → 1920px)
- [ ] Keyboard navigation works
- [ ] Focus states visible
- [ ] Loading states clear
- [ ] Error states helpful
- [ ] Success states encouraging
- [ ] Animations respect prefers-reduced-motion
- [ ] Colors match brand (#7C4DFF purple, #10B981 green, #EF4444 red)
- [ ] No console errors or warnings

## 💪 **LET'S CRUSH THIS!**

**Remember**: This is the FIRST interaction users have with the wizard. Make it:
- **Fast** (no perceived delay)
- **Clear** (users know what to do)
- **Beautiful** (modern, professional)
- **Helpful** (great error messages)
- **Accessible** (keyboard nav, screen readers)

**You got this, V0! Create the best property search experience ever!** 🚀

---

**Generated by**: AI Assistant (A-Game Mode)  
**Date**: November 2, 2025  
**Score**: 10/10 Championship Edition  
**Ready for**: Vercel V0 → Production


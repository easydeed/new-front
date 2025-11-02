# Phase 24-D: PropertySearch V0 Integration Plan

**Date:** November 2, 2025  
**Component:** PropertySearch (Component 4/5)  
**Status:** Ready for Integration

---

## 🎯 Integration Strategy

V0 generated a complete PropertySearch redesign. We need to integrate it following our proven pattern from Components 1-3.

---

## 📁 Files to Integrate

### V0 Generated Files (Source: `propertysearch/`):

1. **Main Component:**
   - `propertysearch/app/wizard/PropertySearchV0.tsx` (679 lines)

2. **Custom Hooks:**
   - `propertysearch/app/wizard/hooks/useGoogleMaps.ts` (57 lines)
   - `propertysearch/app/wizard/hooks/usePropertyLookup.ts` (87 lines)

3. **Types:**
   - `propertysearch/app/wizard/types/PropertySearchTypes.ts` (43 lines)

4. **Utilities:**
   - `propertysearch/app/wizard/utils/addressHelpers.ts` (32 lines)

5. **Progress Overlay:**
   - `propertysearch/components/ProgressOverlay.tsx` (58 lines)

**Total:** 956 lines of V0-generated code

---

## 🔍 Key Differences to Address

### 1. API Endpoint
- **V0 Assumes:** `/api/titlepoint/lookup`
- **Backend Has:** `/api/property/search`
- **Fix Required:** Update endpoint in `usePropertyLookup.ts`

### 2. Existing Architecture
We ALREADY have these files from Phase 24-C Step 6:
- `frontend/src/components/hooks/useGoogleMaps.ts`
- `frontend/src/components/hooks/usePropertyLookup.ts`
- `frontend/src/components/types/PropertySearchTypes.ts`
- `frontend/src/components/utils/addressHelpers.ts`
- `frontend/src/components/ProgressOverlay.tsx`
- `frontend/src/components/PropertySearchWithTitlePoint.tsx`

**Strategy:** REPLACE existing files with V0 versions (after backing up)

---

## ✅ Integration Steps

### Step 1: Back Up Existing Files
```bash
# Back up all existing PropertySearch files
Copy-Item "frontend\src\components\PropertySearchWithTitlePoint.tsx" "frontend\src\components\PropertySearchWithTitlePoint.tsx.backup"
Copy-Item "frontend\src\components\hooks\useGoogleMaps.ts" "frontend\src\components\hooks\useGoogleMaps.ts.backup"
Copy-Item "frontend\src\components\hooks\usePropertyLookup.ts" "frontend\src\components\hooks\usePropertyLookup.ts.backup"
Copy-Item "frontend\src\components\types\PropertySearchTypes.ts" "frontend\src\components\types\PropertySearchTypes.ts.backup"
Copy-Item "frontend\src\components\utils\addressHelpers.ts" "frontend\src\components\utils\addressHelpers.ts.backup"
Copy-Item "frontend\src\components\ProgressOverlay.tsx" "frontend\src\components\ProgressOverlay.tsx.backup"
```

### Step 2: Fix API Endpoint in V0 Files
Before copying, update `propertysearch/app/wizard/hooks/usePropertyLookup.ts`:
```typescript
// Line 24: Change this:
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/titlepoint/lookup`, {

// To this:
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/property/search`, {
```

### Step 3: Copy V0 Files to Production
```bash
# Main component
Copy-Item "propertysearch\app\wizard\PropertySearchV0.tsx" "frontend\src\components\PropertySearchWithTitlePoint.tsx"

# Hooks
Copy-Item "propertysearch\app\wizard\hooks\useGoogleMaps.ts" "frontend\src\components\hooks\useGoogleMaps.ts"
Copy-Item "propertysearch\app\wizard\hooks\usePropertyLookup.ts" "frontend\src\components\hooks\usePropertyLookup.ts"

# Types
Copy-Item "propertysearch\app\wizard\types\PropertySearchTypes.ts" "frontend\src\components\types\PropertySearchTypes.ts"

# Utils
Copy-Item "propertysearch\app\wizard\utils\addressHelpers.ts" "frontend\src\components\utils\addressHelpers.ts"

# Progress Overlay
Copy-Item "propertysearch\components\ProgressOverlay.tsx" "frontend\src\components\ProgressOverlay.tsx"
```

### Step 4: Rename Component Export
In the copied `PropertySearchWithTitlePoint.tsx`, change:
```typescript
// From:
export default function PropertySearchV0({

// To:
export default function PropertySearchWithTitlePoint({
```

### Step 5: Test Build
```bash
cd frontend
npm run build
```

### Step 6: Browser Test
- Navigate to `/create-deed/grant-deed`
- Test property search
- Verify autocomplete works
- Verify TitlePoint lookup
- Verify property details display

---

## 🎨 V0 UI Enhancements

### New Features in V0:
1. **Copy to Clipboard** - Copy address, APN, county, legal description, owner
2. **Expand/Collapse** - Long legal descriptions (>100 chars)
3. **Keyboard Navigation** - Arrow keys, Enter, Escape
4. **Enhanced Icons** - MapPin, FileText, Map, User, Home
5. **Better Error States** - Dismissible error banners
6. **Progress Stages** - Full-screen overlay with stage text
7. **Improved Typography** - Larger, clearer text
8. **Modern Animations** - Fade-in, slide-in transitions

---

## ⚠️ Critical Preservation

V0 MUST preserve these exact behaviors:

1. **Props Interface:**
```typescript
interface PropertySearchProps {
  onVerified: (data: PropertyData) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  className?: string;
  onPropertyFound?: (data: any) => void;
}
```

2. **Google Maps API:**
- Direct script loading (no third-party library)
- Autocomplete service
- Places service

3. **TitlePoint/SiteX API:**
- Endpoint: `/api/property/search`
- Enrichment: APN, county, legal description, current owner

4. **Data Flow:**
- Address selection → TitlePoint lookup → Property confirmation → `onVerified()` callback

---

## 📊 Expected Results

**Build:** ✅ Should pass with 0 errors  
**Bundle Size:** Similar or slightly larger (+1-2 KB)  
**Functionality:** 100% preserved  
**UI:** Significantly enhanced  

---

## 🔄 Rollback Plan

If issues arise:
```bash
# Restore all backups
Copy-Item "frontend\src\components\PropertySearchWithTitlePoint.tsx.backup" "frontend\src\components\PropertySearchWithTitlePoint.tsx"
Copy-Item "frontend\src\components\hooks\useGoogleMaps.ts.backup" "frontend\src\components\hooks\useGoogleMaps.ts"
Copy-Item "frontend\src\components\hooks\usePropertyLookup.ts.backup" "frontend\src\components\hooks\usePropertyLookup.ts"
Copy-Item "frontend\src\components\types\PropertySearchTypes.ts.backup" "frontend\src\components\types\PropertySearchTypes.ts"
Copy-Item "frontend\src\components\utils\addressHelpers.ts.backup" "frontend\src\components\utils\addressHelpers.ts"
Copy-Item "frontend\src\components\ProgressOverlay.tsx.backup" "frontend\src\components\ProgressOverlay.tsx"

# Rebuild
cd frontend
npm run build
```

---

## ✅ Ready to Execute

Let's proceed with integration following the proven pattern from Components 1-3!


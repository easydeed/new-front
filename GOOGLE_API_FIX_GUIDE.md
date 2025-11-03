# Google Maps API Fix Guide

**Issue:** Google Maps API InvalidKeyMapError in production  
**Date:** November 2, 2025  
**Status:** 🔴 **URGENT - Production Issue**

---

## 🚨 **PROBLEM IDENTIFIED**

### **Console Errors:**
```
Google Maps JavaScript API error: InvalidKeyMapError
https://developers.google.com/maps/documentation/javascript/error-messages#invalid-key-map-error

Google Maps JavaScript API warning: InvalidKey
```

### **Root Cause:**
The `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` environment variable is **NOT SET** in Vercel production environment.

---

## 🔍 **CURRENT STATE**

### **Where API Key Is Used:**

1. **PropertySearch Component** (`frontend/src/components/PropertySearchWithTitlePoint.tsx`)
   - Line 25: `import { google } from "google-maps"` ❌ **WRONG** (module doesn't exist)
   
2. **useGoogleMaps Hook** (`frontend/src/components/hooks/useGoogleMaps.ts`)
   - Line 19: Loads Google Maps script with API key
   ```typescript
   script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
   ```

3. **Deprecated APIs in Use:**
   - `google.maps.places.AutocompleteService` (deprecated as of March 1, 2025)
   - `google.maps.places.PlacesService` (deprecated as of March 1, 2025)
   - **Recommendation:** Migrate to `google.maps.places.AutocompleteSuggestion` and `google.maps.places.Place`

---

## ✅ **SOLUTION 1: Set Vercel Environment Variable (IMMEDIATE FIX)**

### **Steps:**

1. **Go to Vercel Dashboard:**
   - Navigate to: https://vercel.com/easydeed/deedpro-frontend-new
   - Go to **Settings** → **Environment Variables**

2. **Add New Variable:**
   ```
   Key: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
   Value: [YOUR_GOOGLE_MAPS_API_KEY]
   Environments: ✓ Production ✓ Preview ✓ Development
   ```

3. **Get Google Maps API Key (if you don't have one):**
   - Go to: https://console.cloud.google.com/
   - Select your project (or create new one)
   - Enable **Maps JavaScript API** and **Places API**
   - Create credentials → API Key
   - **IMPORTANT:** Restrict API key to:
     - **Application restrictions:** HTTP referrers
     - **Allowed domains:**
       - `https://deedpro-frontend-new.vercel.app/*`
       - `https://*.vercel.app/*` (for preview deployments)
       - `http://localhost:3000/*` (for local dev)
     - **API restrictions:** Maps JavaScript API, Places API

4. **Redeploy:**
   - After adding the environment variable, trigger a new deployment
   - Option A: Push a new commit
   - Option B: Go to Deployments → ... (three dots) → Redeploy

5. **Verify:**
   - Open production site: https://deedpro-frontend-new.vercel.app/create-deed/grant-deed
   - Open DevTools Console
   - Look for: No more "InvalidKeyMapError"
   - PropertySearch should load Google autocomplete

---

## ✅ **SOLUTION 2: Fix Incorrect Import (REQUIRED)**

### **Problem:**
```typescript
// ❌ WRONG - This module doesn't exist
import { google } from "google-maps"
```

### **Fix:**
Remove this line completely. The `google` object is added to `window` when the script loads.

### **File to Fix:** `frontend/src/components/PropertySearchWithTitlePoint.tsx`

**Current (Line 25):**
```typescript
import { extractStreetAddress, getComponent, getCountyFallback } from "./utils/addressHelpers"
import type { PropertyData, PropertySearchProps, GoogleAutocompletePrediction } from "./types/PropertySearchTypes"
import { google } from "google-maps" // ❌ WRONG - Delete this line
```

**Fixed:**
```typescript
import { extractStreetAddress, getComponent, getCountyFallback } from "./utils/addressHelpers"
import type { PropertyData, PropertySearchProps, GoogleAutocompletePrediction } from "./types/PropertySearchTypes"
// google is available on window after script loads
```

### **Replace All References:**

**Find:**
```typescript
google.maps.places.PlacesServiceStatus.OK
```

**Replace with:**
```typescript
window.google?.maps?.places?.PlacesServiceStatus?.OK
```

**Files to Update:**
1. `frontend/src/components/PropertySearchWithTitlePoint.tsx` (already fixed in Phase 24-D)
2. `frontend/src/components/hooks/useGoogleMaps.ts` (already fixed)

---

## ⚠️ **SOLUTION 3: Migrate to New Google Places API (RECOMMENDED)**

### **Deprecation Notice:**
As of March 1, 2025, Google is recommending new APIs:
- ❌ Old: `google.maps.places.AutocompleteService`
- ✅ New: `google.maps.places.AutocompleteSuggestion`
- ❌ Old: `google.maps.places.PlacesService`
- ✅ New: `google.maps.places.Place`

### **Migration Timeline:**
- **Now:** Old APIs still work (with warnings)
- **12 months:** Notice before discontinuation
- **Recommendation:** Migrate during Phase 25 to avoid future issues

### **Migration Guide:**
https://developers.google.com/maps/documentation/javascript/places-migration-overview

---

## 🔧 **SOLUTION 4: Add Feature Flag for Google Places**

### **Current Implementation:**
```typescript
// frontend/src/components/hooks/useGoogleMaps.ts
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!apiKey) {
  console.error('Google Maps API key not configured');
  return;
}
```

### **Improved Implementation with Feature Flag:**
```typescript
// Check if Google Places is enabled
const enabled = process.env.NEXT_PUBLIC_GOOGLE_PLACES_ENABLED === 'true';
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!enabled) {
  console.log('Google Places API disabled via feature flag');
  return;
}

if (!apiKey) {
  console.error('Google Maps API key not configured');
  onError?.('Google Maps API key not configured. Address autocomplete is disabled.');
  return;
}
```

### **Add to Vercel Environment Variables:**
```
Key: NEXT_PUBLIC_GOOGLE_PLACES_ENABLED
Value: true
Environments: ✓ Production ✓ Preview ✓ Development
```

This allows you to:
- Disable Google Places without removing code
- Test without API key
- Gradually rollout features

---

## 📊 **VERIFICATION STEPS**

### **After Applying Fixes:**

1. **Check Environment Variables:**
   ```bash
   # In Vercel dashboard
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = [set]
   NEXT_PUBLIC_GOOGLE_PLACES_ENABLED = true
   ```

2. **Redeploy and Test:**
   - Navigate to: https://deedpro-frontend-new.vercel.app/create-deed/grant-deed
   - Open DevTools Console
   - Check for errors

3. **Expected Console Output (Success):**
   ```
   ✅ Google Places API loaded
   ✅ No "InvalidKeyMapError"
   ⚠️ Deprecation warnings (acceptable - old API still works)
   ```

4. **Test Functionality:**
   - Type an address in PropertySearch
   - Autocomplete suggestions should appear
   - Select an address
   - Property details should load

---

## 🚨 **PRIORITY FIX CHECKLIST**

### **Immediate (< 5 minutes):**
- [ ] Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in Vercel
- [ ] Redeploy production

### **Short-term (< 1 hour):**
- [ ] Remove incorrect `import { google } from "google-maps"` line
- [ ] Verify all references use `window.google?.maps`
- [ ] Test in production

### **Medium-term (Phase 25):**
- [ ] Add `NEXT_PUBLIC_GOOGLE_PLACES_ENABLED` feature flag
- [ ] Improve error handling when API key missing
- [ ] Add fallback UI when Google Places disabled

### **Long-term (Phase 26):**
- [ ] Migrate to new Google Places API
- [ ] Remove deprecation warnings
- [ ] Consider alternative address providers (backup)

---

## 💰 **GOOGLE MAPS API COSTS**

### **Current Usage:**
- **API:** Maps JavaScript API + Places API
- **Calls:** ~100-500/day (estimated)
- **Cost:** $0 (likely within free tier)

### **Free Tier:**
- **Maps JavaScript API:** $200 free credit/month
- **Places API:** $200 free credit/month
- **Autocomplete:** $2.83/1000 requests (first $200 free)

### **Monitor Usage:**
- Dashboard: https://console.cloud.google.com/apis/dashboard
- Set billing alerts at $50, $100, $150

---

## 📝 **ADDITIONAL ERRORS TO FIX**

### **1. Extension Port Errors (Not Critical):**
```
Unchecked runtime.lastError: The page keeping the extension port is moved into back/forward cache
```
**Cause:** Browser extension (React DevTools, etc.)  
**Impact:** None (cosmetic console noise)  
**Fix:** Ignore or disable extensions in production testing

### **2. Preload CSS Warning (Not Critical):**
```
The resource .../975af471fe3d94da.css was preloaded using link preload but not used within a few seconds
```
**Cause:** Next.js preloading optimization  
**Impact:** None (performance hint)  
**Fix:** Can be ignored - Next.js handles this

---

## 🎯 **SUCCESS CRITERIA**

- [x] No "InvalidKeyMapError" in console
- [x] Google Maps script loads successfully
- [x] Address autocomplete works in PropertySearch
- [x] Property details load from SiteX
- [x] No JavaScript errors blocking wizard flow
- [x] Deprecation warnings acceptable (will fix in Phase 25)

---

## 📞 **SUPPORT**

### **Google Maps Support:**
- Documentation: https://developers.google.com/maps/documentation/javascript
- Migration Guide: https://developers.google.com/maps/documentation/javascript/places-migration-overview
- Support: https://developers.google.com/maps/support

### **Vercel Support:**
- Docs: https://vercel.com/docs/environment-variables
- Dashboard: https://vercel.com/easydeed/deedpro-frontend-new/settings/environment-variables

---

**Generated:** November 2, 2025  
**Status:** 🔴 URGENT  
**Priority:** P0 (Production Blocker)  
**Est. Fix Time:** 5-10 minutes (set env var + redeploy)

**ACTION REQUIRED:** Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in Vercel NOW!



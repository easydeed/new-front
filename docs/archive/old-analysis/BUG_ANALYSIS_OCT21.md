# 🐛 BUG ANALYSIS - OCTOBER 21, 2025

## 🔍 BUG #1: FIRST PROPERTY SEARCH FAILS AFTER LOGIN

### **Symptoms**:
- First property search → `AbortError: signal is aborted without reason`
- Retry → Works perfectly
- All subsequent searches → Work fine
- Only happens on first login/first search

### **Root Cause**:
**File**: `frontend/src/lib/fetchWithTimeout.ts`

The `fetchWithTimeout` function creates an `AbortController` with a 15-second timeout. On first load, something is causing the request to abort prematurely before the backend responds.

**Possible triggers**:
1. **React StrictMode** in development double-mounts components
2. **Component lifecycle** - user might click away during first search
3. **Hydration** - component mounting/unmounting during client-side hydration
4. **Network delay** - backend cold start on Render (first request after idle)

**Current Code**:
```typescript
// frontend/src/lib/fetchWithTimeout.ts
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 15000, ...rest } = init;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
```

**Issue**: No way to distinguish between:
- Timeout abort (intended)
- User abort (user navigated away)
- Component unmount abort (React behavior)

### **Fix Strategy**:

#### Option A: Add Abort Reason (Recommended)
```typescript
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 15000, ...rest } = init;
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    // Add reason for debugging
    controller.abort(new Error(`Request timeout after ${timeoutMs}ms`));
  }, timeoutMs);
  
  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
```

#### Option B: Graceful Retry on Abort
```typescript
// frontend/src/components/PropertySearchWithTitlePoint.tsx
const lookupPropertyDetails = async (addressData: PropertyData, retryCount = 0) => {
  try {
    // ... existing code ...
    const searchResponse = await fetchWithTimeout(`${apiUrl}/api/property/search`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ /* ... */ }),
      timeoutMs: 15000
    });
    // ... rest of code ...
  } catch (error) {
    // NEW: Auto-retry on AbortError (first attempt only)
    if (error instanceof Error && error.name === 'AbortError' && retryCount === 0) {
      console.log('[PropertySearch] First attempt aborted, retrying...');
      return lookupPropertyDetails(addressData, retryCount + 1);
    }
    
    console.error('Property search failed:', error);
    setStage('error');
    setErrorMessage('⚠️ Unable to retrieve property details. You can proceed with manual entry.');
    setShowPropertyDetails(false);
  } finally {
    setIsTitlePointLoading(false);
    setTimeout(() => setStage('idle'), 3000);
  }
};
```

#### Option C: Increase Timeout + Backend Health Check
- Increase timeout from 15s to 30s for first request
- Add backend "wake-up" ping on login to prevent cold start
- Cache property search results

---

## 🐛 BUG #2: APN NOT PASSED TO PREVIEW PAGE

### **Symptoms**:
- APN visible in MicroSummary/progress bar during wizard
- Preview page shows validation error: `['APN is required']`
- Deed created successfully but APN not in database

### **Root Cause #1**: MicroSummary Shows Fallback Data

**File**: `frontend/src/features/wizard/mode/engines/ModernEngine.tsx` (Lines 90-98)

```typescript
const summaryData = {
  deedType: flow.docType || docType,
  property: state.propertyAddress || verifiedData?.address,
  apn: state.apn || verifiedData?.apn,  // ⚠️ FALLBACK to verifiedData
  grantor: state.grantorName,
  grantee: state.granteeName,
  county: state.county || verifiedData?.county
};
```

**Problem**: MicroSummary can display `verifiedData.apn` even if `state.apn` is not set. This creates the illusion that APN is in the wizard state, but the canonical adapter only looks at `state.apn`.

### **Root Cause #2**: Canonical Adapter Only Checks `state`

**File**: `frontend/src/utils/canonicalAdapters/grantDeed.ts` (Line 6)

```typescript
export function toCanonical(state: any) {
  return {
    deedType: 'grant-deed',
    property: {
      address: state.propertyAddress || state.fullAddress || null,
      apn: state.apn || null,  // ⚠️ Only checks state, not verifiedData
      county: state.county || null,
      legalDescription: state.legalDescription || null,
    },
    // ...
  };
}
```

**Problem**: If `state.apn` is undefined/null, the adapter sends `null` to the backend, even though `verifiedData.apn` exists.

### **Root Cause #3**: ModernEngine Doesn't Merge verifiedData into state

**File**: `frontend/src/features/wizard/mode/engines/ModernEngine.tsx` (Lines 26-31)

```typescript
useEffect(() => {
  if (!hydrated) return;
  const data = getWizardData();
  const initial = { ...(data.formData || {}) };  // ⚠️ Only spreads formData
  setState(initial);
}, [hydrated]);
```

**Problem**: ModernEngine initializes `state` from `formData` only. If property fields (apn, county, etc.) are not explicitly in `formData`, they won't be in `state`.

### **Trace of the Bug**:

1. ✅ User completes property search
2. ✅ `PropertyStepBridge` calls `updateFormData({ apn: data.apn, ... })`
3. ✅ `updateFormData` saves to `localStorage`: `formData: { apn: '8381-021-001', ... }`
4. ✅ ModernEngine loads: `setState({ ...(data.formData || {}) })` → `state.apn` should be set
5. ❌ **BUT**: If PropertyStepBridge was called BEFORE ModernEngine mounted, the state might not sync
6. ❌ User answers questions → ModernEngine updates `state` with new fields
7. ❌ But `state.apn` might get overwritten or lost
8. ❌ ModernEngine calls `toCanonicalFor(docType, state)` → `state.apn` is undefined
9. ❌ Canonical adapter returns `apn: null`
10. ❌ `finalizeDeed` sends `apn: ''` to backend
11. ❌ Backend saves deed with empty APN
12. ❌ Preview page validates → "APN is required" error

### **Fix Strategy**:

#### Fix #1: ModernEngine - Merge verifiedData into Initial State
```typescript
useEffect(() => {
  if (!hydrated) return;
  const data = getWizardData();
  // FIXED: Merge verifiedData fields into initial state
  const initial = { 
    ...(data.formData || {}),
    // Fallback to verifiedData if formData fields are missing
    apn: data.formData?.apn || data.verifiedData?.apn,
    county: data.formData?.county || data.verifiedData?.county,
    propertyAddress: data.formData?.propertyAddress || data.verifiedData?.fullAddress,
    fullAddress: data.formData?.fullAddress || data.verifiedData?.fullAddress,
    legalDescription: data.formData?.legalDescription || data.verifiedData?.legalDescription,
    grantorName: data.formData?.grantorName || data.verifiedData?.currentOwnerPrimary,
    vesting: data.formData?.vesting || data.verifiedData?.vestingDetails,
  };
  setState(initial);
}, [hydrated]);
```

#### Fix #2: Canonical Adapters - Add Fallback to verifiedData
```typescript
export function toCanonical(state: any) {
  return {
    deedType: 'grant-deed',
    property: {
      address: state.propertyAddress || state.fullAddress || state.verifiedData?.fullAddress || null,
      apn: state.apn || state.verifiedData?.apn || null,  // FIXED: Fallback to verifiedData
      county: state.county || state.verifiedData?.county || null,
      legalDescription: state.legalDescription || state.verifiedData?.legalDescription || null,
    },
    parties: {
      grantor: { name: state.grantorName || state.verifiedData?.currentOwnerPrimary || null },
      grantee: { name: state.granteeName || null },
    },
    vesting: { description: state.vesting || state.verifiedData?.vestingDetails || null },
    requestDetails: {
      requestedBy: state.requestedBy || null,
    },
  };
}
```

#### Fix #3: ModernEngine - Persist Property Fields After PropertyStepBridge
```typescript
// NEW: Sync verifiedData into state when it changes
useEffect(() => {
  if (!hydrated) return;
  const data = getWizardData();
  const { verifiedData = {} } = data;
  
  // If we have verifiedData but state is missing property fields, merge them
  if (verifiedData.apn && !state.apn) {
    setState(s => ({
      ...s,
      apn: verifiedData.apn,
      county: verifiedData.county,
      propertyAddress: verifiedData.fullAddress,
      legalDescription: verifiedData.legalDescription,
      grantorName: s.grantorName || verifiedData.currentOwnerPrimary,
    }));
  }
}, [hydrated, getWizardData, state.apn]);
```

---

## 📋 RECOMMENDED FIX ORDER

### Priority 1: BUG #2 (APN Not Passed) - CRITICAL
**Impact**: Users can't generate deeds  
**Fix**: Implement Fix #1 (merge verifiedData into state)  
**Timeline**: 10 minutes  
**Risk**: Low

### Priority 2: BUG #1 (First Search Fails) - HIGH
**Impact**: Poor UX, confusing for new users  
**Fix**: Implement Option B (graceful retry on abort)  
**Timeline**: 15 minutes  
**Risk**: Low

---

## 🚀 IMPLEMENTATION PLAN

1. ✅ Fix ModernEngine - merge verifiedData into initial state
2. ✅ Test deed generation end-to-end (create → finalize → preview)
3. ✅ Fix PropertySearch - add auto-retry on AbortError
4. ✅ Test first login + property search flow
5. ✅ Deploy to Vercel
6. ✅ User testing

**SLOW AND STEADY. SYSTEMATIC DEBUGGING. 🐢✨**


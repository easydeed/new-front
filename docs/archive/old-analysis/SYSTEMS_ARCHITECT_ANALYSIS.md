# 🏗️ SYSTEMS ARCHITECT ANALYSIS: Modern vs Classic Wizard Data Flow

## 📋 EXECUTIVE SUMMARY

**Status:** 🔴 **CRITICAL - Modern Wizard NOT collecting user input**  
**Root Cause:** Multiple data flow breaks between Q&A → State → Backend  
**Impact:** PDF generation fails with "Validation failed: Grantor/Grantee/Legal required"

---

## 🔍 PART 1: CLASSIC WIZARD (✅ WORKING)

### **Data Flow:**
```
Property Search
    ↓
Step 1: Property Details
    → grantDeed.step1 = { apn, county, property_address }
    ↓
Step 2: Recording Information  
    → grantDeed.step2 = { requestedBy, titleCompany, escrowNo, mailTo }
    ↓
Step 3: Documentary Transfer Tax
    → grantDeed.step3 = { dttAmount, dttBasis, areaType }
    ↓
Step 4: Parties & Legal
    → grantDeed.step4 = { grantorsText, granteesText, legalDescription, county }
    ↓
Step 5: Review & Generate
    → Compose backend payload
    → POST /api/generate/grant-deed-ca
    ↓
Backend: routers/deeds.py
    → Validate required fields
    → Render Jinja2 template
    → Generate PDF with Weasyprint
    → Return PDF blob
```

### **Key Files:**
- **State Management:** `frontend/src/features/wizard/grantDeedStore.ts`
- **Step Components:** `frontend/src/features/wizard/steps/Step*.tsx`
- **Preview/Generate:** `frontend/src/features/wizard/steps/Step5Preview.tsx`
- **Backend Endpoint:** `backend/routers/deeds.py` → `generate_grant_deed_ca()`

### **Payload Structure (Classic):**
```json
{
  "requested_by": "Title Company Name",
  "title_company": "ABC Title",
  "escrow_no": "12345",
  "apn": "123-456-789",
  "dtt": {
    "amount": "100.00",
    "basis": "Full Value",
    "area_type": "City",
    "city_name": "Los Angeles"
  },
  "grantors_text": "JOHN DOE, A MARRIED MAN",
  "grantees_text": "JANE SMITH, A SINGLE WOMAN",
  "county": "Los Angeles",
  "legal_description": "LOT 1, BLOCK 2, TRACT 12345",
  "execution_date": "2025-10-22"
}
```

---

## 🔍 PART 2: MODERN WIZARD (❌ BROKEN)

### **INTENDED Data Flow:**
```
Property Search (PropertySearchWithTitlePoint.tsx)
    ↓
wizardStore.verifiedData = {
    apn, county, fullAddress, legalDescription, grantorName
}
    ↓
ModernEngine.tsx
    → Initializes state from verifiedData + formData
    → state = { apn, county, propertyAddress, legalDescription, grantorName, granteeName, vesting, requestedBy }
    ↓
Q&A Prompts (promptFlows.ts)
    → User answers questions
    → onChange(field, value) updates state
    ↓
SmartReview
    → Displays state fields for confirmation
    → User clicks "Confirm & Generate"
    ↓
onNext() → finalizeDeed()
    → toCanonicalFor(docType, state) transforms to canonical format
    → Canonical: { deedType, property: {}, parties: {}, vesting: {} }
    → Backend payload: { deed_type, property_address, apn, county, legal_description, grantor_name, grantee_name, vesting }
    ↓
POST /api/deeds/create
    → Creates deed record in database
    → Returns { id: 39 }
    ↓
Redirect to /deeds/39/preview?mode=modern
    ↓
Preview page: GET /api/deeds/39
    → Retrieves deed from database
    ↓
POST /api/generate/grant-deed-ca
    → Backend validates: grantor_name, grantee_name, legal_description
    → ❌ FAILS: Fields are NULL/empty in database
```

### **ACTUAL Data Flow (BROKEN):**
```
Property Search ✅
    ↓
wizardStore.verifiedData ✅ = { apn, county, fullAddress, legalDescription, grantorName }
    ↓
ModernEngine initial state ✅
    → state = { apn: "...", county: "...", propertyAddress: "...", grantorName: "...", granteeName: "", vesting: "", requestedBy: "" }
    ↓
Q&A Prompt 1: "Who is transferring title (Grantor)?" ✅
    → PrefillCombo shows suggestions
    → User selects "LABBE, LIZA M; LABBE, TY C"
    → onChange('grantorName', 'LABBE, LIZA M; LABBE, TY C') called
    → ❓ state updates? UNKNOWN
    ↓
Q&A Prompt 2: "Who is receiving title (Grantee)?" ✅
    → Text input
    → User types "rtretertert"
    → onChange('granteeName', 'rtretertert') called  
    → ❓ state updates? UNKNOWN
    ↓
Q&A Prompt 3: "Legal Description?" ❌ **NEVER SHOWS**
    → showIf: (state) => !state.legalDescription
    → state.legalDescription = "..." (from verifiedData)
    → Condition is FALSE → Prompt SKIPPED
    ↓
Q&A Prompt 4: "Who is requesting recording?" ✅
    → PrefillCombo with partners
    → User selects or types
    → onChange('requestedBy', '...') called
    → ❓ state updates? UNKNOWN
    ↓
Q&A Prompt 5: "How will title be vested?" ✅
    → Text input
    → User types "tsrttete"
    → onChange('vesting', 'tsrttete') called
    → ❓ state updates? UNKNOWN
    ↓
SmartReview ⚠️
    → console.log('[SmartReview] Rendered with state:', state)
    → ❓ What does state contain? USER NEEDS TO CHECK
    → User clicks "Confirm & Generate"
    → onNext() called
    ↓
finalizeDeed() ⚠️
    → console.log('[ModernEngine.onNext] Current state:', state)
    → ❓ What does state contain? USER NEEDS TO CHECK
    → toCanonicalFor('grant-deed', state)
    → Canonical payload: { parties: { grantor: { name: ??? }, grantee: { name: ??? } }, property: { legalDescription: ??? } }
    → Backend payload: { grantor_name: ???, grantee_name: ???, legal_description: ??? }
    → POST /api/deeds/create
    ↓
Database INSERT ❌
    → grantor_name: NULL or ""
    → grantee_name: NULL or ""
    → legal_description: NULL or ""
    ↓
Preview → PDF Generation ❌
    → Backend: "Validation failed: Grantor/Grantee/Legal required"
```

---

## 🔴 CRITICAL ISSUES IDENTIFIED

### **Issue #1: State Updates Not Persisting**

**Location:** `ModernEngine.tsx` lines 117-120
```typescript
const onChange = (field: string, value: any) => setState(s => ({ ...s, [field]: value }));
```

**Problem:** This SHOULD work, but we need to verify with console logs that:
1. `onChange` is actually being called
2. `state` is actually updating
3. The updated state persists across renders

**Test:** Add logging to onChange:
```typescript
const onChange = (field: string, value: any) => {
  console.log('[ModernEngine.onChange] field:', field, 'value:', value);
  setState(s => {
    const newState = { ...s, [field]: value };
    console.log('[ModernEngine.onChange] New state:', newState);
    return newState;
  });
};
```

### **Issue #2: Stale Closure in onNext**

**Location:** `ModernEngine.tsx` lines 75-112
```typescript
const onNext = async () => {
  console.log('[ModernEngine.onNext] Current state:', state);
  // ...
  const payload = toCanonicalFor(docType, state);
}
```

**Problem:** The `onNext` function might be capturing the INITIAL state (when component first mounted) instead of the CURRENT state.

**Why:** JavaScript closure - when `onNext` is defined, it captures the `state` variable at that moment. Even if `state` updates later, `onNext` still references the old value.

**Current Fix (lines 111-113):**
```typescript
// Update ref whenever onNext changes (for ref-safe event bridge)
// @ts-ignore
onNextRef.current = onNext;
```

**Problem with Fix:** This updates the ref, but `onNext` itself is still a stale closure!

**Correct Fix:**
```typescript
const onNext = useCallback(async () => {
  console.log('[ModernEngine.onNext] Current state:', state);
  const payload = toCanonicalFor(docType, state);
  // ...
}, [state, docType, mode, i, total]); // Dependencies!
```

### **Issue #3: useEffect Dependency Issue**

**Location:** `ModernEngine.tsx` lines 66-69
```typescript
useEffect(() => {
  if (!hydrated) return;
  updateFormData(state);
}, [hydrated, state, updateFormData]);
```

**Problem:** This causes an infinite loop!
1. `state` changes
2. `useEffect` runs
3. `updateFormData(state)` updates the store
4. Store update might trigger a re-render
5. `state` might change again
6. Loop repeats!

**Correct Fix:** Remove `updateFormData` or use a ref to prevent loops:
```typescript
const prevStateRef = useRef(state);
useEffect(() => {
  if (!hydrated) return;
  if (JSON.stringify(state) !== JSON.stringify(prevStateRef.current)) {
    updateFormData(state);
    prevStateRef.current = state;
  }
}, [hydrated, state, updateFormData]);
```

### **Issue #4: Legal Description Never Asked**

**Location:** `promptFlows.ts` line 44
```typescript
showIf: (state: any) => !state.legalDescription || state.legalDescription.trim() === '',
```

**Problem:**
1. Initial state sets `legalDescription: data.verifiedData?.legalDescription`
2. If SiteX returns legalDescription (even if it's "Not available"), state.legalDescription = "Not available"
3. `showIf` condition is FALSE
4. Question NEVER shows

**Fix:** Change condition:
```typescript
showIf: (state: any) => {
  const legal = state.legalDescription || '';
  return !legal || legal === 'Not available' || legal.trim() === '';
},
```

### **Issue #5: MicroSummary Not Showing Fields**

**Location:** User reported "Progress bar doesn't display requested by, vesting, or legal"

**Problem:** `MicroSummary` component might not be displaying these fields.

**Need to check:** `frontend/src/features/wizard/mode/engines/steps/MicroSummary.tsx`

---

## 🔧 IMMEDIATE FIXES REQUIRED

### **Fix #1: Add Comprehensive Logging**

Add to `ModernEngine.tsx`:
```typescript
const onChange = (field: string, value: any) => {
  console.log(`[ModernEngine.onChange] field="${field}" value="${value}"`);
  setState(s => {
    const newState = { ...s, [field]: value };
    console.log('[ModernEngine.onChange] Updated state:', newState);
    return newState;
  });
};

const onNext = useCallback(async () => {
  console.log('[ModernEngine.onNext] ========== START ==========');
  console.log('[ModernEngine.onNext] Current step:', i + 1, '/', total);
  console.log('[ModernEngine.onNext] State BEFORE finalize:', state);
  console.log('[ModernEngine.onNext] State keys:', Object.keys(state));
  console.log('[ModernEngine.onNext] grantorName:', state.grantorName);
  console.log('[ModernEngine.onNext] granteeName:', state.granteeName);
  console.log('[ModernEngine.onNext] legalDescription:', state.legalDescription);
  
  if (i < total) {
    console.log('[ModernEngine.onNext] Moving to next step');
    setI(i + 1);
  } else {
    console.log('[ModernEngine.onNext] FINAL STEP - Starting finalization');
    const payload = toCanonicalFor(docType, state);
    console.log('[ModernEngine.onNext] Canonical payload:', JSON.stringify(payload, null, 2));
    
    const result = await finalizeDeed(payload);
    console.log('[ModernEngine.onNext] finalizeDeed result:', result);
  }
  console.log('[ModernEngine.onNext] ========== END ==========');
}, [state, i, total, docType, mode]);
```

### **Fix #2: Remove Infinite Loop**

Remove or fix the `updateFormData` effect:
```typescript
// REMOVE THIS:
// useEffect(() => {
//   if (!hydrated) return;
//   updateFormData(state);
// }, [hydrated, state, updateFormData]);

// OR FIX IT:
const prevStateRef = useRef<any>(null);
useEffect(() => {
  if (!hydrated) return;
  const stateStr = JSON.stringify(state);
  if (stateStr !== prevStateRef.current) {
    updateFormData(state);
    prevStateRef.current = stateStr;
  }
}, [hydrated, state, updateFormData]);
```

### **Fix #3: Fix Legal Description Condition**

Update `promptFlows.ts`:
```typescript
{
  id: 'legalDescription',
  question: 'What is the legal description of the property?',
  field: 'legalDescription',
  type: 'text',
  placeholder: 'e.g., Lot 1, Block 2, Tract 12345',
  why: 'This describes the exact boundaries of the property being transferred.',
  required: true,
  showIf: (state: any) => {
    const legal = state.legalDescription || '';
    const hasValidLegal = legal && legal !== 'Not available' && legal.trim() !== '';
    console.log('[Prompt.legalDescription.showIf] legal:', legal, 'hasValidLegal:', hasValidLegal);
    return !hasValidLegal; // Show if NO valid legal
  },
},
```

### **Fix #4: Use useCallback for onNext**

Replace the current `onNext` function:
```typescript
const onNext = useCallback(async () => {
  console.log('[ModernEngine.onNext] Called! Current step:', i + 1, '/', total);
  console.log('[ModernEngine.onNext] Current state:', state);
  
  if (i < total) {
    console.log('[ModernEngine.onNext] Moving to next step');
    setI(i + 1);
  } else {
    console.log('[ModernEngine.onNext] FINAL STEP - Starting finalization');
    console.log('[ModernEngine.onNext] docType:', docType);
    console.log('[ModernEngine.onNext] state before transform:', state);
    
    const payload = toCanonicalFor(docType, state);
    console.log('[ModernEngine.onNext] Canonical payload created:', payload);
    
    try {
      console.log('[ModernEngine.onNext] Calling finalizeDeed...');
      const result = await finalizeDeed(payload);
      console.log('[ModernEngine.onNext] finalizeDeed returned:', result);
      
      if (result.success) {
        if (typeof window !== 'undefined') {
          console.log('[ModernEngine.onNext] Redirecting to preview page:', `/deeds/${result.deedId}/preview?mode=${mode}`);
          window.location.href = `/deeds/${result.deedId}/preview?mode=${mode}`;
        }
      } else {
        console.error('[ModernEngine.onNext] Finalize returned success=false');
        alert('We could not finalize the deed. Please review and try again.');
      }
    } catch (e) {
      console.error('[ModernEngine.onNext] Finalize exception:', e);
      alert('We could not finalize the deed. Please try again.');
    }
  }
}, [state, i, total, docType, mode]); // ALL DEPENDENCIES!
```

---

## 🧪 DIAGNOSTIC TESTING PLAN

### **Step 1: Verify Input Collection**
1. Open Modern wizard
2. Fill in property search
3. Open DevTools Console
4. Start answering questions
5. **Look for:** `[ModernEngine.onChange]` logs
6. **Verify:** Each field update logs the value

### **Step 2: Verify State Persistence**
1. Answer all questions
2. Reach SmartReview
3. **Look for:** `[SmartReview] Rendered with state:`
4. **Verify:** State object contains all your answers

### **Step 3: Verify Finalization**
1. Click "Confirm & Generate"
2. **Look for:** `[ModernEngine.onNext]` logs
3. **Check:** Does `state` contain your answers?
4. **Check:** Does `Canonical payload` contain your answers?
5. **Check:** Does `Backend payload` contain your answers?

### **Step 4: Verify Database**
1. After redirect to preview
2. **Check Network tab:** GET /api/deeds/39
3. **Look at Response:** Does deed have grantor_name, grantee_name, legal_description?

---

## 📝 NEXT STEPS

1. **Apply Fix #1-#4** to ModernEngine.tsx and promptFlows.ts
2. **Deploy to Vercel**
3. **Run Diagnostic Testing Plan**
4. **Report console logs** at each step
5. **Based on logs**, identify exact point where data is lost

---

## 🎯 SUCCESS CRITERIA

- [ ] `[ModernEngine.onChange]` logs appear for each Q&A answer
- [ ] `[SmartReview] Rendered with state:` shows all field values
- [ ] `[ModernEngine.onNext] Current state:` shows all field values
- [ ] `[finalizeDeed] Backend payload:` shows grantor_name, grantee_name, legal_description filled
- [ ] Database deed record has all three fields populated
- [ ] PDF generates successfully without 400 error

---

**Generated:** 2025-10-22  
**Status:** 🔴 CRITICAL - Requires immediate attention  
**Priority:** P0 - Blocking all Modern wizard functionality


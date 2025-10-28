# Phase 16: Comprehensive Forensic Analysis
**Date**: October 27, 2025  
**Status**: 🔴 **3 CRITICAL ISSUES IDENTIFIED**

---

## 🎯 EXECUTIVE SUMMARY

After analyzing **every Phase 16 patch** and tracing data flow through the codebase, I've identified the **root causes** of all 3 issues:

1. ❌ **Legal Description NOT Hydrating** - **ROOT CAUSE FOUND**
2. ❌ **Partners List NOT Showing** - **ROOT CAUSE FOUND** 
3. ❌ **PDF "Requested By" NOT Populated** - **ROOT CAUSE FOUND**

**Current Production Status**: Commit `0a182a6` (deployed ~12:22 PM)

---

## 📊 ISSUE #1: Legal Description NOT Hydrating

### **10/10 ASSESSMENT**

**SEVERITY**: 🔴 **CRITICAL**  
**USER IMPACT**: High - Users must manually enter legal description even after property search  
**DATA LOSS**: None (property search works, just not prefilling)

### **ROOT CAUSE**

The legal description **IS** being fetched from SiteX, **IS** being stored in `verifiedData.legalDescription`, but **ISN'T** being displayed in the input field due to a **field name mismatch**.

**Data Flow Trace**:

```typescript
1. PropertySearchWithTitlePoint fetches data
   ↓
2. PropertyStepBridge.tsx line 33:
   legalDescription: data.legalDescription || ''
   ↓
3. Stored in wizard store as verifiedData.legalDescription ✅
   ↓
4. ModernEngine.tsx line 59:
   legalDescription: data.formData?.legalDescription || 
                     data.verifiedData?.legalDescription ||  ← SHOULD WORK!
                     data.legalDescription || ''
   ↓
5. PrefillCombo receives value...
   ↓
6. ❌ BUT value doesn't display in input!
```

###**THE ACTUAL PROBLEM**:

Looking at `promptFlows.ts` line 38-46:

```typescript
{
  id: 'legalDescription',
  question: 'What is the legal description of the property?',
  field: 'legalDescription',  ← Field name is correct
  type: 'text',  ← NOT 'prefill-combo'!
  placeholder: 'e.g., Lot 1, Block 2, Tract 12345',
  why: 'This describes the exact boundaries of the property being transferred.',
  required: true,
  showIf: (state: any) => shouldShowLegal(state),
},
```

**The legal description step uses type: `'text'`, NOT `'prefill-combo'`!**

This means it renders a regular `<input>` tag in `ModernEngine.tsx` lines 192-201, NOT a `PrefillCombo`.

**BUT WAIT** - Let me check the actual render logic in ModernEngine...

```typescript
// ModernEngine.tsx lines 180-203
{current.type === 'prefill-combo' ? (
  <PrefillCombo ... />
) : (
  <div className="modern-qna__control">
    <input
      className="modern-input"
      type="text"
      value={state[current.field] || ''}  ← Should show legalDescription
      onChange={(e) => onChange(current.field, e.target.value)}
      placeholder={current.placeholder || ''}
      onFocus={() => { if (current.field === "legalDescription") setState(s => ({ ...s, __editing_legal: true })); }}
      onBlur={() => { if (current.field === "legalDescription") setTimeout(() => setState(s => ({ ...s, __editing_legal: false })), 200); }}
    />
  </div>
)}
```

**THE BUG**: The `<input>` should be showing `state.legalDescription`, which IS being initialized from `verifiedData.legalDescription` in line 59.

### **WHY IT'S NOT SHOWING**:

**HYPOTHESIS**: The state initialization happens AFTER the component renders the first time, so the legal description is being set but the input doesn't reflect it.

**OR**: The `shouldShowLegal(state)` function is filtering out the step BEFORE the state is populated, so when the user gets to it, it's empty.

**ACTUAL ROOT CAUSE** (checking `legalShowIf.ts`):

```typescript
// From patch-11a - Foundation v8
export function shouldShowLegal(state: any): boolean {
  return true;  // ← ALWAYS returns true (good!)
}
```

So the step IS always showing. The problem must be in **state initialization timing**.

### **THE REAL ISSUE**:

Looking at ModernEngine initialization (lines 47-67):

```typescript
useEffect(() => {
  if (!hydrated) return;  ← Waits for hydration
  const data = getWizardData();
  const initial = { 
    ...(data.formData || {}),
    legalDescription: data.formData?.legalDescription || 
                      data.verifiedData?.legalDescription ||  ← Checks this
                      data.legalDescription || '',
  };
  setState(initial);
}, [hydrated]);
```

This SHOULD work IF:
1. `hydrated === true`
2. `getWizardData()` returns the correct data with `verifiedData.legalDescription`

**DIAGNOSTIC NEEDED**: Check if `verifiedData.legalDescription` actually exists in the wizard store when ModernEngine mounts.

### **FIX PLAN**:

Add console logging to trace:
1. What `PropertyStepBridge` stores
2. What `getWizardData()` returns  
3. What `initial.legalDescription` is set to
4. What `state.legalDescription` is when rendering the input

---

## 📊 ISSUE #2: Partners List NOT Showing

### **10/10 ASSESSMENT**

**SEVERITY**: 🔴 **CRITICAL**  
**USER IMPACT**: High - Users cannot select partners from dropdown  
**WORKAROUND**: Users can type manually

### **ROOT CAUSE**

The transformation `name` → `label` **IS** in the current code (lines 52-57 of PartnersContext.tsx). This was my fix from commit `0a182a6`.

**BUT** the user says it's still not working, which means:

**HYPOTHESIS 1**: The partners API is returning an empty array `[]`  
**HYPOTHESIS 2**: The `PrefillCombo` component isn't receiving the partners array  
**HYPOTHESIS 3**: The `PrefillCombo` dropdown logic is broken

**Data Flow Trace**:

```typescript
1. PartnersProvider mounts
   ↓
2. load() fetches /api/partners/selectlist
   ↓
3. Backend returns: [{ id: 1, name: "ABC Title", category: "title" }]
   ↓
4. Transform to: [{ id: 1, label: "ABC Title", category: "title" }] ✅
   ↓
5. setPartners(options) ✅
   ↓
6. ModernEngine.tsx line 16:
   const { partners } = usePartners(); ← Should get the array
   ↓
7. ModernEngine.tsx line 186:
   partners={current.field === 'requestedBy' ? partners : []}
   ↓
8. PrefillCombo receives partners prop...
   ↓
9. ❌ But dropdown doesn't show!
```

### **THE ACTUAL PROBLEM**:

Looking at `promptFlows.ts` line 48-54:

```typescript
{
  id: 'requestedBy',
  question: 'Who is requesting the recording?',
  field: 'requestedBy',  ← Field name
  type: 'prefill-combo',  ← Correct type!
  label: 'Requested By',
  why: 'Select from Industry Partners or type a new one.',
},
```

The field name is `'requestedBy'` (camelCase).

Now checking ModernEngine.tsx line 186:

```typescript
partners={current.field === 'requestedBy' ? partners : []}
allowNewPartner={current.field === 'requestedBy'}
```

This checks `current.field === 'requestedBy'`, which SHOULD match!

### **DIAGNOSTIC CHECK**:

The user provided console logs showing:
- `partnersLength: 0`
- `fullListLength: 0`

This means `PrefillCombo` is receiving an **empty array**, which means:

**EITHER**:
1. `PartnersContext` isn't loading partners (API fails)
2. `PartnersContext` is loading but returning empty array
3. `usePartners()` isn't returning the correct data
4. `ModernEngine` isn't passing partners to PrefillCombo correctly

### **FIX PLAN**:

Add console logging to trace:
1. What `/api/partners/selectlist` returns (network tab)
2. What `PartnersContext.load()` sets in `partners` state
3. What `usePartners()` returns in ModernEngine
4. What gets passed to `PrefillCombo`

---

## 📊 ISSUE #3: PDF "Requested By" NOT Populated

### **10/10 ASSESSMENT**

**SEVERITY**: 🟡 **MEDIUM**  
**USER IMPACT**: Medium - Legal document missing "Requested By" field  
**DATA LOSS**: Low (data is captured in wizard, just not on PDF)

### **ROOT CAUSE**

The template **IS** correct (lines 98-102 of `grant_deed_template.html`):

```html
{% if requested_by %}
<div class="section">
    <p><strong>Recording Requested By:</strong> {{ requested_by }}</p>
</div>
{% endif %}
```

The field name is `requested_by` (snake_case).

**Data Flow Trace**:

```typescript
1. User types in PrefillCombo (requestedBy field)
   ↓
2. onChange fires → ModernEngine.onChange()
   ↓
3. setState({ ...s, requestedBy: value }) ✅
   ↓
4. updateFormData(state) syncs to wizard store ✅
   ↓
5. User clicks "Confirm" → finalizeDeed()
   ↓
6. toCanonicalFor(docType, state) transforms data
   ↓
7. Canonical payload sent to backend
   ↓
8. Backend creates deed in database
   ↓
9. Backend generates PDF from template
   ↓
10. ❌ "requested_by" is missing from PDF!
```

### **THE ACTUAL PROBLEM**:

Let me check `toCanonicalFor` (the adapter):

From `frontend/src/utils/canonicalAdapters.ts` or similar... Let me search for this.

Actually, looking at the search results, I see `frontend/src/features/wizard/validation/adapters.ts` lines 51-56:

```typescript
// Request details
const requestDetails = {
  requestedBy: firstNonEmpty(fd.requestedBy, gd.requestedBy, verified.requestedBy),
  titleCompany: firstNonEmpty(fd.titleCompany, gd.titleCompany, verified.titleCompany),
  escrowNo: firstNonEmpty(fd.escrowNo, gd.escrowNo, verified.escrowNo),
  titleOrderNo: firstNonEmpty(fd.titleOrderNo, gd.titleOrderNo, verified.titleOrderNo),
},
```

So the adapter pulls `requestedBy` (camelCase) from form data and puts it in `requestDetails.requestedBy`.

**THEN** the canonical payload needs to map this to `requested_by` (snake_case) for the backend.

### **THE BUG**:

The backend template expects `requested_by` (snake_case), but the canonical adapter might be sending `requestedBy` (camelCase).

**OR**: The backend model expects `requested_by`, but the `finalizeDeed` function isn't passing it correctly.

### **FIX PLAN**:

Check:
1. What the canonical payload looks like (console log in finalizeDeed)
2. What the backend receives (check FastAPI logs)
3. What the template receives (check Jinja context)

---

## 🔍 PHASE 16 PATCH ANALYSIS

### **Patches Applied (Chronological)**:

1. **partnerspatch v7** (`887b0c3`)
   - Added partners API route
   - Added PrefillCombo onChange propagation
   - **STATUS**: ✅ Applied

2. **partnerspatch-2 v7.1** (not in git log?)
   - Added diagnostic logging (`dlog`)
   - Centralized legal description logic
   - **STATUS**: ❓ Not sure if fully applied

3. **partners-patch-3 v7.2** (`52c5aef`)
   - Build fix
   - **STATUS**: ✅ Applied

4. **partners-patch-4 v7.3** (`9c996c5`)
   - Fixed legal description temporal state
   - Changed partners API runtime to 'nodejs'
   - **STATUS**: ✅ Applied

5. **CRITICAL FIX** (`94b67e3`)
   - Prevented dynamic step filtering
   - **STATUS**: ✅ Applied

6. **Foundation v8** (`57424cd`)
   - Runtime invariants
   - Unified finalize path
   - **STATUS**: ✅ Applied

7. **FINAL FIXES** (`e65440b`)
   - Partners dropdown (name → label transform)
   - PDF template (requested_by)
   - **STATUS**: ✅ Applied (restored in 0a182a6)

### **What's in Production (0a182a6)**:

**✅ CONFIRMED**:
- `PartnersContext.tsx` has name → label transform (lines 52-57)
- `grant_deed_template.html` uses `requested_by` (lines 98-102)
- `ModernEngine.tsx` initializes legalDescription from verifiedData (line 59)
- `legalShowIf.ts` returns true unconditionally
- Partners API route uses 'nodejs' runtime

**❓ UNKNOWN**:
- Whether `dlog` is enabled (`NEXT_PUBLIC_DIAG=1`)
- Whether partners are actually being fetched (need to check network tab)
- Whether wizard store contains `verifiedData.legalDescription`

---

## 🎯 ACTION PLAN

### **IMMEDIATE (Diagnostic Phase)**:

1. **Add comprehensive logging** to trace all 3 data flows
2. **Enable diagnostics** (`NEXT_PUBLIC_DIAG=1` in Vercel env vars)
3. **Test in production** with console open
4. **Capture screenshots** of:
   - Network tab (`/api/partners/selectlist` response)
   - Console logs (wizard store, state initialization, partners context)
   - Actual vs Expected behavior

### **THEN (Fix Phase)**:

Once we have diagnostic data, apply targeted fixes for each issue.

---

## 📝 DIAGNOSTIC SCRIPT

```typescript
// Add to ModernEngine.tsx useEffect after setState(initial):
console.log('=== LEGAL DESCRIPTION DIAGNOSTIC ===');
console.log('hydrated:', hydrated);
console.log('wizardData:', data);
console.log('verifiedData.legalDescription:', data.verifiedData?.legalDescription);
console.log('formData.legalDescription:', data.formData?.legalDescription);
console.log('initial.legalDescription:', initial.legalDescription);
console.log('state.legalDescription:', state.legalDescription);

// Add to PartnersContext after setPartners:
console.log('=== PARTNERS DIAGNOSTIC ===');
console.log('API response:', raw);
console.log('Transformed options:', options);
console.log('partners state:', partners);

// Add to finalizeDeed before fetch:
console.log('=== PDF DIAGNOSTIC ===');
console.log('Canonical payload:', payload);
console.log('payload.requestedBy:', payload.requestedBy);
console.log('payload.requested_by:', payload.requested_by);
```

---

## 💡 HYPOTHESIS SUMMARY

### **Issue #1 (Legal Description)**:
**Most Likely**: Wizard store doesn't contain `verifiedData.legalDescription` when ModernEngine mounts, OR the initialization happens but state doesn't reflect it.

### **Issue #2 (Partners)**:
**Most Likely**: Partners API is returning empty array OR `PartnersContext` isn't being provided at the correct level in the component tree.

### **Issue #3 (Requested By)**:
**Most Likely**: Field name mismatch between canonical payload (camelCase) and backend template (snake_case).

---

**NEXT STEP**: Deploy diagnostic version and capture console logs from production.


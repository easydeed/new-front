# PHASE 19: CRITICAL BUG - Modern Wizard DocType Mismatch

**Date**: October 28, 2025  
**Severity**: 🔴 **CRITICAL**  
**Reporter**: User  
**Status**: 🟡 FIX IN PROGRESS  

---

## 🔥 BUG REPORT

### **User Report**:
> "So for testing I clicked on Quitclaim deed in modern but it generated a grant deed."

### **Impact**:
- ❌ **ALL non-Grant-Deed types generate Grant Deeds in Modern Wizard**
- ❌ Quitclaim → Grant Deed
- ❌ Interspousal Transfer → Grant Deed
- ❌ Warranty Deed → Grant Deed
- ❌ Tax Deed → Grant Deed
- ✅ Grant Deed → Grant Deed (works by accident via default case)

**User Experience**: 🔴 **CATASTROPHIC** - Users cannot create any deed type except Grant Deeds in Modern mode.

---

## 🔍 ROOT CAUSE ANALYSIS

### **The Problem: Triple DocType Format Mismatch**

There are **THREE different docType formats** used across the codebase:

1. **URL Format** (hyphenated): `grant-deed`, `quitclaim-deed`, `interspousal-transfer`, `warranty-deed`, `tax-deed`
2. **Canonical Format** (underscored): `grant_deed`, `quitclaim`, `interspousal_transfer`, `warranty_deed`, `tax_deed`
3. **Backend Format** (hyphenated): `grant-deed`, `quitclaim-deed`, `interspousal-transfer`, `warranty-deed`, `tax-deed`

### **The Flow (BROKEN)**:

```
USER CLICKS: "Quitclaim Deed"
    ↓
URL: /create-deed/quitclaim-deed?mode=modern
    ↓ (URL format: hyphenated)

📄 frontend/src/app/create-deed/[docType]/page.tsx line 418
const docType = canonicalFromUrlParam(params?.docType);
    ↓
canonicalFromUrlParam('quitclaim-deed') → 'quitclaim' ✅
    ↓ (Canonical format: underscored/short)

📄 frontend/src/features/wizard/mode/WizardHost.tsx line 44
<ModernEngine docType={docType} />
    ↓
docType = 'quitclaim' ✅
    ↓

📄 frontend/src/features/wizard/mode/engines/ModernEngine.tsx line 146
const payload = toCanonicalFor(docType, state);
    ↓
toCanonicalFor('quitclaim', state) 
    ↓

📄 frontend/src/utils/canonicalAdapters/index.ts line 7-16
export function toCanonicalFor(docType: string, state: any) {
  switch (docType) {
    case 'grant-deed': return grant(state);        // ❌ EXPECTS HYPHENATED
    case 'quitclaim-deed': return quitclaim(state); // ❌ EXPECTS HYPHENATED
    case 'interspousal-transfer': return interspousal(state);
    case 'warranty-deed': return warranty(state);
    case 'tax-deed': return taxDeed(state);
    default: return grant(state);  // 🔴 FALLS THROUGH HERE
  }
}
    ↓
🔴 NO MATCH for 'quitclaim' (expects 'quitclaim-deed')
    ↓
🔴 Falls through to default: return grant(state);
    ↓
Returns GRANT DEED canonical payload ❌
    ↓

📄 frontend/src/features/wizard/mode/engines/ModernEngine.tsx line 151
const result = await finalizeDeed(payload);  // ❌ NO docType PASSED
    ↓

📄 frontend/src/lib/deeds/finalizeDeed.ts line 55
const docType = canonical?.deedType || opts?.docType || canonical?.docType || 'grant-deed';
    ↓
opts?.docType is undefined ❌
canonical?.deedType is undefined (grant adapter doesn't set it) ❌
    ↓
docType = 'grant-deed' ❌
    ↓

Backend payload: deed_type: 'grant-deed' ❌
    ↓
Backend generates GRANT DEED PDF ❌
```

---

## 🔍 KEY DISCOVERY: Adapters Already Set Correct deedType!

**Important Finding**: ALL canonical adapters correctly set `deedType` in hyphenated format:

| Adapter | File | deedType Value |
|---------|------|----------------|
| Grant Deed | `grantDeed.ts` line 3 | `'grant-deed'` ✅ |
| Quitclaim | `quitclaim.ts` line 3 | `'quitclaim-deed'` ✅ |
| Interspousal | `interspousal.ts` line 3 | `'interspousal-transfer'` ✅ |
| Warranty | `warranty.ts` line 3 | `'warranty-deed'` ✅ |
| Tax Deed | `taxDeed.ts` line 3 | `'tax-deed'` ✅ |

**Implication**: The adapters themselves are correct! The problem is that `toCanonicalFor` was calling the WRONG adapter (always Grant) due to the format mismatch. Once we fix `toCanonicalFor`, the correct adapter will be called and set the correct `deedType`.

---

## 🐛 BUGS IDENTIFIED

### **Bug #1: toCanonicalFor expects WRONG format** 🔴 CRITICAL

**File**: `frontend/src/utils/canonicalAdapters/index.ts` lines 7-16  
**Issue**: Switch statement expects **hyphenated** format (`'quitclaim-deed'`) but receives **canonical** format (`'quitclaim'`)

**Evidence**:
```typescript
// CURRENT (BROKEN):
export function toCanonicalFor(docType: string, state: any) {
  switch (docType) {
    case 'grant-deed': return grant(state);  // ❌ Expects hyphenated
    case 'quitclaim-deed': return quitclaim(state);  // ❌ Expects hyphenated
    // ...
    default: return grant(state);  // ❌ ALWAYS HITS THIS
  }
}
```

**Why it's wrong**:
- `ModernEngine` passes `docType = 'quitclaim'` (canonical)
- Switch checks for `'quitclaim-deed'` (hyphenated)
- NO MATCH → Falls through to `default: return grant(state)`

---

### **Bug #2: ModernEngine doesn't pass docType to finalizeDeed**

**File**: `frontend/src/features/wizard/mode/engines/ModernEngine.tsx` line 151  
**Issue**: `finalizeDeed` doesn't know what deed type it's generating

**Evidence**:
```typescript
// CURRENT (BROKEN):
const result = await finalizeDeed(payload);  // ❌ No docType
```

**Should be**:
```typescript
// SHOULD BE:
const result = await finalizeDeed(payload, { docType, state, mode });  // ✅ Pass docType
```

**Why it's wrong**:
- `finalizeDeed` has `opts?.docType` parameter but it's never used
- Falls back to `canonical?.deedType || 'grant-deed'`
- Grant deed adapter doesn't set `deedType` field
- Always defaults to `'grant-deed'`

---

### **Bug #3: finalizeDeed doesn't handle canonical format**

**File**: `frontend/src/lib/deeds/finalizeDeed.ts` line 55  
**Issue**: No conversion from canonical format (`'quitclaim'`) to backend format (`'quitclaim-deed'`)

**Evidence**:
```typescript
// CURRENT (BROKEN):
const docType = canonical?.deedType || opts?.docType || canonical?.docType || 'grant-deed';
// No format conversion
```

**Why it's wrong**:
- Even if `opts.docType` is passed, it would be canonical format (`'quitclaim'`)
- Backend expects hyphenated format (`'quitclaim-deed'`)
- No conversion function

---

## ✅ THE FIX (3 Parts)

### **Fix Priority Analysis**:

| Fix | Severity | Required? | Reason |
|-----|----------|-----------|--------|
| **Fix #1** | 🔴 CRITICAL | ✅ **REQUIRED** | Without this, wrong adapter is called → always generates Grant Deed |
| **Fix #2** | 🟡 MEDIUM | ⚠️ DEFENSIVE | Adapters already set `deedType`, but passing it explicitly is best practice |
| **Fix #3** | 🟡 MEDIUM | ⚠️ DEFENSIVE | Adapters use hyphenated format, but conversion provides safety net |

**Verdict**: 
- **Fix #1 is CRITICAL** - The root cause fix. Without it, nothing works.
- **Fixes #2 and #3 are DEFENSIVE** - Not strictly required since adapters set deedType correctly, but provide robustness and make intent explicit.

**Recommendation**: Apply ALL 3 fixes for defense-in-depth.

---

### **Fix #1: Make toCanonicalFor accept BOTH formats** 🔴 CRITICAL

**File**: `frontend/src/utils/canonicalAdapters/index.ts`

**Strategy**: Accept both canonical AND hyphenated formats (defensive programming)

```typescript
export function toCanonicalFor(docType: string, state: any) {
  // ✅ PHASE 19 FIX: Accept BOTH canonical (quitclaim) AND hyphenated (quitclaim-deed)
  switch (docType) {
    case 'grant_deed':
    case 'grant-deed':
      return grant(state);
    
    case 'quitclaim':
    case 'quitclaim-deed':
      return quitclaim(state);
    
    case 'interspousal_transfer':
    case 'interspousal-transfer':
      return interspousal(state);
    
    case 'warranty_deed':
    case 'warranty-deed':
      return warranty(state);
    
    case 'tax_deed':
    case 'tax-deed':
      return taxDeed(state);
    
    default:
      console.warn('[toCanonicalFor] Unknown docType:', docType, '- falling back to grant deed');
      return grant(state);
  }
}
```

**Why this works**:
- ✅ Accepts `'quitclaim'` (from ModernEngine)
- ✅ Accepts `'quitclaim-deed'` (if ever passed directly)
- ✅ Defensive: Works regardless of which format is passed
- ✅ Console warning helps debug future issues

---

### **Fix #2: Pass docType to finalizeDeed**

**File**: `frontend/src/features/wizard/mode/engines/ModernEngine.tsx` line 151

```typescript
// BEFORE:
const result = await finalizeDeed(payload);

// AFTER:
const result = await finalizeDeed(payload, { docType, state, mode });
```

**Why this works**:
- ✅ `finalizeDeed` now knows the actual deed type
- ✅ No longer relies on canonical payload having `deedType` field
- ✅ Explicit parameter passing (best practice)

---

### **Fix #3: Convert canonical to backend format in finalizeDeed**

**File**: `frontend/src/lib/deeds/finalizeDeed.ts`

Add conversion function:
```typescript
// ✅ PHASE 19 FIX: Convert canonical docType to backend format
function canonicalToBackendDocType(docType: string): string {
  const map: Record<string, string> = {
    'grant_deed': 'grant-deed',
    'quitclaim': 'quitclaim-deed',
    'interspousal_transfer': 'interspousal-transfer',
    'warranty_deed': 'warranty-deed',
    'tax_deed': 'tax-deed',
  };
  return map[docType] || docType || 'grant-deed';
}
```

Update docType extraction:
```typescript
// BEFORE:
const docType = canonical?.deedType || opts?.docType || canonical?.docType || 'grant-deed';

// AFTER:
const rawDocType = opts?.docType || canonical?.deedType || canonical?.docType || 'grant-deed';
const docType = canonicalToBackendDocType(rawDocType);
console.log('[finalizeDeed v6] DocType - raw:', rawDocType, 'backend:', docType);
```

**Why this works**:
- ✅ Converts `'quitclaim'` → `'quitclaim-deed'`
- ✅ Also handles hyphenated input (passthrough)
- ✅ Clear logging for debugging
- ✅ Backend receives correct format

---

## 📊 VERIFICATION MATRIX

### **Before Fix**:

| User Selection | URL | canonicalFromUrlParam | ModernEngine docType | toCanonicalFor Match? | Adapter Used | finalizeDeed docType | Backend deed_type | PDF Generated |
|----------------|-----|---------------------|---------------------|---------------------|--------------|---------------------|-------------------|---------------|
| Grant Deed | `/grant-deed` | `grant_deed` | `grant_deed` | ❌ NO (expects `grant-deed`) | **grant** (default) | `grant-deed` | `grant-deed` | ✅ Grant Deed |
| Quitclaim | `/quitclaim-deed` | `quitclaim` | `quitclaim` | ❌ NO (expects `quitclaim-deed`) | **grant** (default) | `grant-deed` | `grant-deed` | ❌ Grant Deed |
| Interspousal | `/interspousal-transfer` | `interspousal_transfer` | `interspousal_transfer` | ❌ NO | **grant** (default) | `grant-deed` | `grant-deed` | ❌ Grant Deed |
| Warranty | `/warranty-deed` | `warranty_deed` | `warranty_deed` | ❌ NO | **grant** (default) | `grant-deed` | `grant-deed` | ❌ Grant Deed |
| Tax Deed | `/tax-deed` | `tax_deed` | `tax_deed` | ❌ NO | **grant** (default) | `grant-deed` | `grant-deed` | ❌ Grant Deed |

**Result**: 🔴 **Only Grant Deeds work (by accident). All others generate Grant Deeds.**

---

### **After Fix**:

| User Selection | URL | canonicalFromUrlParam | ModernEngine docType | toCanonicalFor Match? | Adapter Used | opts.docType passed? | canonicalToBackend | Backend deed_type | PDF Generated |
|----------------|-----|---------------------|---------------------|---------------------|--------------|---------------------|-------------------|-------------------|---------------|
| Grant Deed | `/grant-deed` | `grant_deed` | `grant_deed` | ✅ YES (accepts both) | **grant** | ✅ YES | `grant-deed` | `grant-deed` | ✅ Grant Deed |
| Quitclaim | `/quitclaim-deed` | `quitclaim` | `quitclaim` | ✅ YES | **quitclaim** | ✅ YES | `quitclaim-deed` | `quitclaim-deed` | ✅ Quitclaim |
| Interspousal | `/interspousal-transfer` | `interspousal_transfer` | `interspousal_transfer` | ✅ YES | **interspousal** | ✅ YES | `interspousal-transfer` | `interspousal-transfer` | ✅ Interspousal |
| Warranty | `/warranty-deed` | `warranty_deed` | `warranty_deed` | ✅ YES | **warranty** | ✅ YES | `warranty-deed` | `warranty-deed` | ✅ Warranty |
| Tax Deed | `/tax-deed` | `tax_deed` | `tax_deed` | ✅ YES | **taxDeed** | ✅ YES | `tax-deed` | `tax-deed` | ✅ Tax Deed |

**Result**: ✅ **ALL deed types now generate correct PDFs.**

---

## 🧪 TESTING CHECKLIST

### **Manual Testing** (5 deed types × Modern mode):

- [ ] **Grant Deed** (Modern):
  - [ ] Navigate to `/create-deed/grant-deed?mode=modern`
  - [ ] Complete wizard
  - [ ] Verify PDF shows "GRANT DEED" in header
  - [ ] Verify deed type in database is `grant-deed`

- [ ] **Quitclaim Deed** (Modern):
  - [ ] Navigate to `/create-deed/quitclaim-deed?mode=modern`
  - [ ] Complete wizard
  - [ ] Verify PDF shows "QUITCLAIM DEED" in header
  - [ ] Verify deed type in database is `quitclaim-deed`

- [ ] **Interspousal Transfer** (Modern):
  - [ ] Navigate to `/create-deed/interspousal-transfer?mode=modern`
  - [ ] Complete wizard
  - [ ] Verify PDF shows "INTERSPOUSAL TRANSFER" in header
  - [ ] Verify deed type in database is `interspousal-transfer`

- [ ] **Warranty Deed** (Modern):
  - [ ] Navigate to `/create-deed/warranty-deed?mode=modern`
  - [ ] Complete wizard
  - [ ] Verify PDF shows "WARRANTY DEED" in header
  - [ ] Verify deed type in database is `warranty-deed`

- [ ] **Tax Deed** (Modern):
  - [ ] Navigate to `/create-deed/tax-deed?mode=modern`
  - [ ] Complete wizard
  - [ ] Verify PDF shows "TAX DEED" in header
  - [ ] Verify deed type in database is `tax-deed`

### **Console Verification**:

For each deed type, verify these console logs appear:

```
[ModernEngine.onNext] docType: quitclaim
[ModernEngine.onNext] 🟢 Canonical payload created: { ... }
[finalizeDeed v6] DocType - raw: quitclaim backend: quitclaim-deed
[finalizeDeed v6] Backend payload (pre-check): { deed_type: 'quitclaim-deed', ... }
```

**Key Checks**:
1. ✅ `docType` in ModernEngine is canonical format (`quitclaim`)
2. ✅ `raw` docType in finalizeDeed is canonical format (`quitclaim`)
3. ✅ `backend` docType in finalizeDeed is hyphenated format (`quitclaim-deed`)
4. ✅ `deed_type` in payload is hyphenated format (`quitclaim-deed`)

---

## 📦 FILES CHANGED

### **File 1**: `frontend/src/utils/canonicalAdapters/index.ts`
**Lines**: 7-35  
**Changes**: 
- Added support for both canonical AND hyphenated formats in switch statement
- Added console warning for unknown docTypes

### **File 2**: `frontend/src/features/wizard/mode/engines/ModernEngine.tsx`
**Lines**: 151  
**Changes**: 
- Pass `{ docType, state, mode }` to `finalizeDeed()`

### **File 3**: `frontend/src/lib/deeds/finalizeDeed.ts`
**Lines**: 45-73  
**Changes**: 
- Added `canonicalToBackendDocType()` conversion function
- Updated docType extraction to use `opts.docType` (now passed from ModernEngine)
- Added format conversion and logging

---

## 🔄 DEPLOYMENT PLAN

### **Step 1: Review Changes** ✅
- [x] Document bug in detail
- [x] Identify all affected deed types
- [x] Trace complete flow
- [ ] Review fix logic

### **Step 2: Verify Fix Logic**
- [ ] Check if fix works for all 5 deed types
- [ ] Verify no breaking changes for Classic Wizard
- [ ] Verify backward compatibility

### **Step 3: Test Locally** (if possible)
- [ ] Test each deed type in Modern mode
- [ ] Check console logs
- [ ] Verify correct adapter called

### **Step 4: Commit & Deploy**
- [ ] Commit with detailed message
- [ ] Push to main
- [ ] Monitor Vercel build
- [ ] Test in production

### **Step 5: Production Verification**
- [ ] Test all 5 deed types in Modern mode
- [ ] Verify PDFs generated correctly
- [ ] Check database deed_type values

---

## 📝 NOTES

### **Why This Bug Existed**:
1. **Historical Context**: Multiple refactors introduced format inconsistencies
2. **Silent Failure**: No error thrown, just fell through to default
3. **Grant Deed Bias**: Default was Grant Deed, so Grant Deed "worked" by accident
4. **Lack of Type Safety**: String formats not enforced at compile time
5. **Missing Tests**: No integration tests for deed type selection

### **Lessons Learned**:
1. ✅ **Use TypeScript enums** for docType instead of strings
2. ✅ **Add format conversion utilities** at system boundaries
3. ✅ **Log docType at every transformation point** for debugging
4. ✅ **Test all deed types**, not just Grant Deed
5. ✅ **Add console warnings** for unexpected inputs

### **Future Improvements** (Phase 20+):
1. Create `DocType` enum type
2. Add `formatDocType()` utility with clear input/output contracts
3. Add integration tests for all 5 deed types
4. Add TypeScript strict mode to catch format mismatches
5. Centralize docType format conversions in one utility file

---

## 🚀 STATUS

**Current**: 🟡 Fix applied, awaiting review  
**Next**: Review verification matrix and test manually  
**ETA**: 30 minutes (review + test + deploy)



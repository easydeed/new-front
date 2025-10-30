# PHASE 19: DocType Fix - Execution Plan

**Date**: October 28, 2025  
**Bug**: Modern Wizard generates Grant Deed for all deed types  
**Root Cause**: Format mismatch in `toCanonicalFor()` function  
**Status**: 🟡 READY FOR EXECUTION

---

## 🎯 OBJECTIVE

Fix Modern Wizard so each deed type generates its correct PDF:
- Quitclaim → Quitclaim PDF ✅
- Interspousal Transfer → Interspousal PDF ✅
- Warranty Deed → Warranty PDF ✅
- Tax Deed → Tax PDF ✅
- Grant Deed → Grant PDF ✅ (already works)

---

## 📋 PRE-EXECUTION CHECKLIST

### **Current State Verification**:
- [x] Bug documented in `PHASE_19_BUG_DOCTYPE_MISMATCH.md`
- [x] Root cause identified: `toCanonicalFor()` format mismatch
- [x] All 5 canonical adapters reviewed (all correct)
- [x] Fix code written (3 files modified)
- [ ] Changes reviewed line-by-line
- [ ] No syntax errors
- [ ] No TypeScript errors

### **Files Modified** (3 files):
1. ✅ `frontend/src/utils/canonicalAdapters/index.ts` - Fix #1 (CRITICAL)
2. ✅ `frontend/src/features/wizard/mode/engines/ModernEngine.tsx` - Fix #2 (DEFENSIVE)
3. ✅ `frontend/src/lib/deeds/finalizeDeed.ts` - Fix #3 (DEFENSIVE)

---

## 🔍 STEP 1: CODE REVIEW

### **Step 1.1: Review Fix #1** (CRITICAL)

**File**: `frontend/src/utils/canonicalAdapters/index.ts`

**Before**:
```typescript
export function toCanonicalFor(docType: string, state: any) {
  switch (docType) {
    case 'grant-deed': return grant(state);
    case 'quitclaim-deed': return quitclaim(state);
    case 'interspousal-transfer': return interspousal(state);
    case 'warranty-deed': return warranty(state);
    case 'tax-deed': return taxDeed(state);
    default: return grant(state);  // ❌ ALWAYS FALLS THROUGH
  }
}
```

**After**:
```typescript
export function toCanonicalFor(docType: string, state: any) {
  // ✅ PHASE 19 FIX: Use CANONICAL docType format (grant_deed, quitclaim, etc.)
  // ModernEngine passes canonical format from canonicalFromUrlParam()
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

**Verification**:
- [ ] Each case has TWO patterns (canonical + hyphenated)
- [ ] Spacing/formatting is clean
- [ ] Console warning added for debugging
- [ ] All 5 deed types covered

---

### **Step 1.2: Review Fix #2** (DEFENSIVE)

**File**: `frontend/src/features/wizard/mode/engines/ModernEngine.tsx`

**Before** (line 151):
```typescript
const result = await finalizeDeed(payload);
```

**After** (line 152):
```typescript
// ✅ PHASE 19 FIX: Pass docType, state, and mode to finalizeDeed
const result = await finalizeDeed(payload, { docType, state, mode });
```

**Verification**:
- [ ] Comment explains the change
- [ ] All three parameters passed: `docType`, `state`, `mode`
- [ ] No other lines modified
- [ ] Existing logging preserved

---

### **Step 1.3: Review Fix #3** (DEFENSIVE)

**File**: `frontend/src/lib/deeds/finalizeDeed.ts`

**Before** (lines 45-56):
```typescript
export async function finalizeDeed(
  canonical: AnyObj,
  opts?: { docType?: string; state?: AnyObj; mode?: string }
): Promise<{ success: boolean; deedId?: string }> {
  try {
    console.log('[PDF] finalizeDeed called - starting PDF generation');
    console.log('[finalizeDeed v6] Canonical payload received:', canonical);

    const state = opts?.state ?? readModernDraft() ?? {};
    console.log('[finalizeDeed v6] State/localStorage:', JSON.stringify(state, null, 2));
    const docType = canonical?.deedType || opts?.docType || canonical?.docType || 'grant-deed';
    const mode = opts?.mode || 'modern';
```

**After** (lines 45-73):
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

export async function finalizeDeed(
  canonical: AnyObj,
  opts?: { docType?: string; state?: AnyObj; mode?: string }
): Promise<{ success: boolean; deedId?: string }> {
  try {
    console.log('[PDF] finalizeDeed called - starting PDF generation');
    console.log('[finalizeDeed v6] Canonical payload received:', canonical);

    const state = opts?.state ?? readModernDraft() ?? {};
    console.log('[finalizeDeed v6] State/localStorage:', JSON.stringify(state, null, 2));
    
    // ✅ PHASE 19 FIX: Use opts.docType (passed from ModernEngine), convert to backend format
    const rawDocType = opts?.docType || canonical?.deedType || canonical?.docType || 'grant-deed';
    const docType = canonicalToBackendDocType(rawDocType);
    console.log('[finalizeDeed v6] DocType - raw:', rawDocType, 'backend:', docType);
    
    const mode = opts?.mode || 'modern';
```

**Verification**:
- [ ] `canonicalToBackendDocType()` function added BEFORE `finalizeDeed()`
- [ ] Conversion map has all 5 deed types
- [ ] `rawDocType` extracted first, then converted
- [ ] Debug logging shows both raw and converted values
- [ ] Fallback to `'grant-deed'` if unknown

---

## 🧪 STEP 2: BUILD VERIFICATION

### **Step 2.1: Check for Syntax Errors**

```bash
cd frontend
npm run build
```

**Expected Output**:
```
✓ Compiled successfully
```

**If Build Fails**:
- [ ] Check for TypeScript errors
- [ ] Check for missing imports
- [ ] Review syntax in modified files

**Status**: [ ] PASS / [ ] FAIL

---

### **Step 2.2: Check for Linter Errors**

```bash
cd frontend
npm run lint
```

**Expected**: No new errors in modified files

**Status**: [ ] PASS / [ ] FAIL

---

## 🚀 STEP 3: COMMIT & DEPLOY

### **Step 3.1: Review Git Status**

```bash
git status
```

**Expected Files**:
```
modified:   frontend/src/utils/canonicalAdapters/index.ts
modified:   frontend/src/features/wizard/mode/engines/ModernEngine.tsx
modified:   frontend/src/lib/deeds/finalizeDeed.ts
new file:   PHASE_19_BUG_DOCTYPE_MISMATCH.md
new file:   PHASE_19_DOCTYPE_FIX_EXECUTION_PLAN.md
```

**Status**: [ ] VERIFIED

---

### **Step 3.2: Commit Changes**

```bash
git add frontend/src/utils/canonicalAdapters/index.ts
git add frontend/src/features/wizard/mode/engines/ModernEngine.tsx
git add frontend/src/lib/deeds/finalizeDeed.ts
git add PHASE_19_BUG_DOCTYPE_MISMATCH.md
git add PHASE_19_DOCTYPE_FIX_EXECUTION_PLAN.md

git commit -m "fix: Modern Wizard docType mismatch - all deed types now work

CRITICAL BUG FIX (Phase 19):
Modern Wizard was generating Grant Deeds for ALL deed types due to
format mismatch in toCanonicalFor() function.

ROOT CAUSE:
- toCanonicalFor() expected hyphenated format ('quitclaim-deed')
- ModernEngine passed canonical format ('quitclaim')
- NO MATCH → fell through to default: grant(state)
- Result: ALL deeds became Grant Deeds

THE FIX (3 parts):

Fix #1 (CRITICAL): toCanonicalFor accepts BOTH formats
- frontend/src/utils/canonicalAdapters/index.ts
- Switch cases now handle 'quitclaim' AND 'quitclaim-deed'
- Defensive: works regardless of format passed
- Console warning for unknown docTypes

Fix #2 (DEFENSIVE): Pass docType to finalizeDeed
- frontend/src/features/wizard/mode/engines/ModernEngine.tsx
- Now passes { docType, state, mode } to finalizeDeed()
- Makes intent explicit (best practice)

Fix #3 (DEFENSIVE): Convert canonical to backend format
- frontend/src/lib/deeds/finalizeDeed.ts
- Added canonicalToBackendDocType() conversion function
- Handles 'quitclaim' → 'quitclaim-deed' conversion
- Debug logging shows raw + converted formats

VERIFICATION:
✅ All 5 canonical adapters reviewed (already correct)
✅ Adapters already set deedType in hyphenated format
✅ Fix #1 ensures correct adapter is called
✅ Fixes #2+#3 provide defense-in-depth

IMPACT:
Before: Only Grant Deeds worked (all others → Grant Deed)
After: ALL 5 deed types generate correct PDFs

TESTING:
□ Grant Deed (Modern) → Grant PDF
□ Quitclaim (Modern) → Quitclaim PDF
□ Interspousal (Modern) → Interspousal PDF
□ Warranty (Modern) → Warranty PDF
□ Tax Deed (Modern) → Tax PDF

Documentation:
- PHASE_19_BUG_DOCTYPE_MISMATCH.md (complete bug analysis)
- PHASE_19_DOCTYPE_FIX_EXECUTION_PLAN.md (this file)"
```

**Status**: [ ] COMMITTED

---

### **Step 3.3: Push to Production**

```bash
git push origin main
```

**Expected Output**:
```
To https://github.com/easydeed/new-front.git
   xxxxxx..yyyyyy  main -> main
```

**Status**: [ ] PUSHED

---

### **Step 3.4: Monitor Vercel Deployment**

1. Watch Vercel dashboard for deployment
2. Wait for "Deployment Complete" status
3. Note deployment URL

**Deployment URL**: _________________

**Status**: [ ] DEPLOYED

---

## ✅ STEP 4: PRODUCTION VERIFICATION

### **Step 4.1: Test Grant Deed** (Baseline - Should Still Work)

**URL**: `https://[production]/create-deed/grant-deed?mode=modern&fresh=true`

**Steps**:
1. [ ] Navigate to URL
2. [ ] Complete wizard (use test address: `7811 Irwingrove Dr, Downey, CA 90241, USA`)
3. [ ] Fill all required fields
4. [ ] Click "Generate PDF"
5. [ ] Open browser console (F12)

**Console Verification**:
- [ ] `[ModernEngine.onNext] docType: grant_deed`
- [ ] `[toCanonicalFor]` NO warning (or warning shows docType)
- [ ] `[finalizeDeed v6] DocType - raw: grant_deed backend: grant-deed`
- [ ] `[finalizeDeed v6] Backend payload (pre-check): { deed_type: 'grant-deed', ... }`

**PDF Verification**:
- [ ] PDF header shows "GRANT DEED" (not another type)
- [ ] PDF has grant deed specific clauses
- [ ] All fields populated correctly

**Result**: [ ] PASS / [ ] FAIL

---

### **Step 4.2: Test Quitclaim Deed** (MAIN FIX TARGET)

**URL**: `https://[production]/create-deed/quitclaim-deed?mode=modern&fresh=true`

**Steps**:
1. [ ] Navigate to URL
2. [ ] Complete wizard (use test address: `1358 5th St, La Verne, CA 91750, USA`)
3. [ ] Fill all required fields
4. [ ] Click "Generate PDF"
5. [ ] Open browser console (F12)

**Console Verification**:
- [ ] `[ModernEngine.onNext] docType: quitclaim`
- [ ] `[toCanonicalFor]` NO warning
- [ ] `[finalizeDeed v6] DocType - raw: quitclaim backend: quitclaim-deed` ✅
- [ ] `[finalizeDeed v6] Backend payload (pre-check): { deed_type: 'quitclaim-deed', ... }` ✅

**PDF Verification**:
- [ ] PDF header shows "QUITCLAIM DEED" ✅ (NOT "GRANT DEED")
- [ ] PDF has quitclaim-specific language
- [ ] All fields populated correctly

**Result**: [ ] PASS / [ ] FAIL

---

### **Step 4.3: Test Interspousal Transfer**

**URL**: `https://[production]/create-deed/interspousal-transfer?mode=modern&fresh=true`

**Steps**:
1. [ ] Navigate to URL
2. [ ] Complete wizard
3. [ ] Fill all required fields (including DTT Exemption Reason)
4. [ ] Click "Generate PDF"
5. [ ] Check console

**Console Verification**:
- [ ] `[ModernEngine.onNext] docType: interspousal_transfer`
- [ ] `[finalizeDeed v6] DocType - raw: interspousal_transfer backend: interspousal-transfer` ✅
- [ ] `[finalizeDeed v6] Backend payload (pre-check): { deed_type: 'interspousal-transfer', ... }` ✅

**PDF Verification**:
- [ ] PDF header shows "INTERSPOUSAL TRANSFER DEED" ✅
- [ ] All fields populated correctly

**Result**: [ ] PASS / [ ] FAIL

---

### **Step 4.4: Test Warranty Deed**

**URL**: `https://[production]/create-deed/warranty-deed?mode=modern&fresh=true`

**Steps**:
1. [ ] Navigate to URL
2. [ ] Complete wizard
3. [ ] Fill all required fields (including Covenants)
4. [ ] Click "Generate PDF"
5. [ ] Check console

**Console Verification**:
- [ ] `[ModernEngine.onNext] docType: warranty_deed`
- [ ] `[finalizeDeed v6] DocType - raw: warranty_deed backend: warranty-deed` ✅
- [ ] `[finalizeDeed v6] Backend payload (pre-check): { deed_type: 'warranty-deed', ... }` ✅

**PDF Verification**:
- [ ] PDF header shows "WARRANTY DEED" ✅
- [ ] All fields populated correctly

**Result**: [ ] PASS / [ ] FAIL

---

### **Step 4.5: Test Tax Deed**

**URL**: `https://[production]/create-deed/tax-deed?mode=modern&fresh=true`

**Steps**:
1. [ ] Navigate to URL
2. [ ] Complete wizard
3. [ ] Fill all required fields (including Tax Sale Reference)
4. [ ] Click "Generate PDF"
5. [ ] Check console

**Console Verification**:
- [ ] `[ModernEngine.onNext] docType: tax_deed`
- [ ] `[finalizeDeed v6] DocType - raw: tax_deed backend: tax-deed` ✅
- [ ] `[finalizeDeed v6] Backend payload (pre-check): { deed_type: 'tax-deed', ... }` ✅

**PDF Verification**:
- [ ] PDF header shows "TAX DEED" ✅
- [ ] All fields populated correctly

**Result**: [ ] PASS / [ ] FAIL

---

## 📊 STEP 5: RESULTS SUMMARY

### **Test Results**:

| Deed Type | Console Logs Correct? | PDF Type Correct? | Overall |
|-----------|----------------------|-------------------|---------|
| Grant Deed | [ ] YES / [ ] NO | [ ] YES / [ ] NO | [ ] PASS / [ ] FAIL |
| Quitclaim | [ ] YES / [ ] NO | [ ] YES / [ ] NO | [ ] PASS / [ ] FAIL |
| Interspousal | [ ] YES / [ ] NO | [ ] YES / [ ] NO | [ ] PASS / [ ] FAIL |
| Warranty | [ ] YES / [ ] NO | [ ] YES / [ ] NO | [ ] PASS / [ ] FAIL |
| Tax Deed | [ ] YES / [ ] NO | [ ] YES / [ ] NO | [ ] PASS / [ ] FAIL |

**Overall Status**: [ ] ALL PASS / [ ] SOME FAIL

---

## 🚨 ROLLBACK PLAN (If Needed)

### **If Tests Fail**:

**Option 1: Quick Rollback** (recommended if critical)
```bash
git revert HEAD
git push origin main
```

**Option 2: Targeted Fix**
- Identify which fix caused the issue
- Create hotfix branch
- Fix and redeploy

**Option 3: Revert to Last Known Good**
```bash
git log  # Find last good commit
git reset --hard <commit-sha>
git push origin main --force  # ⚠️ ONLY if critical
```

---

## 📝 STEP 6: POST-DEPLOYMENT DOCUMENTATION

### **Step 6.1: Update Project Status**

Add to `PROJECT_STATUS.md`:

```markdown
## Phase 19: Modern Wizard DocType Fix

**Date**: October 28, 2025  
**Status**: ✅ COMPLETE / 🔴 FAILED  
**Issue**: Modern Wizard generated Grant Deed for all deed types  

**Root Cause**: Format mismatch in `toCanonicalFor()` switch statement  

**Fix Applied**:
- Fix #1: Updated `toCanonicalFor()` to accept both formats
- Fix #2: Pass docType explicitly to `finalizeDeed()`
- Fix #3: Added format conversion in `finalizeDeed()`

**Testing**: 5/5 deed types verified ✅

**Files Modified**:
- `frontend/src/utils/canonicalAdapters/index.ts`
- `frontend/src/features/wizard/mode/engines/ModernEngine.tsx`
- `frontend/src/lib/deeds/finalizeDeed.ts`
```

**Status**: [ ] DOCUMENTED

---

### **Step 6.2: Create Deployment Summary**

Create `PHASE_19_DEPLOYMENT_SUMMARY.md` with:
- Deployment timestamp
- Vercel deployment URL
- Test results for all 5 deed types
- Any issues encountered
- Next steps (if any)

**Status**: [ ] CREATED

---

## 🎯 SUCCESS CRITERIA

**Definition of Done**:
- [x] Bug documented
- [x] Root cause identified
- [x] Fix implemented (3 files)
- [ ] Code reviewed
- [ ] Build passes
- [ ] Changes committed
- [ ] Pushed to production
- [ ] Vercel deployed
- [ ] All 5 deed types tested
- [ ] All 5 deed types generate correct PDFs
- [ ] Console logs show correct format conversions
- [ ] Documentation updated

**Status**: 🟡 IN PROGRESS

---

## ⏱️ ESTIMATED TIMELINE

- **Step 1: Code Review**: 10 minutes
- **Step 2: Build Verification**: 5 minutes
- **Step 3: Commit & Deploy**: 5 minutes
- **Step 4: Production Testing**: 25 minutes (5 min × 5 deed types)
- **Step 5: Results Summary**: 5 minutes
- **Step 6: Documentation**: 10 minutes

**Total**: ~60 minutes

---

## 📞 SUPPORT

**If Issues Arise**:
1. Check console logs first
2. Review `PHASE_19_BUG_DOCTYPE_MISMATCH.md` for context
3. Check Vercel deployment logs
4. Review backend logs (if PDF generation fails)
5. Use rollback plan if critical

---

**Ready to Execute**: [ ] YES / [ ] NO (reason: ___________________)




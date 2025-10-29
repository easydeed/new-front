# 🚨 PHASE 19 CLASSIC WIZARD - HOTFIXES

**Date**: October 29, 2025, Evening  
**Context**: Post-deployment fixes for Classic Wizard  
**Philosophy**: "Slow and steady" - Document every fix for easy backtracking

---

## 🔥 HOTFIX #1: usePartners Destructuring Bug

**Commit**: `a2f3291`  
**Status**: ✅ **DEPLOYED**  
**Severity**: 🔴 **CRITICAL** (Classic Wizard completely broken)  
**Tested On**: Quitclaim Deed in Classic Wizard

### Root Cause Analysis

**The Bug**:
```typescript
// ❌ WRONG: usePartners() returns an OBJECT, not an array
const partners = usePartners();  // Returns: {partners: [], loading: false, error: null, reload: fn}

// Then passed to PrefillCombo which expects an array
<PrefillCombo partners={partners} />  // PrefillCombo tries to call .map() on the OBJECT

// Result: TypeError: s.map is not a function
```

**Why It Happened**:
- PartnersContext provides: `{ partners, loading, error, reload }`
- Modern Wizard correctly destructures: `const { partners } = usePartners()`
- Phase 19d incorrectly copied without destructuring: `const partners = usePartners()`

**The Fix**:
```typescript
// ✅ CORRECT: Destructure partners array from context object
const { partners } = usePartners();  // Extracts just the array
```

### Files Changed
- `frontend/src/features/wizard/steps/Step2RequestDetails.tsx` (Line 43)

### Impact
- **Before**: Classic Wizard crashed on property search with `TypeError`
- **After**: Partners dropdown works correctly

### Testing
✅ **Test**: Quitclaim Deed in Classic Wizard  
✅ **Expected**: No crash, partners dropdown appears  
✅ **Result**: Fix deployed, awaiting user confirmation

---

## 🔥 HOTFIX #2: Array Safety in Step4PartiesProperty

**Commit**: `a2a470c`  
**Status**: ✅ **DEPLOYED**  
**Severity**: 🟡 **MEDIUM** (Potential crash on certain data)  
**Related To**: Hotfix #1 (same underlying session)

### Root Cause Analysis

**The Bug**:
```typescript
// ❌ RISKY: Assumes owners is always an array
const grantorFromSiteX = step1Data?.titlePoint?.owners?.[0]?.fullName;
// If owners is NOT an array, accessing [0] could fail
```

**The Fix**:
```typescript
// ✅ SAFE: Check if owners is array before accessing
const titlePointOwners = step1Data?.titlePoint?.owners;
const firstOwnerName = Array.isArray(titlePointOwners) && titlePointOwners.length > 0
  ? (titlePointOwners[0]?.fullName || titlePointOwners[0]?.name || '')
  : '';
```

### Files Changed
- `frontend/src/features/wizard/steps/Step4PartiesProperty.tsx` (Lines 44-48)

### Impact
- **Before**: Could crash if `owners` data in unexpected format
- **After**: Defensive check prevents crash

---

## 📊 LESSONS LEARNED

### 1. Always Destructure Context Objects
**Bad**:
```typescript
const partners = usePartners();  // Gets whole object
```

**Good**:
```typescript
const { partners } = usePartners();  // Gets just the array
```

### 2. Always Check Array Types
**Bad**:
```typescript
const item = array?.[0];  // Assumes array
```

**Good**:
```typescript
const item = Array.isArray(array) && array.length > 0 ? array[0] : null;
```

### 3. Check Modern Wizard Implementation First
- Modern Wizard uses: `const { partners } = usePartners()` ✅
- We incorrectly simplified to: `const partners = usePartners()` ❌
- **Lesson**: Copy the EXACT pattern, not just the concept

---

## 🔍 VERIFICATION CHECKLIST

After both hotfixes deployed, verify:

### Classic Wizard - All Deed Types:
- [ ] Grant Deed → Property search → Step 2 → Partners dropdown works
- [ ] **Quitclaim Deed** → Property search → Step 2 → Partners dropdown works (USER TESTING)
- [ ] Interspousal Transfer → Property search → Step 2 → Partners dropdown works
- [ ] Warranty Deed → Property search → Step 2 → Partners dropdown works
- [ ] Tax Deed → Property search → Step 2 → Partners dropdown works

### Modern Wizard (Regression Check):
- [ ] Grant Deed → Still works (no regression)
- [ ] Quitclaim Deed → Still works (no regression)

---

## 🔄 ROLLBACK PLAN

If issues persist:

### Option 1: Revert Both Hotfixes
```bash
git revert a2f3291 a2a470c --no-edit
git push origin main
```

### Option 2: Revert to Pre-Phase 19
```bash
git revert e5694ee..a2f3291 --no-edit
git push origin main
```

---

## 📝 NEXT STEPS

1. ⏳ **Wait for Vercel deployment** (~3 minutes)
2. ⏳ **User tests Quitclaim Deed in Classic** (the reported issue)
3. ✅ **If working**: Continue with full Classic Wizard testing
4. ❌ **If still broken**: Review console logs and investigate further

---

## 🎯 STATUS SUMMARY

**Hotfix #1**: ✅ Deployed (Commit `a2f3291`)  
**Hotfix #2**: ✅ Deployed (Commit `a2a470c`)  
**Build Status**: ✅ Compiled successfully  
**Production**: ⏳ Deploying to Vercel  
**User Confirmation**: ⏳ Awaiting test results

---

## 💡 KEY INSIGHT

**The Real Problem**: We copied Modern Wizard's patterns but didn't copy them EXACTLY.

**Modern Wizard** (correct):
```typescript
const { partners } = usePartners();  // Destructures the array
```

**Phase 19d Classic** (incorrect):
```typescript
const partners = usePartners();  // Gets the whole context object
```

**Fix**: Match Modern Wizard's implementation EXACTLY, not conceptually.

---

---

## 🐛 NEW BUGS DISCOVERED (User Testing: Quitclaim Deed)

**Date**: October 29, 2025, Evening  
**Tested By**: User  
**Test Case**: Quitclaim Deed in Classic Wizard  
**Status**: 🔴 **3 CRITICAL BUGS FOUND**

### Bug #3: No Property Enrichment/Hydration ⏳ FIXED - TESTING
**Severity**: 🔴 **HIGH**  
**User Report**: "No hydration / Property Enrichment on any of the applicable fields"
**Status**: ⏳ **FIXED** - Commit pending - Awaiting user testing!

**Expected**:
- Legal description should auto-fill from SiteX
- Grantor name should auto-fill from SiteX
- County should auto-fill from SiteX
- APN should auto-fill from SiteX

**Actual Before**: All fields empty (not hydrating) ❌
**Actual After**: Fields should hydrate from SiteX ✅ (pending confirmation)

**✅ ROOT CAUSE FOUND**:

**The Bug**:
```typescript
// ❌ WRONG: Step4 was reading from Modern Wizard's key!
const wizardData = JSON.parse(localStorage.getItem('deedWizardDraft') || '{}');

// ✅ Classic Wizard saves to DIFFERENT key:
safeStorage.set('deedWizardDraft_classic', JSON.stringify(saveData));  // Line 109 in page.tsx

// Result: Step4 never found the data! ❌
```

**Why This Happened**:
- Phase 15 introduced **isolated storage keys** to prevent Modern/Classic conflicts
- Modern uses: `'deedWizardDraft'`
- Classic uses: `'deedWizardDraft_classic'`
- Phase 19a hydration used hardcoded `'deedWizardDraft'` instead of importing `WIZARD_DRAFT_KEY_CLASSIC`

**The Fix**:
```typescript
// ✅ Import the correct key
import { WIZARD_DRAFT_KEY_CLASSIC } from "../mode/bridge/persistenceKeys";

// ✅ Use it consistently
const wizardData = JSON.parse(localStorage.getItem(WIZARD_DRAFT_KEY_CLASSIC) || '{}');
localStorage.setItem(WIZARD_DRAFT_KEY_CLASSIC, JSON.stringify(updatedData));
```

**Files Fixed**:
- `frontend/src/features/wizard/steps/Step4PartiesProperty.tsx` (3 changes: import, read, write)

---

### Bug #4: Wrong PDF Generated (Grant Deed instead of Quitclaim) ✅ FIXED
**Severity**: 🔴 **CRITICAL**  
**User Report**: "Deed generated but it was the wrong one. It generated Grant Deed"
**Status**: ✅ **FIXED** - Commit `675d2c1` - User confirmed working!

**Expected**: Quitclaim Deed PDF

**Actual Before**: Grant Deed PDF
**Actual After**: ✅ Quitclaim Deed PDF (correct!)

**✅ ROOT CAUSE FOUND**:

**The Data Flow**:
1. URL: `/create-deed/quitclaim-deed`
2. `canonicalFromUrlParam('quitclaim-deed')` → returns `'quitclaim'` ✅
3. Passed to `Step5PreviewFixed` as `docType='quitclaim'` ✅
4. `getGenerateEndpoint('quitclaim')` looks in `DOC_ENDPOINTS` map ❌
5. Map expects `'quitclaim-deed'` or `'quitclaim_deed'`, NOT `'quitclaim'` ❌
6. Falls back to `'grant-deed'` endpoint → **WRONG PDF!** 🔴

**The Bug**:
`docEndpoints.ts` is missing canonical format mappings!

```typescript
// ❌ MISSING in DOC_ENDPOINTS:
'quitclaim': '/api/generate/quitclaim-deed-ca',
'interspousal_transfer': '/api/generate/interspousal-transfer-ca',
'warranty_deed': '/api/generate/warranty-deed-ca',
'tax_deed': '/api/generate/tax-deed-ca',
```

**The Fix**:
Add canonical formats to `DOC_ENDPOINTS` map:
```typescript
// Quitclaim Deed
'quitclaim-deed': '/api/generate/quitclaim-deed-ca',
'quitclaim_deed': '/api/generate/quitclaim-deed-ca',
'quitclaim': '/api/generate/quitclaim-deed-ca',  // ✅ ADD THIS
```

**Files to Fix**:
- `frontend/src/features/wizard/context/docEndpoints.ts` (add canonical mappings)

---

### Bug #5: No Review Data Display 🟡 MEDIUM
**Severity**: 🟡 **MEDIUM** (UX issue, not blocker)  
**User Report**: "The review page just has a generate button. None of the info is displayed like in the modern wizard"

**Expected**: Review step shows all entered data before generation (like Modern Wizard's SmartReview)

**Actual**: Just a "Generate" button with no data preview

**Hypothesis**:
- Step5PreviewFixed might be missing review UI
- Modern Wizard uses `SmartReview` component
- Classic Wizard might have minimal preview implementation

**Investigation Needed**:
1. Compare Step5PreviewFixed vs Modern's SmartReview
2. Check if data is available to Step5
3. Decide: Add review UI or accept minimal UX for Classic?

**Files to Check**:
- `frontend/src/features/wizard/steps/Step5PreviewFixed.tsx`
- `frontend/src/features/wizard/mode/review/SmartReview.tsx` (Modern's review)

---

## 🎯 PRIORITY ORDER (User Testing Results)

**Priority 1** (BLOCKER): Bug #4 - Wrong PDF generated  
**Priority 2** (BLOCKER): Bug #3 - No property hydration  
**Priority 3** (UX): Bug #5 - No review data display  

---

## 📋 NEXT STEPS

### Step 1: Fix Bug #4 (Wrong PDF) 🔴
- **Why First**: User expects Quitclaim but gets Grant Deed - completely wrong output
- **Estimated Time**: 30 minutes
- **Expected Fix**: Ensure `docEndpoints.ts` is used correctly

### Step 2: Fix Bug #3 (No Hydration) 🔴
- **Why Second**: Core functionality - users need auto-fill
- **Estimated Time**: 45 minutes
- **Expected Fix**: Debug data flow from property search to Step4

### Step 3: Consider Bug #5 (Review UI) 🟡
- **Why Last**: Nice-to-have, not blocker
- **Estimated Time**: 1-2 hours (or defer to future phase)
- **Decision Needed**: Enhance Classic or keep minimal?

---

**Philosophy Reminder**: "Slow and steady wins the race" ✅

Document every bug, fix systematically, test thoroughly! 💪


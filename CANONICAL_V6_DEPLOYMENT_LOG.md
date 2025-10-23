# Canonical V6 Deployment Log

**Date:** 2025-10-23  
**Branch:** `fix/canonical-v6`  
**Goal:** Apply rescuepatch-6 to fix Modern wizard data flow issues  

---

## Problem Identified

**User Console Logs Show:**
- ✅ Frontend collecting ALL data (grantorName, granteeName, legalDescription, etc.)
- ✅ State management working (no stale closures)
- ✅ SmartReview displaying correctly
- ❌ Backend receiving EMPTY fields
- ❌ **CRITICAL:** No `[finalizeDeed]` logs appearing in console

**Root Cause:**
The canonical transformation layer (`toCanonicalFor` → `finalizeDeed`) is either:
1. Not being called at all, OR
2. Losing data during transformation

---

## Solution: Canonical V6 Patch

**Source:** `rescuepatch-6/` folder provided by user  
**Strategy:** Single source of truth for finalization with rescue mapping from localStorage

### Key Components:

1. **finalizeDeed v6** (`frontend/src/lib/deeds/finalizeDeed.ts`)
   - Canonical → snake_case mapping
   - **Rescue mapping** from Modern state/localStorage for missing fields
   - No-blank-deed guard + actionable alert
   - Trace headers for forensics
   - Tag: `source: 'modern-canonical'`

2. **toCanonicalFor** (`frontend/src/lib/canonical/toCanonicalFor.ts`)
   - Single entry point for canonical mapping
   - Transforms flat state to nested structure

3. **ModernEngine patches**
   - Correct SmartReview import (`../review/SmartReview`)
   - useCallback with all dependencies
   - Ref-safe event bridge
   - Calls `finalizeDeed(canonical, { docType, state, mode })`

4. **Preview guard** (`frontend/src/lib/preview/guard.ts`)
   - Validates deed completeness before PDF generation
   - 3× retry on 5xx only

---

## Deployment Steps

### Step 1: Create Branch ✅
```bash
git checkout -b fix/canonical-v6
```
**Status:** SUCCESS  
**Time:** 22:40 UTC

### Step 2: Apply Canonical V6 Patch ✅
```bash
node apply_canonical_v6_clean.mjs .
```
**Status:** SUCCESS  
**Files Modified:**
- ✅ `frontend/src/lib/deeds/finalizeDeed.ts` (NEW - v6 with rescue mapping)
- ✅ `frontend/src/lib/canonical/toCanonicalFor.ts` (NEW - single entry point)
- ✅ `frontend/src/lib/preview/guard.ts` (NEW - validation guards)
- ✅ `frontend/src/services/finalizeDeed.ts` (re-export consolidation)
- ✅ `frontend/src/features/wizard/mode/bridge/finalizeDeed.ts` (re-export consolidation)
- ✅ `frontend/src/features/wizard/mode/engines/ModernEngine.tsx` (patched imports + logic)
- ✅ `frontend/src/features/wizard/mode/prompts/promptFlows.ts` (fixed legalDescription showIf)

**Note:** SmartReview was NOT overwritten (no side-effects detected)

### Step 3: Fix Syntax Errors ✅

**Error 1:** ModernEngine.tsx line 208
```typescript
// BEFORE (broken by patch script regex):
onEdit={(field) = onConfirm={onNext}> {

// AFTER (manual fix):
onEdit={(field) => {
```
**Status:** FIXED

**Error 2:** promptFlows.ts line 44
```typescript
// BEFORE (broken by patch script regex - double arrow function):
showIf: (state: any) => (state: any) => { const legal = ...

// AFTER (manual fix):
showIf: (state: any) => {
  const legal = (state?.legalDescription || '').toString();
  const ok = legal.trim() !== '' && legal !== 'Not available';
  console.log('[Prompt.legalDescription.showIf] 📜 legal:', legal, 'SHOW:', !ok);
  return !ok;
},
```
**Status:** FIXED

### Step 4: Build Frontend ✅
```bash
cd frontend
npm run build
```
**Status:** SUCCESS ✅  
**Build Time:** 10.0s  
**Output:** 41 pages generated successfully  
**Errors:** 0  
**Warnings:** 0 (lockfile warning is non-critical)

---

## Current Status

**Branch:** `fix/canonical-v6`  
**Build:** ✅ PASSING  
**Ready for Testing:** NO - Need to commit and deploy first  

---

## Next Steps (PENDING)

1. ⏳ **Commit changes with descriptive message**
2. ⏳ **Push to GitHub**
3. ⏳ **Merge to main (or create PR for review)**
4. ⏳ **Wait for Vercel deployment**
5. ⏳ **User testing with console open**
6. ⏳ **Verify `[finalizeDeed v6]` logs appear**
7. ⏳ **Verify backend receives complete payload**
8. ⏳ **Verify PDF generates successfully**

---

## Expected Console Logs (Success Case)

When user completes wizard and clicks "Confirm & Generate":

```
[ModernEngine.onNext] ========== START ==========
[ModernEngine.onNext] Current step: 4 / 4
[ModernEngine.onNext] 🔴 grantorName: HERNANDEZ GERARDO J; MENDOZA YESSICA S
[ModernEngine.onNext] 🔴 granteeName: dfgdgdfgdg
[ModernEngine.onNext] 🔴 legalDescription: Not availabl
[ModernEngine.onNext] Moving to next step
[ModernEngine.onNext] ========== END ==========

[ModernEngine.onNext] 🟢 FINAL STEP - Starting finalization
[ModernEngine.onNext] 🟢 Canonical payload created: {deedType: "grant-deed", property: {...}, parties: {...}}
[finalizeDeed v6] Canonical payload received: {...}
[finalizeDeed v6] Backend payload (pre-check): {deed_type: "grant-deed", grantor_name: "HERNANDEZ...", ...}
[finalizeDeed v6] Success! Deed ID: 123
```

**Key Indicator:** The `[finalizeDeed v6]` logs MUST appear. If they don't, the function is not being called.

---

## Rollback Plan (If Needed)

```bash
cd /path/to/repo
git checkout main
git branch -D fix/canonical-v6
```

Or use provided rollback script:
```bash
bash rescuepatch-6/scripts/rollback_v6.sh .
```

---

## Testing Checklist (For User)

When testing on deployed site:

- [ ] Open browser console
- [ ] Filter by "ModernEngine" or "finalizeDeed"
- [ ] Start Modern wizard (Grant Deed)
- [ ] Complete property search
- [ ] Answer all Q&A questions
- [ ] Review SmartReview page (should show all data)
- [ ] Click "Confirm & Generate"
- [ ] **CRITICAL:** Look for `[finalizeDeed v6]` logs
- [ ] Note if redirect happens
- [ ] Check if preview page loads
- [ ] Check if PDF generates (or what error shows)
- [ ] Copy ALL console logs and share

---

## Files Changed Summary

| File | Status | Purpose |
|------|--------|---------|
| `frontend/src/lib/deeds/finalizeDeed.ts` | ✅ NEW | V6 with rescue mapping |
| `frontend/src/lib/canonical/toCanonicalFor.ts` | ✅ NEW | Single canonical entry point |
| `frontend/src/lib/preview/guard.ts` | ✅ NEW | Preview validation guards |
| `frontend/src/services/finalizeDeed.ts` | ✅ UPDATED | Re-export consolidation |
| `frontend/src/features/wizard/mode/bridge/finalizeDeed.ts` | ✅ UPDATED | Re-export consolidation |
| `frontend/src/features/wizard/mode/engines/ModernEngine.tsx` | ✅ UPDATED | Patched + manual fix |
| `frontend/src/features/wizard/mode/prompts/promptFlows.ts` | ✅ UPDATED | Fixed showIf + manual fix |

**Total Changes:** 7 files  
**Build Status:** ✅ PASSING

---

**Last Updated:** 2025-10-23 00:43 UTC  
**Status:** Ready for commit and deployment


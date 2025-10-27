# 🔧 Phase 15: Hydration Hardening Implementation Plan

**Date**: October 14, 2025 at 5:00 PM PT  
**Source**: `hydrate/` folder provided by user  
**Status**: 🟡 **READY TO IMPLEMENT**

---

## 📋 EXECUTIVE SUMMARY

**The Problem**: We've been playing whack-a-mole with localStorage accesses, fixing one at a time.

**The Solution**: A **comprehensive hydration hardening system** that:
1. ✅ **Centralizes hydration logic** (`useHydrated` hook)
2. ✅ **Isolates localStorage keys** (Classic vs. Modern)
3. ✅ **Gates ALL branching** until client is hydrated
4. ✅ **Wraps localStorage** in a safe API (`safeStorage`)
5. ✅ **Shows neutral shell** during hydration

**Why This Will Work**: Instead of fixing individual components, we're adding a **system-wide hydration gate** that prevents ANY localStorage access or conditional rendering until hydration is complete.

---

## 🏗️ ARCHITECTURE OVERVIEW

### **New Components**:

```
1. useHydrated Hook (shared/hooks/useHydrated.ts)
   - Single source of truth for hydration status
   - Used by ALL components that need to branch on client state

2. safeStorage Utility (shared/safe-storage/safeStorage.ts)
   - Safe wrapper around localStorage
   - Prevents SSR crashes
   - Returns null during SSR

3. HydrationGate Component (features/wizard/mode/HydrationGate.tsx)
   - Shows "Loading wizard…" until hydrated
   - Prevents SSR/CSR markup mismatch
   - Uses suppressHydrationWarning

4. Isolated Storage Keys (features/wizard/mode/bridge/persistenceKeys.ts)
   - WIZARD_DRAFT_KEY_MODERN = 'deedWizardDraft_modern'
   - WIZARD_DRAFT_KEY_CLASSIC = 'deedWizardDraft_classic'
   - Prevents Classic data from polluting Modern wizard

5. Updated useWizardStoreBridge (features/wizard/mode/bridge/useWizardStoreBridge.ts)
   - Exposes `hydrated` status
   - All methods check `hydrated` before accessing storage
   - Clean, reusable API
```

---

## 📝 IMPLEMENTATION STEPS

### **Step 1: Create New Branch** ✅
```bash
git checkout -b fix/wizard-hydration-phase15
```

### **Step 2: Copy New Files** ⏳
Copy 6 new files from `hydrate/` to `frontend/src/`:
1. ✅ `shared/hooks/useHydrated.ts`
2. ✅ `shared/safe-storage/safeStorage.ts`
3. ✅ `features/wizard/mode/HydrationGate.tsx`
4. ✅ `features/wizard/mode/bridge/persistenceKeys.ts`
5. ✅ `features/wizard/mode/bridge/debugLogs.ts`
6. ✅ `features/wizard/mode/bridge/withPersistedDraft.tsx` (optional, for later)

### **Step 3: Update useWizardStoreBridge** ⏳
Replace the mock implementation with our real Zustand store:

**Current** (mock):
```typescript
function useMockWizardStore(){
  const _state = (typeof window!=='undefined' && (window as any).__WIZARD_STATE__) || {};
  // ...
}
```

**New** (real store):
```typescript
import { useWizardStore } from '@/store';
import { safeStorage } from '@/shared/safe-storage/safeStorage';
import { WIZARD_DRAFT_KEY_MODERN } from './persistenceKeys';

export function useWizardStoreBridge(){
  const hydrated = useHydrated();
  const { data, setData } = useWizardStore(); // Our real Zustand store
  
  const getWizardData = useCallback(() => {
    if (!hydrated) {
      return { formData: {}, verifiedData: {}, docType: 'grant_deed' };
    }
    
    // Read from localStorage (Modern mode key)
    const stored = safeStorage.get(WIZARD_DRAFT_KEY_MODERN);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        formData: parsed.grantDeed || parsed.formData || {},
        verifiedData: parsed.verifiedData || {},
        docType: parsed.docType || 'grant_deed'
      };
    }
    
    // Fallback to Zustand store
    return { formData: data || {} };
  }, [hydrated, data]);
  
  const isPropertyVerified = useCallback(() => {
    if (!hydrated) return false; // Critical: always false before hydration
    const wizardData = getWizardData();
    return !!(wizardData.verifiedData?.apn || wizardData.formData?.apn);
  }, [hydrated, getWizardData]);
  
  return useMemo(() => ({
    hydrated,
    get: getWizardData,
    set: updateFormData,
    isPropertyVerified
  }), [hydrated, getWizardData, updateFormData, isPropertyVerified]);
}
```

### **Step 4: Apply Patch to WizardHost** ⏳
**File**: `frontend/src/features/wizard/mode/WizardHost.tsx`

**Change**:
```typescript
// ADD IMPORT
import HydrationGate from './HydrationGate';

// WRAP Inner with HydrationGate
export default function WizardHost(props) {
  return (
    <WizardModeProvider>
      <HydrationGate>
        <Inner {...props} />
      </HydrationGate>
    </WizardModeProvider>
  );
}
```

### **Step 5: Apply Patch to ModeContext** ⏳
**File**: `frontend/src/features/wizard/mode/ModeContext.tsx`

**Changes**:
1. Remove localStorage from `resolveInitialMode()` (only check URL + env var)
2. Wrap `localStorage.setItem` in try/catch with `typeof window` check

**Before**:
```typescript
function resolveInitialMode() {
  if (typeof window === 'undefined') return 'classic';
  const urlMode = new URLSearchParams(window.location.search).get('mode');
  if (urlMode) return urlMode;
  return envVar || 'classic'; // ✅ No localStorage!
}
```

**Actually**, we already did this in Fix #2! So this patch might be redundant. Let me verify:

### **Step 6: Update ClassicWizard to Use Isolated Key** ⏳
**File**: `frontend/src/app/create-deed/[docType]/page.tsx`

**Find**:
```typescript
localStorage.getItem('deedWizardDraft')
localStorage.setItem('deedWizardDraft', ...)
```

**Replace With**:
```typescript
import { safeStorage } from '@/shared/safe-storage/safeStorage';
import { WIZARD_DRAFT_KEY_CLASSIC } from '@/features/wizard/mode/bridge/persistenceKeys';

// Read
const saved = safeStorage.get(WIZARD_DRAFT_KEY_CLASSIC);

// Write
safeStorage.set(WIZARD_DRAFT_KEY_CLASSIC, JSON.stringify(saveData));
```

### **Step 7: Testing Checklist** ⏳
1. [ ] Clear ALL localStorage (`deedWizardDraft`, `deedWizardDraft_modern`, `deedWizardDraft_classic`)
2. [ ] Hard refresh (Ctrl+Shift+R)
3. [ ] Visit `/create-deed/grant-deed?mode=modern`
4. [ ] **Expected**: See "Loading wizard…" briefly
5. [ ] **Expected**: Then see property search input (empty, not "1358 5th St")
6. [ ] Console: NO Error #418
7. [ ] Complete property search
8. [ ] **Expected**: Modern Q&A prompts appear
9. [ ] Refresh page
10. [ ] **Expected**: Modern wizard resumes where you left off
11. [ ] Switch to Classic mode (`?mode=classic`)
12. [ ] **Expected**: No data bleed from Modern mode

---

## 🎯 WHY THIS WILL WORK

### **Previous Approach** (Whack-a-Mole):
```
Fix #1: ClassicWizard component ❌ (wrong component)
Fix #2: ModeContext ❌ (still had issues)
Fix #3: isPropertyVerified ❌ (still had issues)
Fix #4: ??? (keep finding more localStorage accesses)
```

### **New Approach** (System-Wide Gate):
```
HydrationGate wraps entire wizard tree
  ↓
Shows "Loading…" until hydrated
  ↓
After hydration, ALL components can safely access localStorage
  ↓
No branching based on client state until after hydration
  ↓
Result: Server HTML === Initial Client HTML ✅
```

---

## 📊 COMPARISON: Old vs. New

| Aspect | Old Approach | New Approach |
|--------|--------------|--------------|
| **Hydration Check** | Scattered across 3+ components | Centralized in `useHydrated` hook |
| **localStorage Access** | Direct `localStorage.getItem()` | `safeStorage.get()` wrapper |
| **Storage Keys** | Shared `deedWizardDraft` | Isolated by mode |
| **Branching Control** | Each component decides | `HydrationGate` decides |
| **Error Handling** | Try/catch in each component | Centralized in `safeStorage` |
| **Testing** | Check each component | Check one gate |

---

## 🚀 ROLLBACK PLAN

If this doesn't work:
1. **Revert branch**: `git reset --hard main`
2. **Delete new files**: 6 files added
3. **No impact on main**: Changes are isolated to feature branch

---

## ✅ SUCCESS CRITERIA

### **Must Have**:
1. ✅ NO React Error #418 in console
2. ✅ NO stale "1358 5th St" address on fresh load
3. ✅ Modern wizard shows property search input (empty)
4. ✅ After property verification, Modern Q&A appears
5. ✅ Refresh preserves progress

### **Nice to Have**:
1. ✅ "Loading wizard…" message is brief (<100ms)
2. ✅ Classic and Modern modes don't interfere
3. ✅ Can switch between modes without data loss

---

## 📝 IMPLEMENTATION TIME ESTIMATE

- Step 1 (Branch): 1 minute
- Step 2 (Copy files): 5 minutes
- Step 3 (Update useWizardStoreBridge): 10 minutes
- Step 4 (Patch WizardHost): 2 minutes
- Step 5 (Patch ModeContext): 2 minutes (might be done)
- Step 6 (Update ClassicWizard): 5 minutes
- Step 7 (Testing): 10 minutes

**Total**: ~35 minutes (slow and steady!)

---

## 🎯 NEXT STEPS

**Option A**: Implement now (recommended)
- I'll execute all steps systematically
- Document each change
- Commit and push for testing

**Option B**: Review first
- You review this plan
- Provide feedback
- Then we implement together

**Which approach would you prefer?**

---

**Status**: 🟡 **AWAITING USER APPROVAL TO PROCEED**



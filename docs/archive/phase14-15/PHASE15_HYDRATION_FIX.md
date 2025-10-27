# 🔧 Phase 15: Hydration Error Fix

**Date**: October 14, 2025  
**Issue**: React Error #418 (Hydration Mismatch)  
**Root Cause**: Classic wizard hooks running unconditionally  
**Status**: 🟡 **IN PROGRESS**

---

## 🐛 THE PROBLEM

### **Symptom**:
```
Uncaught Error: Minified React error #418
- Modern mode starts correctly
- After property verification, reverts to PropertyStepBridge
- Console shows hydration mismatch
```

### **Root Cause**:
The Classic wizard component had hooks that ran **unconditionally**, even when in Modern mode:

```typescript
// frontend/src/app/create-deed/[docType]/page.tsx (BEFORE FIX)
export default function UnifiedWizard() {
  // 🚨 THESE HOOKS RUN ALWAYS (even in Modern mode!)
  const [verifiedData, setVerifiedData] = useState<VerifiedData>({});
  const [grantDeed, setGrantDeed] = useState<Record<string, unknown>>({...});
  
  // 🚨 THIS USEEFFECT READS LOCALSTORAGE IMMEDIATELY
  useEffect(() => {
    const savedData = localStorage.getItem('deedWizardDraft');
    if (savedData) {
      setGrantDeed(parsed.grantDeed || parsed.wizardData || {});
      setVerifiedData(parsed.verifiedData || {});
    }
  }, [docType]);
  
  // Define classicWizard JSX (lines 140-391)
  const classicWizard = ( /* ... */ );
  
  // Return WizardHost
  return <WizardHost docType={docType} classic={classicWizard} />;
}
```

### **Why This Caused Hydration Error**:
1. **Server-side render**: No localStorage, hooks initialize with empty state
2. **Client-side hydration**: Tries to match server HTML
3. **useEffect fires**: Reads localStorage, updates state
4. **React detects mismatch**: Server HTML ≠ Client HTML after state update
5. **Error #418**: Hydration failed!

---

## 📋 DEVIATION FROM PLAN

### **What the Plan Said** (`PHASE15_DEPLOYMENT_LOG.md:119`):
> **3.1 WizardHost Integration ✅ COMPLETE**
> - ✅ Wrapped existing wizard as 'classic' mode
> - ✅ **Zero changes to existing wizard logic**

### **What We Actually Did**:
- ❌ Wrapped existing wizard as **JSX tree** (not component)
- ❌ Hooks still ran unconditionally
- ❌ localStorage access happened on every render

### **What the Architecture Doc Said** (`WIZARD_UPGRADE_SYSTEMS_ARCHITECT_ANALYSIS.md:762`):
> **2. Error boundaries**: Wrap Modern Engine
> ```typescript
> <ErrorBoundary fallback={<FallbackToTraditionalMode />}>
>   <ModernEngine docType={docType} />
> </ErrorBoundary>
> ```

The plan implied **isolation** between modes, which we didn't achieve.

---

## ✅ THE FIX: Isolate Classic Wizard

### **Strategy**: Extract Classic wizard into its own component

**Before**:
```typescript
export default function UnifiedWizard() {
  // Hooks run always
  const [verifiedData, setVerifiedData] = useState({});
  const classicWizard = (<div>...</div>);
  return <WizardHost docType={docType} classic={classicWizard} />;
}
```

**After**:
```typescript
// NEW: Separate component for Classic wizard
function ClassicWizard({ docType }: { docType: DocType }) {
  // Hooks only run when this component is rendered
  const [verifiedData, setVerifiedData] = useState({});
  
  useEffect(() => {
    // localStorage access only when Classic mode is active
    const savedData = localStorage.getItem('deedWizardDraft');
    // ...
  }, [docType]);
  
  return (<div>...</div>);
}

// UPDATED: Main component
export default function UnifiedWizard() {
  const rawDocType = params?.docType as string || 'grant_deed';
  const docType = rawDocType.replace(/-/g, '_') as DocType;
  
  // No more hooks here!
  // Classic component passed to WizardHost
  return <WizardHost docType={docType} classic={<ClassicWizard docType={docType} />} />;
}
```

### **Why This Works**:
1. **Modern mode**: `WizardHost` renders `ModernEngine`, `ClassicWizard` never mounts
2. **Classic mode**: `WizardHost` renders `ClassicWizard`, hooks run normally
3. **No hydration conflict**: Each mode is isolated, no cross-contamination

---

## 📝 IMPLEMENTATION STEPS

### Step 1: Extract ClassicWizard Component ⏳
- [ ] Create `ClassicWizard` function component
- [ ] Move all hooks into it (state, useEffect, handlers)
- [ ] Keep all JSX (lines 140-391)
- [ ] Add `docType` prop

### Step 2: Update UnifiedWizard ⏳
- [ ] Remove all hooks from `UnifiedWizard`
- [ ] Remove `classicWizard` const
- [ ] Pass `<ClassicWizard docType={docType} />` to WizardHost

### Step 3: Test ⏳
- [ ] Modern mode: Verify no hydration errors
- [ ] Modern mode: Property → ModernEngine transition works
- [ ] Classic mode: Still works as before
- [ ] Refresh: State persists correctly in both modes

### Step 4: Document ⏳
- [ ] Update `PHASE15_DEPLOYMENT_LOG.md`
- [ ] Update `PROJECT_STATUS.md`
- [ ] Commit with detailed message

---

## 🎯 SUCCESS CRITERIA

### **Before Fix**:
- ❌ Hydration error #418
- ❌ Modern mode reverts to PropertyStepBridge
- ❌ localStorage conflicts between modes

### **After Fix**:
- ✅ No hydration errors
- ✅ Modern mode stays in ModernEngine after property verification
- ✅ Each mode has isolated state management
- ✅ Zero regression in Classic mode

---

## 📊 LESSONS LEARNED

### **Key Insight**:
> When building dual-mode systems, **component isolation** is crucial. 
> Passing JSX props is not enough if the parent has side effects.

### **Best Practice**:
```typescript
// ❌ BAD: Parent has side effects
function Parent() {
  const [state, setState] = useState();
  useEffect(() => { /* side effect */ });
  const childJSX = <div>...</div>;
  return <Router mode={mode}>{childJSX}</Router>;
}

// ✅ GOOD: Each mode is isolated
function Parent() {
  return <Router mode={mode}>
    <Mode1Component /> // Only renders in Mode1
  </Router>;
}
```

---

## 🔄 COMMIT PLAN

**Branch**: `main` (already merged)  
**Message**: `[PHASE 15 HOTFIX] Fix hydration error by isolating Classic wizard component`

**Files Modified**:
- `frontend/src/app/create-deed/[docType]/page.tsx`
- `PHASE15_HYDRATION_FIX.md` (this file)
- `PHASE15_DEPLOYMENT_LOG.md` (update)
- `docs/roadmap/PROJECT_STATUS.md` (update)

---

## ✅ STATUS

**Issue Identified**: ✅ COMPLETE  
**Root Cause Diagnosed**: ✅ COMPLETE  
**Fix Designed**: ✅ COMPLETE  
**Implementation**: ✅ COMPLETE  
**Testing**: ⏳ PENDING (Vercel deploying)  
**Documentation**: ✅ COMPLETE

---

## 🚀 DEPLOYMENT

**Commit**: `90852e2`  
**Branch**: `main`  
**Status**: 🟢 **PUSHED TO GITHUB**  
**Vercel**: Deploying now (~2-3 minutes)

**Files Changed**:
- ✅ `frontend/src/app/create-deed/[docType]/page.tsx` - Extracted ClassicWizard component
- ✅ `PHASE15_HYDRATION_FIX.md` - This analysis document
- ✅ `PHASE15_DEPLOYMENT_LOG.md` - Added Phase 5 documentation
- ✅ `docs/roadmap/PROJECT_STATUS.md` - Updated with fix details
- ✅ `PHASE15_HOTFIX_SUMMARY.md` - User-friendly summary

**Total Time**: ~30 minutes from bug report to deployment

---

**Next Step**: Wait for Vercel deployment, then test Modern mode (`?mode=modern`) to verify no hydration errors.



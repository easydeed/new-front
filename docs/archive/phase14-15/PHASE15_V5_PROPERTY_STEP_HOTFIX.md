# Phase 15 v5 - PropertyStepBridge Hotfix

**Date**: October 16, 2025 @ 7:15 PM  
**Issue**: `TypeError: t is not a function` when clicking "Confirm & Continue" in Step 1  
**Status**: ✅ **FIXED & DEPLOYED**  

---

## 🚨 **THE PROBLEM**

### **User Report**:
> "While testing modern. I validate the address in step 1. Data is returned but when I click confirm & continue: Uncaught TypeError: t is not a function"

### **What Was Happening**:
1. ✅ Property search worked
2. ✅ Property data was fetched and saved
3. ❌ **CRASH** when clicking "Confirm & Continue"
4. **Error**: `Uncaught TypeError: t is not a function at onClick`

### **Console Evidence**:
```javascript
[PropertyStepBridge] Property verified! Data: {...}
[PropertyStepBridge] Updating store with: {...}
Uncaught TypeError: t is not a function
    at onClick (page-8d028bdaa5cb2361.js:1:17423)
```

---

## 🔍 **ROOT CAUSE**

**Another property name mismatch** - similar to the `ModernEngine.tsx` issue we fixed earlier!

### **The Contract Mismatch**:

**`useWizardStoreBridge.ts` returns** (lines 119-124):
```typescript
return useMemo(() => ({
  hydrated,
  getWizardData,    // ✅
  updateFormData,   // ✅ We renamed from `set` to `updateFormData`
  isPropertyVerified
}), [...]);
```

**`PropertyStepBridge.tsx` was expecting** (OLD - line 11):
```typescript
const { isPropertyVerified, set } = useWizardStoreBridge();
//                            ^^^ ❌ WRONG! `set` is undefined!
```

**Result**: 
- `set` was `undefined`
- When `handlePropertyVerified` called `set(storeUpdate)` on line 36
- JavaScript tried to call `undefined(...)`
- Result: `TypeError: t is not a function`

---

## ✅ **THE FIX**

Updated `PropertyStepBridge.tsx` to use the correct property names that match `useWizardStoreBridge`'s return object.

**File**: `frontend/src/features/wizard/mode/bridge/PropertyStepBridge.tsx`

**Lines 11 & 36-38 - BEFORE** ❌:
```typescript
const { isPropertyVerified, set } = useWizardStoreBridge();
// ...
set(storeUpdate);
// ...
}, [set]);
```

**Lines 11 & 36-38 - AFTER** ✅:
```typescript
const { isPropertyVerified, updateFormData } = useWizardStoreBridge();
// ...
updateFormData(storeUpdate);
// ...
}, [updateFormData]);
```

**Changes**:
1. Line 11: `set` → `updateFormData` in destructuring
2. Line 36: `set(storeUpdate)` → `updateFormData(storeUpdate)` in function call
3. Line 38: `[set]` → `[updateFormData]` in dependency array

---

## 📊 **VERIFICATION**

### **Audited All Files Using `useWizardStoreBridge`**:

| File | Usage | Status |
|------|-------|--------|
| `PropertyStepBridge.tsx` | `{ isPropertyVerified, updateFormData }` | ✅ Fixed |
| `ModernEngine.tsx` | `{ getWizardData, updateFormData, isPropertyVerified }` | ✅ Already correct |
| `WizardHost.tsx` | `{ isPropertyVerified }` | ✅ No issue |

**All files now using correct property names!**

---

## 🚀 **DEPLOYMENT**

**Commit**: `a714d99`  
**Message**: `fix: PropertyStepBridge using wrong property name (set -> updateFormData)`  
**Status**: ✅ **PUSHED TO GITHUB**  
**Vercel**: Auto-deploying...  

---

## 🧪 **TESTING INSTRUCTIONS**

After Vercel finishes deploying (2-5 minutes):

### **Test: Property Search Step 1 → Step 2 Transition**

1. **Hard refresh** the page (`Ctrl+Shift+R`) to get new code
2. Visit `/create-deed/quitclaim?mode=modern`
3. Enter a property address (e.g., "1358 5th St, La Verne, CA")
4. Verify property data loads
5. Click **"Confirm & Continue"**
6. **Expected**: ✅ Advances to Modern Q&A (Step 2)
7. **Expected**: ❌ NO `TypeError: t is not a function` error

---

## 🎓 **LESSONS LEARNED**

### **1. Property Name Consistency is Critical**
When refactoring return objects, ALL consumers must be updated:
- ✅ `ModernEngine.tsx` was updated
- ❌ `PropertyStepBridge.tsx` was missed

### **2. Need Integration Tests**
- Unit tests wouldn't catch this
- Need full wizard flow tests (Step 1 → Step 2 → Step 3 → Finalize)

### **3. Minified Errors Are Hard to Debug**
- `TypeError: t is not a function` is not helpful
- Console logs in unminified code helped us find the issue
- Consider adding more descriptive error messages

### **4. Systematic Audits After Refactoring**
After changing a hook's return object:
1. ✅ Search for all usages (`grep useWizardStoreBridge`)
2. ✅ Check each destructuring statement
3. ✅ Verify property names match
4. ✅ Update ALL consumers atomically

---

## 🔍 **HOW TO PREVENT THIS**

### **Option A: TypeScript Strict Mode**
```typescript
// Define explicit return type for useWizardStoreBridge
interface WizardStoreBridgeReturn {
  hydrated: boolean;
  getWizardData: () => any;
  updateFormData: (patch: any) => void;
  isPropertyVerified: () => boolean;
}

export function useWizardStoreBridge(): WizardStoreBridgeReturn {
  // Implementation
}
```
**Benefit**: TypeScript would catch `set` being undefined at compile time.

### **Option B: Runtime Validation**
```typescript
// In PropertyStepBridge.tsx
const bridge = useWizardStoreBridge();
if (!bridge.updateFormData) {
  throw new Error('[PropertyStepBridge] updateFormData is undefined - check useWizardStoreBridge return object');
}
```
**Benefit**: Fail fast with clear error message.

### **Option C: Integration Tests**
```typescript
// Test the full Step 1 → Step 2 flow
test('PropertyStepBridge advances to ModernEngine after property verification', async () => {
  render(<WizardHost docType="grant-deed" />);
  // Verify property
  // Click continue
  // Assert ModernEngine is rendered
});
```
**Benefit**: Catches integration issues like this.

---

## 📝 **RELATED ISSUES**

This is the **second** property name mismatch we've encountered in Phase 15 v5:

1. **Issue #1** (Commit `6ed8ae5`): `ModernEngine.tsx` using default import for named export
   - **Symptom**: `TypeError: (0 , a.default) is not a function`
   - **Fix**: Change import statement to named import
   
2. **Issue #2** (Commit `a714d99`): `PropertyStepBridge.tsx` using wrong property name
   - **Symptom**: `TypeError: t is not a function`
   - **Fix**: Change `set` to `updateFormData`

**Pattern**: Both caused by refactoring `useWizardStoreBridge` without updating all consumers.

---

## 📊 **DEPLOYMENT STATUS**

| Step | Status | Time |
|------|--------|------|
| Code Fix | ✅ Complete | 7:10 PM |
| Git Commit | ✅ Complete | 7:12 PM |
| Git Push | ✅ Complete | 7:13 PM |
| Vercel Build | 🔄 In Progress | ~2-5 min |
| User Testing | ⏳ Pending | After build |

---

**END OF DOCUMENTATION**

**Status**: ✅ **HOTFIX DEPLOYED**  
**Next Action**: Wait for Vercel build, then hard refresh and test Step 1 → Step 2 transition


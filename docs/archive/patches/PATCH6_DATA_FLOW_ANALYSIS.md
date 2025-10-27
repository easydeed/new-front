# 🔍 PATCH6 Data Flow Analysis - Grantor Field Not Prefilled

**Date**: October 16, 2025, 11:10 PM  
**Issue**: Modern wizard prompts show blank inputs despite SiteX data being stored  
**Severity**: CRITICAL - Validation always fails

---

## 📋 **USER'S OBSERVATIONS**

### Console Logs:
```javascript
[WizardHost] Rendering ModernEngine (property verified)
[useWizardStoreBridge.getWizardData] NOT HYDRATED - returning empty  ← FIRST RENDER
[useWizardStoreBridge.getWizardData] HYDRATED - loaded from localStorage: Object  ← SECOND RENDER
```

### UI Behavior:
- Grantor input field is BLANK (not prefilled)
- User must manually enter data
- Backend still receives empty payload

### Backend Logs:
```python
WARNING: Validation errors: [
  'Grantor information is required',
  'Grantee information is required', 
  'Legal description is required'
]
```

---

## 🔬 **ROOT CAUSE ANALYSIS**

### **The Data Flow**:

#### **Step 1: PropertyStepBridge Stores Data** ✅
```typescript
// PropertyStepBridge.tsx line 53
updateFormData({
  grantorName: data.currentOwnerPrimary || '',
  vesting: data.titlePoint?.vestingDetails || '',
  legalDescription: data.legalDescription || '',
  // ...other fields
});
```

#### **Step 2: updateFormData Writes to Zustand** ✅
```typescript
// useWizardStoreBridge.ts line 57-59
Object.keys(patch).forEach(key => {
  setData(key, patch[key]);  // Stores at: data.grantorName
});
```

#### **Step 3: Zustand Store Structure** ✅
```typescript
// store.ts line 19
setData: (k, v) => set({ data: { ...get().data, [k]: v } })

// Result:
{
  data: {
    grantorName: 'John Doe',
    vesting: '...',
    legalDescription: '...'
  }
}
```

#### **Step 4: getWizardData Wraps in formData** ✅
```typescript
// useWizardStoreBridge.ts line 44
return { formData: data || {} };

// Result:
{
  formData: {
    grantorName: 'John Doe',
    vesting: '...',
    legalDescription: '...'
  }
}
```

#### **Step 5: ModernEngine Reads Value** ❌ **THIS IS WHERE IT BREAKS**
```typescript
// ModernEngine.tsx line 18
const data = getWizardData();

// ModernEngine.tsx line 70
const value = data?.formData?.[step.field] ?? '';
```

**Expected**: `value` should be `'John Doe'` for `grantorName` field  
**Actual**: `value` is `''` (empty string)

---

## 🐛 **THE BUG**

### **Race Condition During Hydration**:

```typescript
// First render (before hydration):
[useWizardStoreBridge.getWizardData] NOT HYDRATED - returning empty
// Returns: { formData: {}, verifiedData: {}, docType: 'grant_deed' }

// Second render (after hydration):
[useWizardStoreBridge.getWizardData] HYDRATED - loaded from localStorage: Object
// Returns: { formData: { grantorName: 'John Doe', ... } }
```

**PROBLEM**: `ModernEngine` renders the input field on FIRST render with empty value, then the hydration happens AFTER, but the input doesn't re-render with the new value!

---

## 🧩 **WHY THE INPUT DOESN'T UPDATE**

### **ModernEngine.tsx Line 69-74**:
```typescript
const step: Prompt = flow.steps[i];
const value = data?.formData?.[step.field] ?? '';  // ← Calculated on every render

function renderInput() {
  if (step.type === 'select' && step.optionsFrom === 'owners') {
    return <SmartSelectInput 
      id={step.id} 
      value={value}  // ← Passed as prop
      onChange={(v)=>updateFormData({[step.field]: v})} 
      options={ownerOptions} 
    />;
  }
  // ... text input
  return (
    <input
      type="text"
      value={value}  // ← Passed as prop
      onChange={(e)=>updateFormData({[step.field]: e.target.value})}
      placeholder={step.placeholder}
      className="wiz-input"
      required={step.required}
    />
  );
}
```

**Analysis**:
1. `value` is derived from `data.formData[step.field]`
2. `data` comes from `getWizardData()` 
3. On first render: `data.formData = {}`
4. Input rendered with `value=""`
5. On second render (after hydration): `data.formData = { grantorName: 'John Doe' }`
6. **BUT**: React might not re-render the input if the component doesn't detect the change

---

## 🔧 **POTENTIAL CAUSES**

### **Cause 1: useWizardStoreBridge Not Reactive**
```typescript
// useWizardStoreBridge.ts line 19
const getWizardData = useCallback(() => { ... }, [data, hydrated]);
```

`getWizardData` depends on `data` and `hydrated`, so it SHOULD trigger re-render when these change.

**Verification Needed**: Check if `data` from Zustand is actually reactive.

### **Cause 2: localStorage Read Doesn't Update Zustand**
```typescript
// useWizardStoreBridge.ts line 28-36
const stored = safeStorage.get(WIZARD_DRAFT_KEY_MODERN);
if (stored) {
  const parsed = JSON.parse(stored);
  return { 
    formData: parsed.grantDeed || parsed.formData || {} ,
    // ...
  };
}
```

This reads from localStorage but doesn't UPDATE the Zustand store! So `data` from Zustand is still empty, even after hydration.

**THIS IS THE ROOT CAUSE!** ⚠️

---

## 💡 **THE SOLUTION**

### **Option A: Sync localStorage to Zustand on Hydration** ⭐ **RECOMMENDED**

Update `useWizardStoreBridge.ts` to populate Zustand store from localStorage after hydration:

```typescript
// Add useEffect to sync after hydration
useEffect(() => {
  if (!hydrated) return;
  
  try {
    const stored = safeStorage.get(WIZARD_DRAFT_KEY_MODERN);
    if (stored) {
      const parsed = JSON.parse(stored);
      const formData = parsed.grantDeed || parsed.formData || {};
      
      // Populate Zustand store from localStorage
      Object.keys(formData).forEach(key => {
        setData(key, formData[key]);
      });
      
      console.log('[useWizardStoreBridge] Synced localStorage to Zustand:', formData);
    }
  } catch (error) {
    console.error('[useWizardStoreBridge] Error syncing localStorage:', error);
  }
}, [hydrated, setData]);
```

### **Option B: Force Re-render After Hydration**

Add a state variable to force re-render:

```typescript
const [syncComplete, setSyncComplete] = useState(false);

useEffect(() => {
  if (!hydrated) return;
  // ... sync logic
  setSyncComplete(true);
}, [hydrated]);

// In ModernEngine, wait for sync:
if (!syncComplete) return <div>Loading...</div>;
```

### **Option C: Read Directly from localStorage in ModernEngine**

Instead of using `getWizardData()`, read directly from localStorage:

```typescript
// ModernEngine.tsx
const [localData, setLocalData] = useState({});

useEffect(() => {
  if (!hydrated) return;
  const stored = safeStorage.get(WIZARD_DRAFT_KEY_MODERN);
  if (stored) {
    setLocalData(JSON.parse(stored).formData || {});
  }
}, [hydrated]);

const value = localData[step.field] ?? '';
```

---

## 🎯 **RECOMMENDED FIX**

**Option A** is best because:
1. ✅ Maintains single source of truth (Zustand)
2. ✅ Reactive - components auto re-render when Zustand updates
3. ✅ Clean - no prop drilling or manual state management
4. ✅ Consistent - same pattern used throughout

---

## 📝 **IMPLEMENTATION STEPS**

1. Add `useEffect` to `useWizardStoreBridge.ts` to sync localStorage → Zustand after hydration
2. Add console logs to verify sync
3. Test: Check that `data` from Zustand contains prefilled values after hydration
4. Verify: Input fields should auto-populate
5. Confirm: Backend should receive filled payload

---

## 🧪 **TESTING CHECKLIST**

- [ ] Console shows: `[useWizardStoreBridge] Synced localStorage to Zustand: { grantorName: 'John Doe', ... }`
- [ ] Grantor field shows prefilled owner name
- [ ] Vesting field shows prefilled vesting details
- [ ] Backend receives non-empty payload
- [ ] No 400 errors in Render logs

---

**Status**: Analysis complete, solution identified  
**Next**: Implement Option A (sync localStorage → Zustand on hydration)


# 🚀 Phase 5-Prequal C: Wizard State Fix - Execution Plan

**Date**: October 8, 2025  
**Status**: Ready to Execute  
**Estimated Time**: 1-2 hours  
**Confidence**: 🟢 **HIGH** - Clear issue, straightforward fix

---

## 🎯 **MISSION**

Fix Grant Deed wizard state persistence so Step 5 receives data from Steps 1-4, enabling the frontend to use the pixel-perfect PDF endpoint.

---

## 🔍 **ROOT CAUSE ANALYSIS**

### **Problem Identified**:
Data structure mismatch between save and read operations.

**Wizard saves** (`grant-deed/page.tsx`):
```typescript
{
  wizardData: {    // ← Key name: "wizardData"
    step1: {...},
    step2: {...},
    step3: {...},
    step4: {...}
  }
}
```

**Step5 reads** (`state.ts`):
```typescript
const data = JSON.parse(localStorage.getItem('deedWizardDraft') || '{}');
return data.grantDeed || {};  // ← Looking for: "grantDeed"
```

**Result**: Step5 reads `undefined` because `grantDeed` doesn't exist!

---

## ✅ **SOLUTION**

Change the wizard page to save as `grantDeed` instead of `wizardData` to match the reader expectation.

### **Files to Modify**:
1. `frontend/src/app/create-deed/grant-deed/page.tsx` (1 file, 3 changes)

### **Changes Required**:
1. Rename state variable: `wizardData` → `grantDeed`
2. Update localStorage save structure
3. Update load from localStorage

---

## 📋 **STEP-BY-STEP EXECUTION**

### **Step 1: Update State Variable** ✏️
**File**: `frontend/src/app/create-deed/grant-deed/page.tsx`  
**Line**: 28-33

**FROM**:
```typescript
const [wizardData, setWizardData] = useState<Record<string, unknown>>({
  step1: {},
  step2: {},
  step3: {},
  step4: {}
});
```

**TO**:
```typescript
const [grantDeed, setGrantDeed] = useState<Record<string, unknown>>({
  step2: {},
  step3: {},
  step4: {}
});
```

**Why**: Match the expected data structure and remove unused step1 (it's in verifiedData)

---

### **Step 2: Update Auto-Save** ✏️
**File**: `frontend/src/app/create-deed/grant-deed/page.tsx`  
**Line**: 37-54

**FROM**:
```typescript
const saveData = {
  currentStep,
  verifiedData,
  wizardData,
  docType: 'grant_deed',
  timestamp: new Date().toISOString()
};
```

**TO**:
```typescript
const saveData = {
  currentStep,
  verifiedData,
  grantDeed,  // ← Changed from wizardData
  docType: 'grant_deed',
  timestamp: new Date().toISOString()
};
```

---

### **Step 3: Update Load Function** ✏️
**File**: `frontend/src/app/create-deed/grant-deed/page.tsx`  
**Line**: 56-74

**FROM**:
```typescript
setWizardData(parsed.wizardData || {});
```

**TO**:
```typescript
setGrantDeed(parsed.grantDeed || {});
```

---

### **Step 4: Update Property Handler** ✏️
**File**: `frontend/src/app/create-deed/grant-deed/page.tsx`  
**Line**: 76-88

**FROM**:
```typescript
setWizardData(prev => ({
  ...prev,
  step1: {
    apn: data.apn,
    county: data.county,
    piqAddress: data.piqAddress,
    titlePoint: data.titlePoint
  }
}));
```

**TO**:
```typescript
// No change needed - step1 data is in verifiedData
// Just remove this block or keep it for backward compatibility
```

---

### **Step 5: Update Step Data Handler** ✏️
**File**: `frontend/src/app/create-deed/grant-deed/page.tsx`  
**Line**: 114-116

**FROM**:
```typescript
const handleStepDataChange = (stepData: StepPayload) => {
  setWizardData(prev => ({ ...prev, ...stepData }));
};
```

**TO**:
```typescript
const handleStepDataChange = (stepData: StepPayload) => {
  setGrantDeed(prev => ({ ...prev, ...stepData }));
};
```

---

### **Step 6: Update useEffect Dependency** ✏️
**File**: `frontend/src/app/create-deed/grant-deed/page.tsx`  
**Line**: 54

**FROM**:
```typescript
}, [currentStep, verifiedData, wizardData]);
```

**TO**:
```typescript
}, [currentStep, verifiedData, grantDeed]);
```

---

## 🧪 **TESTING PLAN**

### **Test 1: Local Development**
```bash
cd frontend
npm run dev
```

1. Go to http://localhost:3000/create-deed/grant-deed
2. Complete Step 1: Property Search
3. Complete Step 2: Request Details (fill all fields)
4. Complete Step 3: Transfer Tax (fill all fields)
5. Complete Step 4: Parties & Property (fill all fields)
6. Step 5: **Verify preview shows all data**
7. Open DevTools Console: Check for errors
8. Check localStorage: `localStorage.getItem('deedWizardDraft')`
9. Verify structure has `grantDeed: { step2, step3, step4 }`

### **Test 2: Generate PDF**
1. In Step 5, click "Generate PDF"
2. Should generate successfully
3. Should download PDF with correct data
4. No validation errors

### **Test 3: State Persistence**
1. Complete Steps 1-3
2. Refresh the page
3. Should restore to Step 3
4. Should have all data intact
5. Continue to Step 5
6. Verify all data present

---

## 📊 **SUCCESS CRITERIA**

Phase 5-Prequal C is **COMPLETE** when:

- ✅ Complete wizard Steps 1-5 without errors
- ✅ Step 5 preview shows all entered data
- ✅ Generate PDF button works
- ✅ PDF downloads with correct data
- ✅ No validation errors ("Grantor required", etc.)
- ✅ State persists on page refresh
- ✅ Both legacy and pixel endpoints accessible

---

## 🚀 **DEPLOYMENT PLAN**

### **Step 1: Implement Changes** (20 min)
- Make all 6 code changes
- Test locally
- Verify state persistence

### **Step 2: Test E2E** (15 min)
- Complete full wizard flow
- Generate PDF
- Verify quality

### **Step 3: Deploy to Vercel** (5 min)
```bash
git add frontend/src/app/create-deed/grant-deed/page.tsx
git commit -m "Phase 5-Prequal C: Fix wizard state persistence - rename wizardData to grantDeed"
git push origin main
```

### **Step 4: Production Test** (10 min)
- Test on production URL
- Complete wizard
- Generate PDF
- Verify success

### **Step 5: Enable Pixel Endpoint** (5 min)
- Set `NEXT_PUBLIC_PDF_PIXEL_PERFECT=true` in Vercel
- Redeploy
- Test pixel endpoint via UI

---

## 📈 **ESTIMATED TIMELINE**

```
Implementation:  20 minutes
Local Testing:   15 minutes
Deployment:       5 minutes
Prod Testing:    10 minutes
Enable Pixel:     5 minutes
Documentation:    5 minutes

Total: ~60 minutes
```

---

## 🎯 **BONUS: OPTIONAL IMPROVEMENTS**

After core fix is complete, consider:

1. **Add TypeScript Types** (optional)
   - Properly type `grantDeed` state
   - Add interfaces for step data

2. **Add State Validation** (optional)
   - Validate data before proceeding
   - Show warning if required fields missing

3. **Improve Error Handling** (optional)
   - Better error messages
   - Fallback for corrupted localStorage

---

## 🔍 **DEBUGGING TOOLS**

### **Check Current State**:
```javascript
// In browser console
const data = JSON.parse(localStorage.getItem('deedWizardDraft'));
console.log('Current structure:', data);
console.log('Has grantDeed?', !!data.grantDeed);
console.log('Has wizardData?', !!data.wizardData);
console.log('Step 2 data:', data.grantDeed?.step2 || data.wizardData?.step2);
```

### **Clear State** (if needed):
```javascript
localStorage.removeItem('deedWizardDraft');
location.reload();
```

---

## ✅ **PRE-EXECUTION CHECKLIST**

Before starting:
- [ ] Phase 5-Prequal B complete ✅
- [ ] Backend pixel endpoint working ✅
- [ ] Auth header forwarding fixed ✅
- [ ] Local environment set up
- [ ] DevTools open (Console + Application tabs)

---

## 🎉 **EXPECTED OUTCOME**

After completion:
- ✅ Wizard works end-to-end in UI
- ✅ Users can generate PDFs through the wizard
- ✅ Pixel-perfect endpoint usable from frontend
- ✅ Complete user flow restored
- ✅ Ready for Phase 5 deployment

---

**Ready to execute?** All changes are straightforward variable renames!

**Estimated Success Rate**: 99% - This is a simple, well-defined fix.

**Let's fix this wizard!** 🚀


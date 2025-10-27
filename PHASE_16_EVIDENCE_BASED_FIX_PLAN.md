# Phase 16: Evidence-Based Fix Plan
**Date**: October 27, 2025  
**Status**: 📋 **READY FOR IMPLEMENTATION**

---

## 🎯 STRATEGY

Instead of making assumptions, we'll:
1. **Add comprehensive diagnostics** to trace actual data flow
2. **Deploy diagnostics** and capture real production behavior
3. **Apply targeted fixes** based on evidence
4. **Verify each fix** independently

---

## 🔧 FIX #1: Legal Description Hydration

### **Diagnostic Code**:

```typescript
// Add to frontend/src/features/wizard/mode/engines/ModernEngine.tsx
// Inside the useEffect that initializes state (after line 66):

useEffect(() => {
  if (!hydrated) return;
  const data = getWizardData();
  
  // ========== DIAGNOSTIC START ==========
  console.log('[LEGAL DESC DIAG] ======================');
  console.log('[LEGAL DESC DIAG] hydrated:', hydrated);
  console.log('[LEGAL DESC DIAG] Full wizardData:', JSON.stringify(data, null, 2));
  console.log('[LEGAL DESC DIAG] data.verifiedData:', data.verifiedData);
  console.log('[LEGAL DESC DIAG] data.verifiedData?.legalDescription:', data.verifiedData?.legalDescription);
  console.log('[LEGAL DESC DIAG] data.formData?.legalDescription:', data.formData?.legalDescription);
  console.log('[LEGAL DESC DIAG] data.legalDescription:', data.legalDescription);
  // ========== DIAGNOSTIC END ==========
  
  const initial = { 
    ...(data.formData || {}),
    apn: data.formData?.apn || data.verifiedData?.apn || data.apn || '',
    county: data.formData?.county || data.verifiedData?.county || data.county || '',
    propertyAddress: data.formData?.propertyAddress || data.verifiedData?.fullAddress || data.propertyAddress || '',
    fullAddress: data.formData?.fullAddress || data.verifiedData?.fullAddress || data.fullAddress || '',
    legalDescription: data.formData?.legalDescription || data.verifiedData?.legalDescription || data.legalDescription || '',
    grantorName: data.formData?.grantorName || data.verifiedData?.currentOwnerPrimary || data.grantorName || '',
    granteeName: data.formData?.granteeName || '',
    vesting: data.formData?.vesting || data.verifiedData?.vestingDetails || data.vesting || '',
    requestedBy: data.formData?.requestedBy || '',
  };
  
  // ========== DIAGNOSTIC START ==========
  console.log('[LEGAL DESC DIAG] initial.legalDescription:', initial.legalDescription);
  console.log('[LEGAL DESC DIAG] ======================');
  // ========== DIAGNOSTIC END ==========
  
  setState(initial);
}, [hydrated]);

// Add after setState completes:
useEffect(() => {
  console.log('[LEGAL DESC DIAG] Current state.legalDescription:', state.legalDescription);
}, [state.legalDescription]);
```

### **Expected Outcomes**:

**Scenario A**: `verifiedData.legalDescription` exists and is populated  
→ **Fix**: Issue is with input rendering, not data. Check if `state.legalDescription` is passed correctly to input.

**Scenario B**: `verifiedData.legalDescription` is undefined or empty  
→ **Fix**: Issue is with PropertyStepBridge not storing data correctly. Check PropertySearchWithTitlePoint response.

**Scenario C**: `state.legalDescription` is set but input shows empty  
→ **Fix**: React rendering issue. Force re-render or use controlled component pattern differently.

---

## 🔧 FIX #2: Partners Dropdown

### **Diagnostic Code**:

```typescript
// Add to frontend/src/features/partners/PartnersContext.tsx
// After line 60 (after setPartners):

// ========== DIAGNOSTIC START ==========
console.log('[PARTNERS DIAG] ======================');
console.log('[PARTNERS DIAG] Raw API response:', raw);
console.log('[PARTNERS DIAG] Raw length:', raw?.length);
console.log('[PARTNERS DIAG] First raw item:', raw?.[0]);
console.log('[PARTNERS DIAG] Transformed options:', options);
console.log('[PARTNERS DIAG] Transformed length:', options.length);
console.log('[PARTNERS DIAG] First transformed item:', options[0]);
console.log('[PARTNERS DIAG] ======================');
setPartners(options);
// ========== DIAGNOSTIC END ==========

// Add to frontend/src/features/wizard/mode/engines/ModernEngine.tsx
// After line 16 (after usePartners):

const { partners } = usePartners();

// ========== DIAGNOSTIC START ==========
useEffect(() => {
  console.log('[PARTNERS DIAG] ======================');
  console.log('[PARTNERS DIAG] ModernEngine - partners from usePartners():', partners);
  console.log('[PARTNERS DIAG] ModernEngine - partners.length:', partners?.length);
  console.log('[PARTNERS DIAG] ModernEngine - first partner:', partners?.[0]);
  console.log('[PARTNERS DIAG] ======================');
}, [partners]);
// ========== DIAGNOSTIC END ==========

// Add before PrefillCombo render (around line 185):
// ========== DIAGNOSTIC START ==========
console.log('[PARTNERS DIAG] Rendering step:', current?.id, current?.field);
console.log('[PARTNERS DIAG] current.field === "requestedBy":', current?.field === 'requestedBy');
console.log('[PARTNERS DIAG] partners being passed to PrefillCombo:', current?.field === 'requestedBy' ? partners : []);
// ========== DIAGNOSTIC END ==========
```

### **Expected Outcomes**:

**Scenario A**: Raw API response is empty `[]`  
→ **Fix**: Backend issue - check if partners exist in database, check API route logic.

**Scenario B**: Raw API has data but transformed is empty  
→ **Fix**: Transform logic broken - check the `.map()` function.

**Scenario C**: Transformed has data but `usePartners()` returns empty  
→ **Fix**: Context provider issue - check if `PartnersProvider` wraps the wizard properly.

**Scenario D**: `usePartners()` has data but `partners` prop to PrefillCombo is empty  
→ **Fix**: Conditional logic broken - check `current.field === 'requestedBy'` condition.

**Scenario E**: `PrefillCombo` receives data but dropdown doesn't show  
→ **Fix**: PrefillCombo rendering issue - check dropdown CSS, z-index, or open/close logic.

---

## 🔧 FIX #3: PDF Requested By Field

### **Diagnostic Code**:

```typescript
// Add to frontend/src/lib/deeds/finalizeDeed.ts (or wherever finalizeDeed is defined)
// Before the fetch call:

// ========== DIAGNOSTIC START ==========
console.log('[PDF DIAG] ======================');
console.log('[PDF DIAG] Full payload:', JSON.stringify(payload, null, 2));
console.log('[PDF DIAG] payload.requestedBy:', payload.requestedBy);
console.log('[PDF DIAG] payload.requested_by:', payload.requested_by);
console.log('[PDF DIAG] payload.recordingRequestedBy:', payload.recordingRequestedBy);
console.log('[PDF DIAG] ======================');
// ========== DIAGNOSTIC END ==========

// Add to backend/routers/deeds.py (or wherever PDF generation happens)
// Before rendering template:

print("[PDF DIAG] ======================")
print(f"[PDF DIAG] Full jinja_ctx: {jinja_ctx}")
print(f"[PDF DIAG] jinja_ctx.requested_by: {jinja_ctx.get('requested_by')}")
print(f"[PDF DIAG] jinja_ctx.requestedBy: {jinja_ctx.get('requestedBy')}")
print("[PDF DIAG] ======================")
```

### **Expected Outcomes**:

**Scenario A**: `payload.requestedBy` has value but `payload.requested_by` is missing  
→ **Fix**: Add field name transformation in canonical adapter:
```typescript
const canonical = {
  ...otherFields,
  requested_by: state.requestedBy  // snake_case for backend
};
```

**Scenario B**: Backend receives `requestedBy` (camelCase) but template expects `requested_by` (snake_case)  
→ **Fix**: Add alias in backend before rendering:
```python
jinja_ctx['requested_by'] = jinja_ctx.get('requestedBy') or jinja_ctx.get('requested_by')
```

**Scenario C**: Template receives empty/null value  
→ **Fix**: Check if wizard state has `requestedBy` at the time of finalization.

---

## 📦 DIAGNOSTIC PATCH

Create a single patch that adds all diagnostics at once:

### **Files to Modify**:

1. `frontend/src/features/wizard/mode/engines/ModernEngine.tsx` - Add legal + partners diag
2. `frontend/src/features/partners/PartnersContext.tsx` - Add partners diag
3. `frontend/src/lib/deeds/finalizeDeed.ts` - Add PDF diag
4. `backend/routers/deeds.py` - Add backend PDF diag

### **Deploy Steps**:

```bash
# 1. Apply diagnostics
git checkout -b diagnostic/phase-16-comprehensive
# (Make changes above)
git add -A
git commit -m "diagnostic: Add comprehensive logging for 3 Phase 16 issues"
git push origin diagnostic/phase-16-comprehensive

# 2. Wait for Vercel build
# 3. Test in production with console open
# 4. Capture all console logs
# 5. Analyze and apply targeted fixes
```

---

## 🧪 VERIFICATION CHECKLIST

### **After Deploying Diagnostics**:

- [ ] Open production wizard: `https://deedpro-frontend-new.vercel.app/create-deed/grant-deed`
- [ ] Open browser console (F12)
- [ ] Complete property search
- [ ] Capture `[LEGAL DESC DIAG]` logs
- [ ] Navigate to "Requested By" step
- [ ] Capture `[PARTNERS DIAG]` logs
- [ ] Complete wizard and generate PDF
- [ ] Capture `[PDF DIAG]` logs
- [ ] Screenshot all logs
- [ ] Analyze evidence

### **After Applying Fixes**:

- [ ] Issue #1: Legal description prefills automatically after property search
- [ ] Issue #2: Partners dropdown shows full list (27 partners)
- [ ] Issue #3: PDF includes "Recording Requested By: [name]"
- [ ] All 3 fixes verified in production
- [ ] No regressions in other features

---

## 🎯 SUCCESS CRITERIA

### **Legal Description**:
- ✅ After property search, legal description input shows the value from SiteX
- ✅ User doesn't need to manually type it
- ✅ Value persists through navigation (forward/backward)

### **Partners Dropdown**:
- ✅ Clicking "Requested By" input shows dropdown with 27 partners
- ✅ Typing filters the list to matching partners
- ✅ Selecting a partner fills the input
- ✅ User can also type a new partner name

### **PDF Requested By**:
- ✅ After completing wizard, PDF shows "Recording Requested By: [name]"
- ✅ Name matches what user entered in wizard
- ✅ Field appears in correct location on PDF

---

## 📊 ROLLBACK PLAN

If diagnostics or fixes cause issues:

```bash
# Rollback to last stable version
git revert HEAD
git push origin main

# OR if multiple commits need rollback:
git reset --hard 0a182a6
git push origin main --force
```

---

**READY TO PROCEED**: Yes  
**ESTIMATED TIME**: 
- Diagnostics: 30 minutes
- Deploy + Testing: 15 minutes
- Fixes: 30-60 minutes (depending on root causes)
- **Total**: ~2 hours

---

**Next**: User approval to proceed with diagnostic patch.


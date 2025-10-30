# 🧪 PHASE 20: Modern Wizard County Hydration - Test & Fix Plan

**Date**: October 30, 2025, 12:05 AM PST  
**Status**: 🔍 **INVESTIGATION REQUIRED**  
**Priority**: 🟡 **MEDIUM** (User reports all deeds working, but county issue documented earlier)

---

## 📋 BACKGROUND

### What We Know:
1. **Classic Wizard**: County hydration ✅ **WORKING** (user confirmed)
2. **Modern Wizard**: County hydration ❓ **NEEDS TESTING**

### Previous Evidence of Bug:
From earlier render logs (October 29, ~9PM PST):
```
[Backend /deeds] county: (MISSING - no log!)
[Backend /deeds] legal_description: TRACT NO 27843 LOT 21...
```

### Code Analysis Shows:
✅ **PropertyStepBridge** (Line 22): `county: data.county,` in storeUpdate  
✅ **ModernEngine** (Line 89): `county: data.formData?.county || data.verifiedData?.county || data.county || '',`  
✅ **grantDeed.ts adapter** (Line 7): `county: state.county || null,`  
✅ **finalizeDeed Hotfix #6** (Line 85): County repair logic added  

**Conclusion**: Code SHOULD be working! But we need to verify with actual test.

---

## 🧪 TEST PLAN

### Test #1: Modern Wizard - Grant Deed with County ✅
**Steps**:
1. Navigate to: `https://deedpro-frontend-new.vercel.app/create-deed/grant-deed?mode=modern`
2. Search property: "1358 5th St, La Verne, CA 91750"
3. Answer all prompts (grantor, grantee, requestedBy, etc.)
4. Review SmartReview summary
   - **Check**: Does county show "Los Angeles County"?
5. Click "Finalize Deed"
6. **Check browser console**:
   ```
   [finalizeDeed v6] Backend payload - county: ??? 
   ```
7. **Check backend logs** (if accessible):
   ```
   [Backend /deeds] county: ???
   ```

**Expected Result**: County should be "LOS ANGELES" or "Los Angeles County"  
**Pass Criteria**: PDF generates successfully with county filled

---

### Test #2: Modern Wizard - Quitclaim Deed with County ✅
**Steps**:
1. Navigate to: `https://deedpro-frontend-new.vercel.app/create-deed/quitclaim-deed?mode=modern`
2. Search property: "7811 Irwingrove Dr, Downey, CA 90241"
3. Answer all prompts
4. Finalize deed
5. Check county in console logs

**Expected Result**: County = "LOS ANGELES"  
**Pass Criteria**: PDF generates with correct county

---

### Test #3: Compare Classic vs Modern Console Logs
**Classic Wizard** (known working):
```
[prefillFromEnrichment] SiteX data: {
  county: 'LOS ANGELES',
  ...
}
```

**Modern Wizard** (to verify):
```
[PropertyStepBridge] Updating store with enriched SiteX data: {
  county: ???,
  ...
}

[finalizeDeed v6] Backend payload - county: ???
```

---

## 🔍 DIAGNOSTIC CHECKLIST

If county is MISSING in Modern Wizard, check:

### 1. **Is county in SiteX response?**
```
[PropertyStepBridge] Property verified! Raw data: { county: ??? }
```

### 2. **Is county saved to wizard store?**
```
[PropertyStepBridge] Updating store with enriched SiteX data: { county: ??? }
```

### 3. **Is county in ModernEngine state?**
```
[ModernEngine] FULL wizard data: { formData: { county: ??? } }
```

### 4. **Is county in canonical adapter output?**
```
[finalizeDeed v6] Canonical payload created: { property: { county: ??? } }
```

### 5. **Is county in backend payload?**
```
[finalizeDeed v6] Backend payload - county: ???
```

---

## 🐛 POTENTIAL ISSUES & FIXES

### Issue #1: County Not in Wizard Store
**Symptom**: `PropertyStepBridge` logs show `county: undefined`  
**Root Cause**: `updateFormData()` not saving county to localStorage  
**Fix**: Verify `useWizardStoreBridge.updateFormData()` saves ALL fields

### Issue #2: County Cleared Between Steps
**Symptom**: County is in store initially, but disappears later  
**Root Cause**: State merging/replacing logic (similar to Classic Wizard Hotfix #9)  
**Fix**: Check if Modern Engine is REPLACING state instead of MERGING

### Issue #3: County in Wrong Format
**Symptom**: County is "Los Angeles County" but backend expects "LOS ANGELES"  
**Root Cause**: SiteX returns "Los Angeles County", Pydantic expects exact format  
**Fix**: Add normalization in adapter:
```typescript
county: (state.county || '').toUpperCase().replace(' COUNTY', ''),
```

### Issue #4: Hotfix #6 Not Applied to Modern Wizard
**Symptom**: `finalizeDeed` logs show empty county  
**Root Cause**: Hotfix #6 repair logic not working for Modern Wizard flow  
**Fix**: Enhance repair logic with better fallbacks

---

## ✅ EXPECTED OUTCOME

After testing, we should know:
1. ✅ Is county hydration working in Modern Wizard? (YES/NO)
2. ✅ If NO, which step in the flow is dropping the county?
3. ✅ If YES, update documentation that issue is resolved

---

## 📊 CURRENT STATUS SUMMARY

| Wizard | County Hydration | Status | Verified By |
|--------|------------------|--------|-------------|
| Classic | ✅ Working | **CONFIRMED** | User testing |
| Modern | ❓ Unknown | **NEEDS TEST** | Pending |

---

## 🎯 ACTION ITEMS

### For User:
1. Test Modern Wizard (Grant or Quitclaim) on production
2. Share console logs if county is missing
3. Confirm if PDF generates with county filled

### For Developer (If Bug Confirmed):
1. Use diagnostic checklist to find where county is dropped
2. Apply similar fix to Classic Wizard's solution
3. Deploy hotfix for Modern Wizard
4. Update PROJECT_STATUS.md

---

## 📚 REFERENCES

- **PHASE_19_CRITICAL_FINDINGS.md**: Original county bug documentation
- **PropertyStepBridge.tsx**: Line 22 (county in storeUpdate)
- **ModernEngine.tsx**: Line 89 (county hydration)
- **finalizeDeed.ts**: Line 85 (Hotfix #6 repair logic)
- **grantDeed.ts**: Line 7 (canonical adapter)

---

**Next Step**: User tests Modern Wizard and reports findings! 🚀


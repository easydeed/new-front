# Phase 16 - Post-Launch Cleanup & Enhancement

**Date**: October 23, 2025  
**Status**: 🏗️ IN PROGRESS  
**Approach**: Slow and steady, document all changes, test methodically

---

## 🎯 Three Issues to Address

### Issue #1: Partners 403 Error (HIGH PRIORITY)
**Status**: 🔴 INVESTIGATING

**Symptoms**:
- Console shows: `GET /partners/selectlist/ HTTP/1.1" 403 Forbidden`
- Appears repeatedly in logs
- Does not block core functionality but creates noise

**Expected Behavior**:
1. Partners added via Modern Wizard should save to database
2. Saved partners should appear in dropdown for "Requested By" field in future uses
3. No 403 errors

**Current Behavior**:
- Need to investigate authentication/authorization

---

### Issue #2: Legal Description Question Disappearing
**Status**: 🟡 NEEDS INVESTIGATION

**Symptoms**:
- Legal description question sometimes doesn't appear
- User can't edit/update legal description when it's pre-filled with "Not available"

**Expected Behavior**:
- If SiteX returns "Not available" or empty → Show text input field
- User should be able to type/edit legal description
- Question should remain visible until user fills it or confirms

**Current showIf Logic** (promptFlows.ts line 44-49):
```typescript
showIf: (state: any) => {
  const legal = (state?.legalDescription || '').toString();
  const ok = legal.trim() !== '' && legal !== 'Not available';
  console.log('[Prompt.legalDescription.showIf] 📜 legal:', legal, 'SHOW:', !ok);
  return !ok;
}
```

**Analysis**:
- Shows question when legal is EMPTY or "Not available"
- Hides question when legal has actual content
- Need to verify this is working correctly

---

### Issue #3: Test All Deed Types
**Status**: ⏳ PENDING

**Deed Types to Test**:
1. ✅ Grant Deed (tested and working)
2. ⏳ Quitclaim Deed
3. ⏳ Interspousal Transfer
4. ⏳ Warranty Deed
5. ⏳ Tax Deed

---

## 📋 Execution Plan

### Phase 16.1: Partners 403 Fix
1. Investigate authentication issue
2. Check backend endpoint authorization
3. Fix and test
4. Document changes

### Phase 16.2: Legal Description Fix
1. Review showIf logic
2. Test with browser automation
3. Fix if needed
4. Document changes

### Phase 16.3: Test All Deed Types
1. Test each deed type systematically
2. Document any issues found
3. Fix and re-test
4. Update documentation

---

**Let's start with Issue #1: Partners 403 Error**


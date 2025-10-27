# Phase 16.1 - Partners 403 Fix

**Date**: October 23, 2025  
**Status**: 🟡 PROPOSED - NOT YET DEPLOYED  
**Risk Level**: 🟢 LOW - Only affects optional dropdown feature

---

## 🔍 Root Cause Analysis

**Issue**: `GET /partners/selectlist/ HTTP/1.1" 403 Forbidden`

**Why 403?**
- Backend endpoint requires JWT authentication: `user_id: int = Depends(get_current_user_id)`
- Frontend proxy forwards Authorization header correctly
- BUT: `PartnersContext.tsx` is NOT sending Authorization header at all!

**Comparison:**

| Component | Authorization Header | Result |
|-----------|---------------------|--------|
| PrefillCombo.tsx (create partner) | ✅ `Authorization: Bearer ${token}` | ✅ Works (201 Created) |
| PartnersContext.tsx (list partners) | ❌ None | ❌ 403 Forbidden |

---

## 🎯 The Fix

**File**: `frontend/src/features/partners/PartnersContext.tsx`  
**Lines**: 24-38 (refresh function)

**Before**:
```typescript
const res = await fetch('/api/partners/selectlist', {
  credentials: 'include',
  headers: {
    'Accept': 'application/json',
  }
});
```

**After**:
```typescript
// Get auth token from localStorage (same as PrefillCombo)
const token = typeof window !== 'undefined' 
  ? (localStorage.getItem('token') || localStorage.getItem('access_token'))
  : null;

const res = await fetch('/api/partners/selectlist', {
  credentials: 'include',
  headers: {
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  }
});
```

---

## 🛡️ Safety Analysis

### What This Changes:
- ✅ **ONLY** affects partners list loading
- ✅ Partners are **optional** - used only for "Requested By" dropdown
- ✅ Modern Wizard core flow does NOT depend on partners
- ✅ If partners fail to load, wizard still works (graceful degradation)

### What This DOES NOT Change:
- ❌ No changes to grantor/grantee dropdowns
- ❌ No changes to deed creation
- ❌ No changes to PDF generation
- ❌ No changes to any core wizard functionality

### Blast Radius:
- 🟢 **ZERO impact** on Modern Wizard core flow
- 🟢 Only affects "Requested By" field dropdown suggestions
- 🟢 If broken, worst case: dropdown shows no partners (user can still type)

---

## ✅ Pre-Deployment Checklist

Before deploying, verify:

1. [ ] Only PartnersContext.tsx was modified
2. [ ] No changes to ModernEngine.tsx
3. [ ] No changes to PrefillCombo.tsx
4. [ ] No changes to finalizeDeed.ts
5. [ ] No changes to backend API endpoints
6. [ ] Build passes with no errors
7. [ ] Can revert easily if needed

---

## 🧪 Testing Plan

After deployment:

1. **Test Modern Wizard Core Flow** (Regression Test):
   - ✅ Property search works
   - ✅ Grantor dropdown works
   - ✅ Grantee input works
   - ✅ Legal description works
   - ✅ Vesting works
   - ✅ PDF generates

2. **Test Partners Fix**:
   - ✅ No more 403 errors in console
   - ✅ Partners dropdown shows saved partners
   - ✅ Can create new partners

---

## 🚨 Rollback Plan

If anything breaks:

```bash
git revert HEAD  # Revert the PartnersContext change
git push origin main  # Deploy the revert
```

**Revert restores**: PartnersContext without Authorization header (original state)  
**Effect**: 403 error returns, but Modern Wizard still works

---

## 📝 Decision Point

**BEFORE DEPLOYING**: Should we proceed?

**Arguments FOR deploying**:
- ✅ Fix is isolated to one file
- ✅ Low risk - doesn't touch core functionality
- ✅ Matches pattern already working in PrefillCombo
- ✅ Easy to revert

**Arguments AGAINST deploying now**:
- ⚠️ Could test in local environment first
- ⚠️ Could wait until next major deployment
- ⚠️ Could create a separate branch for testing

**Recommendation**: ✅ **SAFE TO DEPLOY** (but get user approval first)


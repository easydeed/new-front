# Phase 16: Production Issues - Diagnostic Analysis

**Date**: October 23, 2025  
**Status**: 🔴 ISSUES REPORTED IN PRODUCTION

---

## 🚨 **Reported Issues**

1. ❌ **Legal description disappears immediately when typing**
2. ❌ **Partners don't populate in dropdown**
3. ❌ **Typed values don't transfer to PDF**

---

## 🔍 **Code Verification**

### Issue #1: Legal Description Disappearing

**Deployed Code** (lines 44-49):
```typescript
showIf: (state: any) => {
  const legal = (state?.legalDescription || '').toString();
  const normalized = legal.trim().toLowerCase();
  const hasValidLegal = normalized !== '' && normalized !== 'not available' && legal.length >= 12;
  return !hasValidLegal; // keep step visible until user provides a minimally sufficient edit
},
```

**Logic Analysis**:
- Field SHOWS when: empty OR "not available" OR < 12 characters
- Field HIDES when: not empty AND not "not available" AND >= 12 chars

**Expected Behavior When Typing "a"**:
- `normalized !== ''` → TRUE
- `normalized !== 'not available'` → TRUE  
- `legal.length >= 12` → FALSE (1 < 12)
- `hasValidLegal` → FALSE (AND condition fails)
- `return !hasValidLegal` → TRUE (**field should SHOW**)

**Verdict**: Logic appears correct ✅

**Possible Issues**:
- State update timing issue
- Re-render happening before state updates
- showIf being called with stale state

---

### Issue #2: Partners Not Populating

**Deployed Code Verified**:
- ✅ Proxy route exists: `/api/partners/selectlist/route.ts`
- ✅ Authorization header included
- ✅ x-organization-id header included
- ✅ PartnersContext loads on mount
- ✅ ModernEngine uses `usePartners()` hook
- ✅ ModernEngine passes `partners` to PrefillCombo

**Possible Issues**:
- Backend endpoint not returning data
- 403/401 auth error
- Empty partners array from API
- Console errors not visible

---

### Issue #3: Typed Values Don't Appear on PDF

**Deployed Code** (lines 68-72):
```typescript
onChange={(e) => {
  const newValue = e.target.value;
  setDraft(newValue);
  onChange(newValue); // ✅ propagate to parent on every keystroke
}}
```

**Verdict**: onChange propagation is present ✅

**Possible Issues**:
- Parent onChange not updating state correctly
- finalizeDeed not reading correct state
- Database save failing
- PDF generation not receiving data

---

## 🎯 **Diagnostic Steps Needed**

### Step 1: Check Browser Console
**What to look for**:
```javascript
// Partners loading:
[PartnersContext] Failed to fetch partners: 403
[PartnersContext] load error

// Proxy errors:
[partners/selectlist] proxy error:

// State updates:
[ModernEngine.onChange] 🔵 field="requestedBy" value="..."
[ModernEngine.onNext] 🔴 requestedBy: ...

// Legal description:
[Prompt.legalDescription.showIf] (if we had logging)
```

### Step 2: Check Network Tab
**Look for**:
- `/api/partners/selectlist` - Status code? Response?
- `/api/deeds/create` - Request payload includes `requested_by`?
- `/api/generate/grant-deed-ca` - Request payload includes `requested_by`?

### Step 3: Test Specific Scenarios

#### Test A: Partners Dropdown
1. Open wizard
2. Open browser console (F12)
3. Navigate to "Requested By" field
4. Check console for:
   - `[PartnersContext]` logs
   - Network requests to `/api/partners/selectlist`
   - Response data

#### Test B: Type in Field  
1. Type "test" in Requested By
2. Check console for:
   - `[ModernEngine.onChange]` logs showing the value
3. Click Next
4. Check console for:
   - `[ModernEngine.onNext]` showing `requestedBy: "test"`

#### Test C: Legal Description
1. Go to legal description step
2. Type one character
3. **Does the field disappear?**
4. If yes, check if there are ANY console logs

---

## 🤔 **Possible Deviations**

### Deviation #1: Manual Fixes During Build
When we fixed the build errors, we made these manual changes:
1. ✅ Moved `usePartners()` hook to function body
2. ✅ Added missing import
3. ✅ Removed duplicate `partners` variable
4. ✅ Fixed duplicate showIf code

**Any of these could have broken functionality.**

### Deviation #2: Removed Console Logs?
The old legal description code had:
```typescript
console.log('[Prompt.legalDescription.showIf] 📜 legal:', legal, 'SHOW:', !ok);
```

**We might have removed this when cleaning up duplicate code.**

---

## 🔬 **Hypothesis**

### Hypothesis A: State Update Timing
The `showIf` function might be called BEFORE the state updates from typing, causing it to hide the field immediately.

### Hypothesis B: Partners API Failing Silently
The partners endpoint might be returning 403 or empty array, but the error isn't visible because console isn't open.

### Hypothesis C: Wrong File Deployed
Vercel might have deployed a cached version or the wrong branch.

---

## 🛠️ **Quick Diagnostic Patch**

Add console logging to verify what's happening:

### For Legal Description:
```typescript
showIf: (state: any) => {
  const legal = (state?.legalDescription || '').toString();
  const normalized = legal.trim().toLowerCase();
  const hasValidLegal = normalized !== '' && normalized !== 'not available' && legal.length >= 12;
  console.log('[Legal showIf]', { legal, normalized, length: legal.length, hasValidLegal, show: !hasValidLegal });
  return !hasValidLegal;
},
```

### For Partners:
```typescript
// In PartnersContext, add at top of load():
console.log('[PartnersContext] Loading partners...');
console.log('[PartnersContext] Token:', !!token, 'OrgId:', !!orgId);
```

### For onChange:
```typescript
// Already has logs in ModernEngine.onChange - just need to check if they appear
```

---

## 📋 **Action Items**

1. **User: Check Browser Console** - Look for errors/logs
2. **User: Check Network Tab** - Verify API calls and responses
3. **User: Test with Console Open** - See what logs appear
4. **Dev: Add diagnostic logging** - If no logs visible
5. **Dev: Verify deployment** - Check Vercel deployed correct commit

---

## 🔄 **Rollback Decision**

**Should we rollback?**
- If API is working but UI is broken → Add logs and debug
- If API is not working (403) → Check backend
- If nothing is working → Consider rollback to `phase16-manual-backup`

---

## 💡 **What We Know For Sure**

✅ **Code looks correct** - Logic is sound
✅ **Build succeeded** - No compilation errors
✅ **Deployment succeeded** - Vercel deployed successfully

❓ **What we don't know**:
- Is the code actually running?
- Are there runtime errors?
- Is the API responding?

**Next: Need browser console logs and network tab inspection.**



# 🔬 DIAGNOSTIC TRACE GUIDE - Modern Wizard Data Loss

**Date**: October 21, 2025  
**Purpose**: Help user trace EXACTLY what's happening to find the real solution

---

## 🎯 **WHAT WE KNOW**

**Current Symptoms**:
1. ✅ Modern wizard completes all steps
2. ✅ User is redirected to `/deeds/[id]/preview`
3. ❌ Preview page shows error: "Grantor information is required; Grantee information is required; Legal description is required"
4. ❌ **NO `[finalizeDeed]` logs appear in console**

**Critical Insight**: The error is from the **preview page**, not the wizard. This means the deed was created in the database, but WITHOUT the required fields.

---

## 🔍 **DIAGNOSTIC STEPS FOR YOU**

### **Step 1: Check Which Code Path Is Running**

**Open Console BEFORE starting wizard**:
1. Go to: `https://deedpro-frontend-new.vercel.app/create-deed/grant-deed?mode=modern`
2. Open Console (F12)
3. Type this command:
   ```javascript
   console.log('=== DIAGNOSTIC MODE ENABLED ===');
   ```

**Complete the wizard and watch for these logs**:

**IF YOU SEE** `[finalizeDeed]` logs:
```
[finalizeDeed] Canonical payload received: ...
[finalizeDeed] Backend payload: ...
[finalizeDeed] Success! Deed ID: XX
```
✅ **GOOD**: Our fix worked, `finalizeDeed()` is running  
❌ **BUT**: Data transformation is wrong

**IF YOU DON'T SEE** `[finalizeDeed]` logs:
```
(nothing)
```
❌ **BAD**: Our fix didn't work, fallback code is still running  
❌ **OR**: Different code path entirely (e.g., preview page)

---

### **Step 2: Check the Network Tab**

**Open Network Tab BEFORE starting wizard**:
1. F12 → Network tab
2. Filter: `Fetch/XHR`
3. Complete the wizard
4. Click "Confirm & Generate"

**LOOK FOR THESE REQUESTS**:

**Request A: Deed Creation**
- **URL**: Should be `/api/deeds/create`
- **Method**: POST
- **Status**: 200 or 400?

**Click on this request and check**:
- **Request Headers**: Has `Authorization: Bearer ...`?
- **Request Payload**: What data was sent?
  ```json
  {
    "deed_type": "grant-deed",
    "property_address": "...",
    "grantor_name": "...",  // <-- Is this present?
    "grantee_name": "...",  // <-- Is this present?
    "legal_description": "..."  // <-- Is this present?
  }
  ```
- **Response**: What did the backend return?
  ```json
  {
    "id": 28,
    "success": true
  }
  ```

**Request B: PDF Generation (from preview page)**
- **URL**: `/api/generate/grant-deed-ca`
- **Method**: POST
- **Status**: 400
- **Response**: `{"detail":"Validation failed: Grantor information is required; Grantee information is required; Legal description is required"}`

---

### **Step 3: Check the Database**

**After deed creation fails**:
1. Go to: `/admin-honest-v2`
2. Click "Deeds" tab
3. Find the most recent deed
4. Check these fields:
   - `property_address`: Populated?
   - `grantor_name`: Empty or populated?
   - `grantee_name`: Empty or populated?
   - `legal_description`: Empty or populated?

---

### **Step 4: Check localStorage**

**In Console, type**:
```javascript
// Check Modern wizard state
console.log('Modern state:', localStorage.getItem('deedWizardDraft_modern'));

// Check Classic wizard state
console.log('Classic state:', localStorage.getItem('deedWizardDraft_classic'));

// Parse it
const state = JSON.parse(localStorage.getItem('deedWizardDraft_modern') || '{}');
console.log('Parsed state:', state);
console.log('Grantor:', state.grantorName);
console.log('Grantee:', state.granteeName);
console.log('Legal Description:', state.legalDescription || state.legal_description);
```

**Send me the output** - this will show if the wizard is saving the data correctly.

---

## 📊 **WHAT EACH RESULT MEANS**

### **Scenario A: `[finalizeDeed]` logs appear + Request to `/api/deeds/create`**
✅ **Our import fix worked**  
❌ **BUT**: Payload transformation is wrong

**Solution**: Fix the adapters (deed-specific or canonical)

---

### **Scenario B: NO `[finalizeDeed]` logs + Request to `/api/deeds`** (not `/create`)
❌ **Our import fix didn't work**  
❌ **Fallback code is still running**

**Solution**: Verify Vercel deployed our changes, check browser cache

---

### **Scenario C: NO `[finalizeDeed]` logs + NO request to `/api/deeds/create`**
❌ **Different code path entirely**  
❌ **Maybe preview page is creating the deed?**

**Solution**: Trace preview page code

---

### **Scenario D: Request shows correct payload BUT database has no data**
✅ **Frontend is sending correct data**  
❌ **Backend is not saving it**

**Solution**: Check Render logs for backend errors

---

## 🚨 **MOST LIKELY SCENARIOS**

Based on your error, I suspect **ONE** of these:

### **Hypothesis 1: Vercel Didn't Deploy Our Fix**
- Browser is still loading old code
- `require()` is still failing
- Fallback code is running

**Test**: Hard refresh (Ctrl+Shift+R), check Network → `ModernEngine` chunk

---

### **Hypothesis 2: Preview Page Is Creating The Deed**
- Modern wizard redirects to preview with NO deed ID
- Preview page creates a blank deed
- Then tries to generate PDF → fails

**Test**: Check URL when you land on preview - does it have `/deeds/[number]/preview`?

---

### **Hypothesis 3: Two Deed Creations Happening**
- `finalizeDeed()` runs and creates deed with data
- Preview page ALSO tries to create deed (overwrites with blank)

**Test**: Check Render logs - are there TWO POST requests to `/deeds` or `/generate`?

---

## 📝 **WHAT I NEED FROM YOU**

**Please run Steps 1-4 above and send me**:

1. **Console output**: All logs (especially `[finalizeDeed]` or lack thereof)
2. **Network tab**: Screenshot or copy/paste of:
   - Request to `/api/deeds/create` (or `/api/deeds`)
   - Request payload
   - Response
3. **Database check**: Screenshot of the deed in admin panel
4. **localStorage output**: The parsed state from Step 4

**With this data, I can pinpoint EXACTLY where the data is being lost.**

---

## 🐢 **PATIENT DEBUGGING**

I know this is frustrating. But with the diagnostic data above, we'll find the exact point where the data is lost and fix it properly.

**No more guessing. Let's see what's actually happening.** 🔬



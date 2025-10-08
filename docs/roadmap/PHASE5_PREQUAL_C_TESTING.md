# 🧪 Phase 5-Prequal C: Testing Guide

**Date**: October 8, 2025  
**Status**: Ready for Testing  
**Expected Duration**: 10-15 minutes

---

## ✅ **DEPLOYMENT STATUS**

- ✅ **Code Changes**: Complete (5 file changes)
- ✅ **Git Commit**: 3c37095
- ✅ **Git Push**: Complete
- ⏳ **Vercel Deploy**: Auto-triggered (check Vercel dashboard)
- ⏳ **Production Test**: Awaiting user validation

---

## 🎯 **TESTING OBJECTIVE**

Verify that the wizard now properly persists data between steps, specifically:
1. Steps 2-4 data saves correctly
2. Step 5 receives all data
3. PDF generation works with correct data
4. No more "Grantor required" validation errors

---

## 📋 **QUICK TEST CHECKLIST**

### **Pre-Test**:
- [ ] Wait for Vercel deployment to complete (~2 minutes)
- [ ] Check deployment status at: https://vercel.com/dashboard
- [ ] URL: https://deedpro-frontend-new.vercel.app/create-deed/grant-deed

### **Test Flow**:
- [ ] **Step 1**: Search & verify property
- [ ] **Step 2**: Fill in request details (all fields)
- [ ] **Step 3**: Fill in transfer tax (all fields)
- [ ] **Step 4**: Fill in parties & property (all fields)
- [ ] **Step 5**: **CRITICAL**: Verify preview shows all data
- [ ] **Step 5**: Click "Generate PDF"
- [ ] **Result**: PDF downloads successfully
- [ ] **Result**: PDF contains correct data

---

## 🔍 **DETAILED TESTING STEPS**

### **Step 1: Property Search** 🏠
1. Navigate to: `https://deedpro-frontend-new.vercel.app/create-deed/grant-deed`
2. Enter property details:
   - **APN**: Any valid APN (e.g., `123-456-789`)
   - **County**: Any county (e.g., `Los Angeles`)
3. Click "Verify Property"
4. Wait for TitlePoint verification
5. Click "Continue to Request Details"

### **Step 2: Request Details** 📝
Fill in the following (important for testing):
- **Requested By**: `Test Requester`
- **Title Company**: `Test Title Co`
- **Escrow Number**: `ESC123456`
- **Title Order Number**: `TO789012`
- **APN**: (auto-filled from Step 1)
- **Mail To**: Check "Use PIQ Address" or fill manually

**Expected**: Click "Next" and advance to Step 3

### **Step 3: Transfer Tax** 💰
Fill in:
- **DTT Amount**: `100.00`
- **Basis**: Select "Full value of property"
- **Area Type**: Select "Unincorporated" or "City"
- **City Name**: (if applicable) `Los Angeles`

**Expected**: Click "Next" and advance to Step 4

### **Step 4: Parties & Property** 👥
Fill in:
- **Grantors**: `John Doe; Jane Doe`
- **Grantees**: `Bob Smith; Mary Smith`
- **County**: `Los Angeles`
- **Legal Description**: `Lot 1, Block 2 of Test Tract, as per map recorded in Book 123, Page 456, Official Records of Los Angeles County, California.`

**Expected**: Click "Next" and advance to Step 5

### **Step 5: Preview & Generate** 🎨

**CRITICAL CHECKS**:
1. **Open Browser DevTools** (F12)
2. **Go to Console Tab**
3. **Check localStorage**:
   ```javascript
   const data = JSON.parse(localStorage.getItem('deedWizardDraft'));
   console.log('State structure:', data);
   console.log('Has grantDeed?', !!data.grantDeed);
   console.log('Step 2 data:', data.grantDeed?.step2);
   console.log('Step 3 data:', data.grantDeed?.step3);
   console.log('Step 4 data:', data.grantDeed?.step4);
   ```

**EXPECTED RESULTS**:
- ✅ `data.grantDeed` exists
- ✅ `data.grantDeed.step2` contains request details
- ✅ `data.grantDeed.step3` contains transfer tax info
- ✅ `data.grantDeed.step4` contains parties & property info
- ✅ Preview section shows:
  - Requested By: "Test Requester"
  - Grantors: "John Doe; Jane Doe"
  - Grantees: "Bob Smith; Mary Smith"
  - County: "Los Angeles"
  - Legal Description: (your text)

4. **Click "Generate PDF"**

**EXPECTED**:
- ✅ No validation errors
- ✅ PDF downloads
- ✅ PDF contains all data entered

---

## 🚨 **TROUBLESHOOTING**

### **Issue**: Step 5 preview is empty
**Check**:
```javascript
// In browser console
const data = JSON.parse(localStorage.getItem('deedWizardDraft'));
console.log('Full data:', data);
console.log('Has wizardData (old)?', !!data.wizardData);
console.log('Has grantDeed (new)?', !!data.grantDeed);
```

**Fix**: Clear localStorage and retry:
```javascript
localStorage.removeItem('deedWizardDraft');
location.reload();
```

### **Issue**: Validation error "Grantor required"
**This means**: Data not reaching backend

**Check**:
1. Open Network tab in DevTools
2. Click "Generate PDF"
3. Find the POST request to `/api/generate/grant-deed-ca`
4. Check Request Payload
5. Verify it contains `grantorsText`, `granteesText`, etc.

### **Issue**: Still getting 403 authentication error
**Check**: Token is still valid
```javascript
// In browser console
const token = localStorage.getItem('auth_token');
console.log('Token exists:', !!token);
```

---

## ✅ **SUCCESS CRITERIA**

Phase 5-Prequal C is **COMPLETE** when:

- ✅ Complete all 5 wizard steps
- ✅ Step 5 preview shows **all entered data**
- ✅ No validation errors
- ✅ PDF generates successfully
- ✅ PDF downloads with correct data
- ✅ localStorage contains `grantDeed` (not `wizardData`)

---

## 🎯 **NEXT STEPS AFTER SUCCESS**

Once wizard works:

### **Option 1: Enable Pixel-Perfect Endpoint** (Recommended)
Set Vercel environment variable:
```
NEXT_PUBLIC_PDF_PIXEL_PERFECT=true
```

This will switch to the new pixel-perfect PDF system!

### **Option 2: Keep Testing Legacy First**
Test with legacy endpoint first, then enable pixel-perfect.

---

## 📊 **EXPECTED TIMELINE**

```
Vercel Deploy:      ~2 minutes
Basic Test:         ~5 minutes
Full Test:          ~10 minutes
Enable Pixel:       ~2 minutes
Pixel Test:         ~5 minutes

Total: ~25 minutes for complete validation
```

---

## 🎉 **WHAT WE FIXED**

### **Before (Broken)**:
```javascript
// Saved as:
{ wizardData: { step2: {...}, step3: {...}, step4: {...} } }

// Read as:
data.grantDeed  // undefined!
```

### **After (Fixed)**:
```javascript
// Saved as:
{ grantDeed: { step2: {...}, step3: {...}, step4: {...} } }

// Read as:
data.grantDeed  // Works! ✅
```

### **Key Changes**:
1. Renamed state variable: `wizardData` → `grantDeed`
2. Updated auto-save localStorage structure
3. Updated load with backward compatibility fallback
4. Updated all data handlers
5. Added Phase 5-Prequal C comments throughout

---

## 📝 **REPORTING RESULTS**

**If Successful**:
Report: "Phase 5-Prequal C works! PDF generated with correct data. Ready for pixel-perfect."

**If Issues**:
Report:
1. What step you reached
2. What data is/isn't showing in preview
3. Any error messages
4. Console log output from localStorage check

---

## 🚀 **READY TO TEST!**

The deployment should be live in ~2 minutes. Check Vercel dashboard for deployment status.

**Good luck!** 🎯


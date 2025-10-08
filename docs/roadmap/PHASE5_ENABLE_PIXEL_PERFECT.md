# 🎨 Enable Pixel-Perfect PDF Feature Flag

**Date**: October 8, 2025  
**Phase**: 5-Prequal B/C Integration  
**Status**: Ready to Enable

---

## 🎯 **OBJECTIVE**

Enable the pixel-perfect PDF generation system in production by setting the feature flag in Vercel.

---

## 📊 **CURRENT STATE**

- ✅ **Phase 5-Prequal B**: Pixel-perfect backend endpoint deployed and tested
- ✅ **Phase 5-Prequal C**: Wizard state persistence fixed
- ✅ **Current Endpoint**: Legacy `/api/generate/grant-deed-ca`
- ⏳ **Target Endpoint**: Pixel-perfect `/api/generate/grant-deed-ca-pixel`

---

## 🔧 **CONFIGURATION CHANGE**

### **Environment Variable**:
```
NEXT_PUBLIC_PDF_PIXEL_PERFECT=true
```

### **What This Does**:
Changes the endpoint selection in `Step5Preview.tsx`:
```typescript
// Before (legacy):
const endpoint = "/api/generate/grant-deed-ca";

// After (pixel-perfect):
const endpoint = "/api/generate/grant-deed-ca-pixel";
```

---

## 📋 **MANUAL STEPS IN VERCEL**

### **Step 1: Navigate to Vercel Dashboard**
1. Go to: https://vercel.com/dashboard
2. Find project: `deedpro-frontend-new` (or your frontend project)
3. Click on the project

### **Step 2: Access Environment Variables**
1. Click **Settings** tab
2. Click **Environment Variables** in left sidebar

### **Step 3: Add Feature Flag**
1. Click **Add New** button
2. Fill in:
   - **Name**: `NEXT_PUBLIC_PDF_PIXEL_PERFECT`
   - **Value**: `true`
   - **Environment**: Select **Production** (and optionally Preview/Development)
3. Click **Save**

### **Step 4: Redeploy**
1. Go to **Deployments** tab
2. Find the latest deployment
3. Click the **⋯** (three dots) menu
4. Click **Redeploy**
5. Confirm the redeployment

### **Step 5: Wait for Deployment**
- Deployment takes ~2 minutes
- Watch the deployment logs for success

---

## 🧪 **TESTING THE PIXEL-PERFECT ENDPOINT**

### **Test Flow**:
1. Navigate to: `https://deedpro-frontend-new.vercel.app/create-deed/grant-deed`
2. Complete wizard Steps 1-5 (same as before)
3. Click "Generate PDF"
4. **Check Browser DevTools Console** for:
   ```
   [Phase 5-Prequal B] Using endpoint: /api/generate/grant-deed-ca-pixel (pixel-perfect: true)
   ```
5. PDF should download

### **Visual Quality Checks**:
Compare the new PDF with the previous one:

**Pixel-Perfect Advantages**:
- ✅ More precise text positioning
- ✅ Better font rendering
- ✅ Cleaner line spacing
- ✅ Improved legal description formatting (soft hyphens)
- ✅ County-specific margin profiles
- ✅ Background image alignment (if enabled)

### **Response Headers Check**:
In Network tab, check the PDF response headers:
- ✅ `X-Phase: 5-Prequal-B` (confirms new endpoint)
- ✅ `X-PDF-Engine: weasyprint` (or `chromium` if changed)
- ✅ `Content-Type: application/pdf`

---

## 🔍 **DEBUGGING**

### **Check if Feature Flag is Active**:
```javascript
// In browser console
console.log('Pixel-perfect enabled?', process.env.NEXT_PUBLIC_PDF_PIXEL_PERFECT);
```

Or check the console log when generating:
```
[Phase 5-Prequal B] Using endpoint: /api/generate/grant-deed-ca-pixel (pixel-perfect: true)
```

### **If Still Using Legacy Endpoint**:
1. Verify environment variable is set in Vercel
2. Verify redeployment completed successfully
3. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
4. Clear cache and retry

---

## ✅ **SUCCESS CRITERIA**

Feature flag is **ENABLED** when:
- ✅ Console shows: `Using endpoint: /api/generate/grant-deed-ca-pixel`
- ✅ Response headers include: `X-Phase: 5-Prequal-B`
- ✅ PDF generates successfully
- ✅ PDF quality is pixel-perfect

---

## 🎯 **EXPECTED DIFFERENCES**

### **What Should Look BETTER**:
1. **Text Positioning**: More precise (inch-based absolute positioning)
2. **Font Rendering**: Cleaner, more professional
3. **Legal Description**: Better word wrapping with soft hyphens
4. **Line Spacing**: More consistent
5. **Overall Layout**: More aligned with recorder requirements

### **What Should Look SAME**:
1. Content (same data)
2. Page size (Letter 8.5x11)
3. Basic structure

---

## 📊 **PERFORMANCE COMPARISON**

| Metric | Legacy | Pixel-Perfect |
|--------|--------|---------------|
| **Engine** | WeasyPrint | WeasyPrint (or Chromium) |
| **Positioning** | Flow-based | Absolute (inch units) |
| **Text Handling** | Basic | Advanced (hyphenation, fit) |
| **County Profiles** | No | Yes |
| **Rendering Time** | ~1-2s | ~1-2s (similar) |
| **PDF Size** | ~13 KB | ~14-15 KB (slightly larger) |

---

## 🚀 **ROLLBACK PLAN**

If issues occur, quickly rollback:

### **Option 1: Disable Feature Flag**
1. Go to Vercel → Settings → Environment Variables
2. Change `NEXT_PUBLIC_PDF_PIXEL_PERFECT` to `false`
3. Redeploy

### **Option 2: Delete Feature Flag**
1. Delete the environment variable entirely
2. Redeploy
3. Will default to legacy endpoint

---

## 📝 **TESTING CHECKLIST**

After enabling feature flag:
- [ ] Vercel environment variable set to `true`
- [ ] Redeployment completed successfully
- [ ] Browser cache cleared
- [ ] Console shows pixel-perfect endpoint
- [ ] PDF generates successfully
- [ ] Response headers correct
- [ ] Visual quality improved
- [ ] No errors in console
- [ ] No backend errors

---

## 🎉 **COMPLETION**

Once pixel-perfect is enabled and tested:
- ✅ Phase 5-Prequal B: COMPLETE (backend pixel system)
- ✅ Phase 5-Prequal C: COMPLETE (wizard fix)
- ✅ **Phase 5-Prequal Integration**: COMPLETE (pixel-perfect in production!)
- 🚀 Ready for Phase 5 full deployment

---

## 📊 **TIMELINE**

```
Set Environment Variable:   ~2 minutes
Redeploy:                    ~2 minutes
Test Wizard:                 ~5 minutes
Visual Comparison:           ~5 minutes

Total: ~15 minutes
```

---

**Ready to enable!** 🎨✨


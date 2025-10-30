# 🧪 Phase 5-Prequal B: Manual Testing Guide

**Date**: October 8, 2025  
**Status**: Ready for End-to-End Testing

---

## 🎯 **TESTING OBJECTIVES**

1. ✅ Verify old endpoint still works (backward compatibility)
2. ✅ Verify new pixel endpoint generates PDFs
3. ✅ Compare visual quality (pixel-perfect vs legacy)
4. ✅ Validate performance (should be similar <3s)
5. ✅ Test feature flag toggle

---

## 🔧 **AUTOMATED TEST SCRIPT**

### **Quick Test (No Auth)**
```bash
cd backend
python test_phase5_prequal_b.py
# Shows test payload structure
```

### **Full Test (With Auth)**
```bash
# 1. Get JWT token from browser
#    - Log into https://deedpro-frontend-new.vercel.app
#    - Open DevTools → Application → Local Storage
#    - Copy 'access_token' value

# 2. Run test
export JWT_TOKEN='your_token_here'
python test_phase5_prequal_b.py

# This will:
# - Test legacy endpoint
# - Test pixel endpoint
# - Generate 2 PDF files for comparison
# - Show performance metrics
```

---

## 🖱️ **MANUAL FRONTEND TEST**

### **Test 1: Feature Flag OFF (Legacy Endpoint)**

**Setup**:
- Feature flag: `NEXT_PUBLIC_PDF_PIXEL_PERFECT=false` (default)

**Steps**:
1. Go to https://deedpro-frontend-new.vercel.app
2. Log in with test account
3. Navigate to "Create Deed" → "Grant Deed"
4. Complete Step 1: Property Search
   - Address: `123 Main St, Los Angeles, CA 90012`
5. Complete Step 2: Request Details
   - Fill in test data
6. Complete Step 3: Transfer Tax
   - Amount: `$1,250.00`
7. Complete Step 4: Parties & Property
   - Grantor: `JOHN DOE; JANE DOE`
   - Grantee: `ALICE SMITH`
   - County: `Los Angeles`
   - Legal: `LOT 5, BLOCK 2, TRACT 12345`
8. Step 5: Click "Generate PDF"

**Expected**:
- ✅ PDF downloads as `Grant_Deed_CA_*.pdf`
- ✅ Console shows: `Using endpoint: /api/generate/grant-deed-ca (pixel-perfect: false)`
- ✅ Generation time: ~2-3 seconds

---

### **Test 2: Feature Flag ON (Pixel-Perfect Endpoint)**

**Setup**:
- Go to Vercel Dashboard
- Project Settings → Environment Variables
- Add: `NEXT_PUBLIC_PDF_PIXEL_PERFECT` = `true`
- Redeploy

**Steps**:
1. Same as Test 1, steps 1-8

**Expected**:
- ✅ PDF downloads as `Grant_Deed_CA_PIXEL_*.pdf`
- ✅ Console shows: `Using endpoint: /api/generate/grant-deed-ca-pixel (pixel-perfect: true)`
- ✅ Generation time: ~2-3 seconds
- ✅ Response headers include:
  - `X-PDF-Engine: weasyprint`
  - `X-Phase: 5-Prequal-B`

---

## 📊 **VISUAL COMPARISON CHECKLIST**

### **Open Both PDFs Side-by-Side**

**Legacy PDF** (old endpoint):
- [ ] Recording header visible
- [ ] Mail-to address formatted correctly
- [ ] Title "GRANT DEED" centered
- [ ] DTT declaration present
- [ ] Grantor/Grantee names visible
- [ ] Legal description formatted
- [ ] Signature lines present
- [ ] Notary block present

**Pixel-Perfect PDF** (new endpoint):
- [ ] Recording header at **exact position** (0.60in from top)
- [ ] Mail-to address at **exact position** (1.25in from top)
- [ ] Title "GRANT DEED" at **exact position** (3.00in from top, centered)
- [ ] DTT declaration at **exact position** (3.55in from top)
- [ ] Grantor/Grantee text at **exact position** (4.85in from top)
- [ ] Legal description **with soft hyphens** (better line breaks)
- [ ] Signature lines at **exact position** (7.80in from top)
- [ ] Notary block at **exact position** (9.50in from top)

**Key Differences**:
- ✅ Pixel-perfect should have **more consistent spacing**
- ✅ Pixel-perfect should have **identical layout** across systems
- ✅ Pixel-perfect should have **better text wrapping** (hyphenation)

---

## 🔍 **DEBUGGING CHECKLIST**

### **If Old Endpoint Fails**:
1. Check backend logs: https://dashboard.render.com
2. Verify JWT token is valid
3. Check browser console for errors
4. Test endpoint directly with curl

### **If New Endpoint Fails**:
1. Check that backend deployed successfully (commit `f071025`)
2. Verify template files exist: `templates/grant_deed_ca_pixel/`
3. Check backend logs for errors
4. Verify pyphen dependency installed

### **If Frontend Doesn't Switch**:
1. Verify environment variable set: `NEXT_PUBLIC_PDF_PIXEL_PERFECT`
2. Check that Vercel redeployed after env var change
3. Clear browser cache and localStorage
4. Check browser console for feature flag log

---

## 🎯 **SUCCESS CRITERIA**

Phase 5-Prequal B testing is **SUCCESSFUL** when:

- ✅ **Backward Compatible**: Old endpoint still works
- ✅ **New Endpoint Works**: Pixel endpoint generates PDFs
- ✅ **Performance**: Both endpoints <3s average
- ✅ **Visual Quality**: Pixel-perfect has consistent positioning
- ✅ **Feature Flag**: Can toggle between endpoints
- ✅ **No Errors**: Clean console, no 500s in logs

---

## 📈 **PERFORMANCE BENCHMARKS**

### **Target Metrics**:
```yaml
PDF Generation Time:
  Legacy:        <3s (p95)
  Pixel-Perfect: <3s (p95)
  
File Size:
  Legacy:        50-150 KB
  Pixel-Perfect: 50-150 KB (similar)
  
Success Rate:
  Legacy:        >97%
  Pixel-Perfect: >99% (target)
```

### **Actual Results** (To be filled):
```yaml
PDF Generation Time:
  Legacy:        ___ s
  Pixel-Perfect: ___ s
  
File Size:
  Legacy:        ___ KB
  Pixel-Perfect: ___ KB
  
Success Rate:
  Legacy:        ___%
  Pixel-Perfect: ___%
```

---

## 🚀 **NEXT STEPS AFTER TESTING**

1. ✅ **Document Results**: Update this file with actual metrics
2. ✅ **Visual Inspection**: Confirm pixel-perfect positioning
3. ⏭️ **Update Cypress Tests**: Add pixel-perfect expectations
4. ⏭️ **Enable Feature Flag**: Set to `true` for production
5. ⏭️ **24-Hour Monitor**: Watch metrics and error rates
6. ✅ **Sign-Off**: Complete Phase 5-Prequal B

---

## 💡 **TROUBLESHOOTING TIPS**

### **"Template not found" error**:
```bash
# Verify template exists on Render
# Should be at: templates/grant_deed_ca_pixel/index.jinja2
```

### **"pyphen not installed" error**:
```bash
# Verify requirements.txt has: pyphen==0.17.2
# Redeploy backend
```

### **Feature flag not working**:
```bash
# Check browser console for:
# "[Phase 5-Prequal B] Using endpoint: ..."
# If not appearing, clear cache and hard refresh
```

### **PDFs look identical**:
```bash
# This is actually good! It means pixel-perfect
# maintains visual compatibility while improving
# positioning consistency.
# Check the coordinates with a ruler on screen!
```

---

**Ready to test?** Run the automated script first, then do manual frontend testing! 🚀

**Questions?** Check the main deployment doc: `PHASE5_PREQUAL_B_DEPLOYMENT_1.md`


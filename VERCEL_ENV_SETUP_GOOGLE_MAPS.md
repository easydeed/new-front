# 🔑 **VERCEL ENVIRONMENT VARIABLE SETUP**

**Issue:** Google Maps API key is `undefined` in production  
**Cause:** Environment variable not set in Vercel dashboard  
**Solution:** Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to Vercel

---

## ✅ **STEP-BY-STEP FIX (5 minutes)**

### **1. Open Vercel Settings**

Go to: https://vercel.com/easydeed/deedpro-frontend-new/settings/environment-variables

### **2. Add New Environment Variable**

Click **"Add New"** button

### **3. Enter Variable Details**

**Name (EXACTLY):**
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
```

**Value:**
```
AIzaSyASuhhj8IP59d0tYOCn4AiLYDn_i_siE-Y
```

**Environments (CHECK ALL THREE):**
- ✅ Production
- ✅ Preview  
- ✅ Development

### **4. Save**

Click **"Save"** button

### **5. Redeploy**

**Option A: Automatic Trigger**
```powershell
cd "C:\Users\gerar\Marketing Department Dropbox\Projects\ModernAgentLLC\new-front"
git commit --allow-empty -m "chore: trigger redeploy for Google Maps key"
git push origin main
```

**Option B: Manual Redeploy**
1. Go to: https://vercel.com/easydeed/deedpro-frontend-new/deployments
2. Click latest deployment
3. Click "..." (three dots)
4. Click "Redeploy"
5. Wait 2-3 minutes

### **6. Verify**

After 2-3 minutes:
1. Open: https://deedpro-frontend-new.vercel.app/create-deed/grant-deed
2. Open DevTools Console (F12)
3. Look for: `key=AIzaSyA...` (should NOT be `undefined`)
4. Test PropertySearch autocomplete

---

## 📋 **WHAT YOU SHOULD SEE IN VERCEL**

When correctly set, your environment variables page should show:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  Value: AIzaSyA••••••••••••••••  (hidden)
  Environments: Production, Preview, Development
  Created: Just now
```

---

## 🚨 **COMMON MISTAKES TO AVOID**

### ❌ **Wrong Name**
```
GOOGLE_MAPS_API_KEY              ← Missing NEXT_PUBLIC_
NEXT_PUBLIC_GOOGLE_API_KEY       ← Missing MAPS
NEXT_PUBLIC_GOOGLEMAPS_API_KEY   ← Missing underscore
```

### ✅ **Correct Name**
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY  ← EXACTLY THIS!
```

### ❌ **Wrong Environment Selection**
- Only Production selected (won't work for preview branches)
- Only Development selected (won't work in production)

### ✅ **Correct Environment Selection**
- ALL THREE checked: Production ✓ Preview ✓ Development ✓

### ❌ **Not Redeploying**
- Just saving the variable doesn't update running deployments
- Must trigger a new deployment to pick up new env vars

### ✅ **Correct Deployment**
- Redeploy after adding variable
- Wait 2-3 minutes for build to complete
- Hard refresh browser (Ctrl+Shift+R)

---

## 🧪 **HOW TO VERIFY IT WORKED**

### **Test 1: Check Console**

Open DevTools Console (F12) on:
```
https://deedpro-frontend-new.vercel.app/create-deed/grant-deed
```

**Look For:**
```javascript
// ❌ BEFORE (broken):
key=undefined

// ✅ AFTER (fixed):
key=AIzaSyASuhhj8IP59d0tYOCn4AiLYDn_i_siE-Y
```

### **Test 2: Check Network Tab**

1. Open DevTools → Network tab
2. Filter: `maps.googleapis.com`
3. Find: `js?key=...&libraries=places`
4. Verify: Key is NOT `undefined`

### **Test 3: Try PropertySearch**

1. Type: "123 Main"
2. Wait 500ms
3. See: Autocomplete suggestions appear
4. Click: A suggestion
5. See: Property details load

---

## ⏱️ **TIMELINE**

| Step | Time | Status |
|------|------|--------|
| Add variable in Vercel | 30 sec | ⏳ |
| Trigger redeploy | 10 sec | ⏳ |
| Wait for build | 2-3 min | ⏳ |
| Test in browser | 30 sec | ⏳ |
| **TOTAL** | **~4 minutes** | ⏳ |

---

## 🆘 **IF IT STILL DOESN'T WORK**

### **Issue: Still showing `undefined` after 5 minutes**

**Causes:**
1. Variable name misspelled
2. Browser cache (old code)
3. Wrong deployment (viewing old deployment)

**Fix:**
1. Double-check variable name in Vercel (EXACTLY: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)
2. Hard refresh: Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac)
3. Check deployment URL matches latest deployment
4. Wait another 2 minutes (builds can take 3-5 min sometimes)

### **Issue: Getting `RefererNotAllowedMapError`**

**Cause:** Google Cloud Console has wrong domain restrictions

**Fix:**
1. Go to: https://console.cloud.google.com/google/maps-apis/credentials
2. Click your API key
3. Application restrictions → HTTP referrers
4. Add: `https://deedpro-frontend-new.vercel.app/*`
5. Save
6. Wait 5 minutes for Google to propagate

---

## ✅ **SUCCESS CRITERIA**

After completing these steps, you should see:

### **✅ In Vercel Dashboard:**
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ✓
Applied to: Production, Preview, Development
```

### **✅ In Browser Console:**
```javascript
// NO InvalidKeyMapError
// NO key=undefined
✅ Maps loaded successfully
```

### **✅ In PropertySearch:**
```
Type "123" → Suggestions appear ✓
Click suggestion → Property loads ✓
Confirm → Wizard continues ✓
```

---

**Generated:** November 2, 2025  
**For:** DeedPro Production (deedpro-frontend-new.vercel.app)  
**Fix Time:** ~4 minutes  
**Success Rate:** 100% (if followed exactly)

**LET ME KNOW WHEN YOU'VE ADDED IT TO VERCEL AND I'LL HELP TEST! 🚀**



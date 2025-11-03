# Google Maps API Key Verification & Fix

**Issue:** Key is set in Vercel but still showing `InvalidKeyMapError`  
**Date:** November 2, 2025  
**Status:** 🔴 Key exists but is REJECTED by Google

---

## 🔍 **STEP 1: VERIFY KEY IN VERCEL**

1. **Go to Vercel:**
   - https://vercel.com/easydeed/deedpro-frontend-new/settings/environment-variables

2. **Check:**
   - [ ] Variable name is EXACTLY: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - [ ] Value starts with: `AIza...` (typical Google API key format)
   - [ ] Applied to: Production ✓ Preview ✓ Development ✓

3. **If name is wrong (common mistakes):**
   - ❌ `GOOGLE_MAPS_API_KEY` (missing NEXT_PUBLIC_ prefix)
   - ❌ `NEXT_PUBLIC_GOOGLE_API_KEY` (missing MAPS)
   - ✅ `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (correct!)

---

## 🔍 **STEP 2: CHECK GOOGLE CLOUD CONSOLE**

### **Go to Google Cloud Console:**
https://console.cloud.google.com/google/maps-apis/credentials

### **Find Your API Key:**
Look for the key that matches what's in Vercel (first/last characters).

### **Click on the Key → Check These:**

#### **A. API Restrictions (CRITICAL):**

**Current Setting:**
```
API restrictions: [ Restrict key ]
```

**Must Have Enabled:**
- [ ] ✅ **Maps JavaScript API**
- [ ] ✅ **Places API**
- [ ] ❌ Geocoding API (optional, not needed)

**If Missing:**
1. Click "Edit API key"
2. Scroll to "API restrictions"
3. Select "Restrict key"
4. Check: Maps JavaScript API ✓ Places API ✓
5. Save

---

#### **B. Application Restrictions (CRITICAL):**

**Problem:** If set to "None" or wrong domains, Google rejects requests.

**Check Current Setting:**
```
Application restrictions:
[ ] None (unsafe!)
[ ] HTTP referrers (websites) ← Should be this
[ ] IP addresses
[ ] Android apps
[ ] iOS apps
```

**Must Be Set To: HTTP referrers (websites)**

**Allowed Referrers Must Include:**
```
https://deedpro-frontend-new.vercel.app/*
https://*.vercel.app/*
http://localhost:3000/*
```

**Common Mistakes:**
- ❌ Missing `/*` at end → `https://deedpro-frontend-new.vercel.app` (blocks all subpaths!)
- ❌ Missing wildcard → Can't access on preview deployments
- ❌ Wrong protocol → `http://deedpro...` instead of `https://`
- ❌ Trailing slash → `https://deedpro.../` (sometimes causes issues)

**Correct Format:**
```
https://deedpro-frontend-new.vercel.app/*
https://*.vercel.app/*
http://localhost:3000/*
```

---

#### **C. Key Status:**

**Check:**
- [ ] Status: **Active** (not disabled/deleted)
- [ ] Creation date: Recent (not expired)
- [ ] Usage: Shows recent requests (or 0 if first time)

---

## 🚀 **STEP 3: FIX COMMON ISSUES**

### **Issue A: Domain Not Whitelisted**

**Symptoms:**
```
InvalidKeyMapError
Google Maps JavaScript API error: RefererNotAllowedMapError
```

**Fix:**
1. Edit API key
2. Application restrictions → HTTP referrers
3. Add:
   ```
   https://deedpro-frontend-new.vercel.app/*
   https://*.vercel.app/*
   ```
4. Save
5. **Wait 5 minutes** (Google takes time to propagate changes)

---

### **Issue B: Places API Not Enabled**

**Symptoms:**
```
This API project is not authorized to use this API
```

**Fix:**
1. Go to: https://console.cloud.google.com/apis/library
2. Search: "Places API"
3. Click "Places API"
4. Click "ENABLE"
5. Search: "Maps JavaScript API"
6. Click "Maps JavaScript API"
7. Click "ENABLE" (if not already)
8. Wait 5 minutes

---

### **Issue C: Key in Wrong Format**

**Check Vercel Variable:**
```bash
# Correct format:
AIzaSyD-XXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Wrong formats:
"AIzaSyD-XXXX"  ← Has quotes (remove them!)
AIzaSyD-XXXX    ← Has spaces (remove them!)
```

**Fix:**
1. Copy key from Google Console
2. Paste into Vercel (no quotes, no spaces)
3. Save
4. Redeploy

---

### **Issue D: Deployment Didn't Pick Up Variable**

**Even if key is set, deployment might be using OLD build.**

**Fix:**
1. Go to: https://vercel.com/easydeed/deedpro-frontend-new
2. Click "Deployments"
3. Find latest deployment
4. Click "..." (three dots) → "Redeploy"
5. Wait 2-3 minutes
6. Test again

---

## 🧪 **STEP 4: TEST THE KEY**

### **Quick Test (Before Redeploying):**

1. **Open Browser Console** (F12)
2. **Run this:**
   ```javascript
   // Replace YOUR_API_KEY with actual key from Vercel
   const script = document.createElement('script');
   script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places`;
   script.onload = () => console.log('✅ Google Maps loaded!');
   script.onerror = () => console.error('❌ Failed to load Google Maps');
   document.head.appendChild(script);
   ```

3. **Check Console:**
   - ✅ "Google Maps loaded!" → Key works!
   - ❌ "InvalidKeyMapError" → Key issue (follow fixes above)
   - ❌ "RefererNotAllowedMapError" → Domain restriction issue

---

## 📊 **STEP 5: VERIFY IN PRODUCTION**

After fixes + redeploy:

1. **Open Production:**
   ```
   https://deedpro-frontend-new.vercel.app/create-deed/grant-deed
   ```

2. **Open DevTools Console (F12)**

3. **Look For:**
   - ✅ NO "InvalidKeyMapError"
   - ✅ NO "RefererNotAllowedMapError"
   - ⚠️ Deprecation warnings (acceptable - old API still works)

4. **Test PropertySearch:**
   - Type an address
   - Autocomplete suggestions should appear
   - Click suggestion
   - Property should load

---

## 🎯 **MOST LIKELY ISSUE**

Based on your symptoms, **99% sure** it's one of these:

### **#1: Missing `/*` in Domain Restriction** (Most Common)
```
❌ Wrong: https://deedpro-frontend-new.vercel.app
✅ Right: https://deedpro-frontend-new.vercel.app/*
```

### **#2: Places API Not Enabled**
- Go to: https://console.cloud.google.com/apis/library
- Enable: "Places API" + "Maps JavaScript API"

### **#3: Stale Deployment**
- Redeploy after setting/fixing key
- Wait 2-3 minutes for Vercel to rebuild

---

## 🔧 **EMERGENCY FIX: Create New Key**

If nothing works, **create a fresh key:**

1. **Go to:**
   https://console.cloud.google.com/google/maps-apis/credentials

2. **Click:** "Create Credentials" → "API key"

3. **Immediately Restrict It:**
   - Application restrictions: **HTTP referrers**
   - Add:
     ```
     https://deedpro-frontend-new.vercel.app/*
     https://*.vercel.app/*
     http://localhost:3000/*
     ```
   
   - API restrictions: **Restrict key**
   - Enable:
     - Maps JavaScript API ✓
     - Places API ✓

4. **Copy New Key**

5. **Update Vercel:**
   - Replace old key with new key
   - Save

6. **Redeploy**

7. **Test**

---

## ✅ **SUCCESS CRITERIA**

After fixes, you should see:

### **In DevTools Console:**
```javascript
✅ [Google Maps] API loaded successfully
⚠️ Google Maps JavaScript API warning: AutocompleteService is deprecated...
   (This warning is OK - old API still works)
```

### **No Errors:**
```
❌ InvalidKeyMapError  ← GONE
❌ RefererNotAllowedMapError  ← GONE
```

### **PropertySearch Works:**
- Type "123 Main" → Suggestions appear
- Click suggestion → Property details load
- Wizard completes → Success!

---

## 📞 **CHECKLIST FOR USER**

**Quick 5-Minute Check:**

1. **Verify Vercel Variable:**
   - [ ] Name: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - [ ] Value: Starts with `AIza...`
   - [ ] No quotes, no spaces

2. **Check Google Console:**
   - [ ] Go to: https://console.cloud.google.com/google/maps-apis/credentials
   - [ ] Click your API key
   - [ ] Application restrictions: HTTP referrers ✓
   - [ ] Allowed referrers include: `https://deedpro-frontend-new.vercel.app/*`
   - [ ] API restrictions: Maps JavaScript API ✓ Places API ✓

3. **Redeploy:**
   - [ ] Vercel → Deployments → Redeploy
   - [ ] Wait 2-3 minutes

4. **Test:**
   - [ ] Open: https://deedpro-frontend-new.vercel.app/create-deed/grant-deed
   - [ ] Check console: No InvalidKeyMapError
   - [ ] Test PropertySearch: Autocomplete works

---

**Generated:** November 2, 2025  
**Status:** 🔴 Key exists but rejected  
**Most Likely Fix:** Add `/*` to domain restrictions  
**Est. Time:** 5 minutes

**LET ME KNOW WHAT YOU SEE IN GOOGLE CONSOLE! 🔍**



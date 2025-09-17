# 🚨 Property Integration Troubleshooting Guide

## ✅ **RESOLVED ISSUES - JANUARY 2025**

### **✅ Major Accomplishments**
- **Google Maps API Deprecation Warnings**: ✅ **FIXED** - Updated to modern loading approach
- **SiteX Two-Step Flow**: ✅ **IMPLEMENTED** - Exact replication of working JavaScript
- **User Selection Interface**: ✅ **DEPLOYED** - Beautiful property selection cards
- **Database Schema Conflicts**: ✅ **RESOLVED** - Dedicated `property_cache_tp` table
- **Production Endpoints**: ✅ **OPERATIONAL** - `/sitex/address-search` and `/sitex/apn-search`

---

## 🆕 **SiteX Two-Step Flow Troubleshooting**

### **Issue: No Property Selection UI Appears**
**Symptoms**: After clicking "Get Property Details", no property selection cards are shown

**Solutions**:
1. Check browser console for JavaScript errors
2. Test with known working address: `1358 5th St. La Verne, CA 91750`
3. Verify SiteX AddressSearch endpoint: `GET /api/property/test/sitex-address-search`
4. Check authentication token in localStorage

### **Issue: Property Cards Show But "Choose" Button Doesn't Work**
**Symptoms**: Property cards display but clicking "Choose" shows errors

**Solutions**:
1. Verify APN and FIPS values are present in property cards
2. Check for 403 Forbidden errors (authentication)
3. Test ApnSearch endpoint directly
4. Refresh page to get new JWT token

### **Issue: JWT Token Expired or Invalid**
**Symptoms**: 
- 401 Unauthorized errors on API calls
- "Authentication expired" error messages
- Property search works initially but fails after some time

**Root Causes**:
- JWT token has expired (typically after 24 hours)
- Token corrupted in localStorage
- Using wrong token key ('token' instead of 'access_token')

**Solutions**:
1. **Immediate Fix**: Refresh the page and log in again
2. **Check Token**: Open browser console and run:
   ```javascript
   console.log('Token:', localStorage.getItem('access_token'));
   ```
3. **Clear Token**: If corrupted, clear it:
   ```javascript
   localStorage.removeItem('access_token');
   ```
4. **Re-authenticate**: Navigate to `/login` page

**Prevention**:
- Implement automatic token renewal (see JWT Authentication Guide)
- Monitor token expiration time
- Add token validation before API calls

### **Issue: Authentication Token Key Mismatch**
**Symptoms**: 
- API calls return 401 even after fresh login
- Token appears to exist but doesn't work

**Root Cause**: Using incorrect localStorage key name

**Solutions**:
1. **Verify Key Usage**: Ensure all components use `access_token`:
   ```javascript
   // ✅ CORRECT
   const token = localStorage.getItem('access_token');
   
   // ❌ WRONG
   const token = localStorage.getItem('token');
   ```

2. **Check All Components**: Search codebase for localStorage.getItem usage
3. **Update Components**: Replace incorrect key names with 'access_token'

---

## 🔍 Legacy Issues (Now Resolved)

### **Symptoms**
- No autocomplete suggestions appear when typing addresses
- Console still shows deprecation warnings about `AutocompleteService`
- Property search field behaves like a regular text input

### **Root Cause Analysis**
The backend integration is working (dependencies installed, database migrated), but the frontend component may not have deployed properly or there's a caching issue.

---

## 🛠️ Step-by-Step Resolution

### **Step 1: Resolve DB schema conflict**

1. We saw: `Error creating tables: column "address" does not exist` at startup.
2. Cause: two different historical definitions of `property_cache`.
3. Fix: created `property_cache_tp` for TitlePoint caching and updated API to use it.
4. Verify in Render logs that startup no longer shows the error, or run:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name ILIKE 'property_cache%';
   ```

### **Step 2: Verify Frontend Deployment**

1. **Check Vercel Dashboard**:
   - Go to https://vercel.com/dashboard
   - Find your DeedPro frontend project
   - Check if latest deployment is "Ready"
   - Look for any build errors

2. **Expected Status**: ✅ Ready (green)

### **Step 2: Clear Browser Cache**

**CRITICAL**: Old JavaScript may be cached

1. **Hard Refresh**:
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Clear Cache**:
   - Open Developer Tools (F12)
   - Right-click refresh button → "Empty Cache and Hard Reload"

3. **Incognito Mode**:
   - Test in a private/incognito browser window

### **Step 3: Check Console Errors**

1. **Open Developer Tools** (F12)
2. **Go to Console tab**
3. **Look for**:
   ```
   Failed to load Google Maps
   Google API key not configured
   initMap is not defined
   ```

### **Step 4: Verify Google Maps Loading**

1. **Check Network Tab** (Developer Tools):
   - Look for requests to `maps.googleapis.com`
   - Should see: `maps/api/js?key=AIzaSy...&libraries=places`

2. **Check Console for**:
   ```
   Google Places service not configured
   Failed to load Google Maps script
   ```

---

## 🔧 Potential Fixes

### **Fix 1: Force Vercel Redeploy**

If frontend hasn't updated properly:

1. **Trigger Manual Deploy**:
   ```bash
   git commit --allow-empty -m "Force Vercel redeploy for property integration"
   git push origin main
   ```

2. **Wait for Vercel deployment** (2-3 minutes)

### **Fix 2: Verify Environment Variables**

1. **Check Vercel Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Verify: `NEXT_PUBLIC_GOOGLE_API_KEY=AIzaSyASuhhj8IP59d0tYOCn4AiLYDn_i_siE-Y`

2. **If missing**: Add the environment variable and redeploy

### **Fix 3: Check Google Cloud Console**

1. **Verify API Key**:
   - Go to Google Cloud Console
   - APIs & Services → Credentials
   - Find API key: `AIzaSyASuhhj8IP59d0tYOCn4AiLYDn_i_siE-Y`

2. **Check Restrictions**:
   - Ensure "Places API" is enabled
   - Check domain restrictions allow your site
   - Verify quotas aren't exceeded

### **Fix 4: Component Loading Issues**

### **Fix 5: TitlePoint LV returns empty**
1. Ensure county is normalized (strip “County”, title-case): e.g., `Los Angeles`.
2. Include FIPS when available (e.g., `06037`).
3. Try Tax flow with a known-good APN to confirm credentials and county access.
4. Confirm TitlePoint serviceType access for your org (TitlePoint.Geo.LegalVesting, TitlePoint.Geo.Tax).
5. Check Render logs for CreateService response body; adjust parameters per fail-proof guide.

If Google Maps isn't initializing:

1. **Check for conflicts**:
   - Other Google Maps scripts loading
   - Multiple API key references
   - Callback function conflicts

2. **Verify component import**:
   - PropertySearch component imported correctly
   - No TypeScript errors
   - React component rendering

---

## 📊 Diagnostic Commands

### **Backend Verification**
Run in Render shell:
```bash
# Check if property endpoints are loaded
curl http://localhost:10000/api/property/validate -H "Content-Type: application/json"

# Should return: "Method Not Allowed" (not 404)
```

### **Frontend Verification**
In browser console:
```javascript
// Check if Google Maps is loaded
console.log(window.google);

// Check if API key is available
console.log(process.env.NEXT_PUBLIC_GOOGLE_API_KEY);
```

---

## 🎯 Step-by-Step Resolution Plan

### **Immediate Actions**

1. **Force Vercel Redeploy**:
   ```bash
   git commit --allow-empty -m "🔄 Force redeploy: Activate property integration frontend"
   git push origin main
   ```

2. **Clear All Caches**:
   - Browser hard refresh
   - Test in incognito mode
   - Clear Vercel cache if needed

3. **Verify Environment Variables**:
   - Confirm `NEXT_PUBLIC_GOOGLE_API_KEY` in Vercel
   - Check Google Cloud Console settings

4. **Test Systematically**:
   - Check console for errors
   - Verify network requests
   - Test component loading

### **If Still Not Working**

1. **Check Component File**:
   - Verify PropertySearch.tsx deployed correctly
   - Check for import/export issues
   - Ensure component is being used in create-deed page

2. **Fallback Options**:
   - Temporary manual property entry
   - Alternative address validation
   - Progressive enhancement approach

---

## 📋 Success Criteria

### **Working Property Integration**:
- ✅ Type address → Google Places suggestions appear
- ✅ Select suggestion → Form auto-populates
- ✅ No console errors or deprecation warnings
- ✅ Backend APIs respond correctly
- ✅ Database caching functions

### **Expected User Experience**:
1. **Type**: "123 Main St, Los Angeles"
2. **See**: Dropdown with address suggestions
3. **Select**: Address from dropdown
4. **Result**: Form fields auto-populate with property data

---

## 🚨 Emergency Fallback

If property integration is blocking core functionality:

1. **Temporarily disable property component**:
   - Revert to basic text input
   - Maintain core deed creation functionality
   - Re-enable after fixing issues

2. **Graceful degradation**:
   - Manual address entry still works
   - Core deed generation unaffected
   - Property features as enhancement only

---

**Current Status**: ✅ **RESOLVED**  
**Priority**: 🟢 **COMPLETED** - All issues fixed  
**Impact**: Property integration fully functional  
**Result**: Google Places autocomplete working perfectly

---

## ✅ **RESOLUTION SUMMARY - JANUARY 2025**

### **Issues Resolved:**
1. ✅ **Google Maps API Error**: Enabled Maps JavaScript API in Google Cloud
2. ✅ **JavaScript Property Errors**: Fixed undefined property_address references  
3. ✅ **Status Message Display**: Added proper handling for success/partial messages
4. ✅ **Auto-dismiss Functionality**: Notifications automatically disappear after 4-5 seconds
5. ✅ **Error Boundaries**: Comprehensive safety checks prevent crashes

### **Current Functionality:**
- ✅ **Google Places Autocomplete**: Working with real-time suggestions
- ✅ **Property Validation**: Backend API endpoints operational  
- ✅ **Data Enrichment**: SiteX and TitlePoint integration active
- ✅ **Form Auto-Population**: Property data fills deed wizard automatically
- ✅ **User Experience**: Smooth, professional interface with visual feedback
- ✅ **Error Handling**: Graceful fallbacks and informative messages

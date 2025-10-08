# ✅ Phase 6-1 Testing Checklist

**Date**: October 9, 2025  
**Deployments**: 
- ✅ Frontend (Vercel): LIVE
- ✅ Backend (Render): LIVE

---

## 🧪 **TESTING INSTRUCTIONS**

### **STEP 1: Login** ✅

1. Go to: https://deedpro-frontend-new.vercel.app
2. Login with your test account
3. Verify: No console errors

---

### **STEP 2: Dashboard - Real Stats** ✅

**What to test**: Dashboard shows REAL deed counts (not hardcoded "12")

**Steps**:
```
1. Click: "Dashboard" in sidebar
2. Look at: "Total Deeds" stat card
3. Look at: "In Progress" stat card
```

**✅ PASS if**:
- Shows your actual deed count (or "0" if none)
- NOT showing "12" or "3" (old hardcoded values)

**❌ FAIL if**:
- Shows "—" (dash)
- Shows "12" or "3" (hardcoded)
- Console errors about /deeds/summary

**Expected**:
- Real numbers from your database
- Matches your actual deed count

---

### **STEP 3: Past Deeds - Real Data** ✅

**What to test**: Past Deeds page shows YOUR actual deeds (not fake ones)

**Steps**:
```
1. Click: "Past Deeds" in sidebar
2. Look at: Table contents
```

**✅ PASS if**:
- Shows your actual deeds from wizard
- OR shows "No deeds yet" with link to create one
- Loading spinner appears briefly
- No fake addresses (Main St, Oak Ave, Pine Rd, Elm St)

**❌ FAIL if**:
- Still shows 4 hardcoded fake deeds:
  - "123 Main St, Los Angeles"
  - "456 Oak Ave, Beverly Hills"
  - "789 Pine Rd, Santa Monica"
  - "321 Elm St, Pasadena"
- Console errors about /deeds endpoint

**Expected**:
- Real deed data from your database
- OR empty state if you have no deeds

---

### **STEP 4: Shared Deeds - Real Data** ✅

**What to test**: Shared Deeds page shows real shares (not fake ones)

**Steps**:
```
1. Click: "Shared Deeds" in sidebar
2. Look at: Table contents
3. Try: "Remind" button (if any shares exist)
4. Try: "Revoke" button (if any shares exist)
```

**✅ PASS if**:
- Shows your actual shared deeds
- OR shows "No shared deeds yet" message
- Buttons make API calls (check Network tab)
- No fake emails (john@titlecompany.com, sarah@lenderbank.com, etc.)

**❌ FAIL if**:
- Still shows 5 hardcoded fake shares
- Console errors about /shared-deeds endpoint
- Buttons don't work

**Expected**:
- Real shared deed data
- OR empty state if no shares

---

### **STEP 5: Sidebar - Feature Flags** ✅

**What to test**: Incomplete features are HIDDEN

**Steps**:
```
1. Look at: Sidebar menu
2. Check for: Team, Voice, Security menu items
```

**✅ PASS if**:
- "Team" menu item is HIDDEN
- "Voice" menu item is HIDDEN
- "Security" menu item is HIDDEN
- You still see: Dashboard, Create Deed, Past Deeds, Shared Deeds

**❌ FAIL if**:
- Team/Voice/Security are still visible
- Sidebar looks exactly the same as before

**Expected**:
- Clean sidebar with only working features
- Team/Voice/Security hidden

---

### **STEP 6: Console Errors** ✅

**What to test**: No new errors introduced

**Steps**:
```
1. Open: Browser DevTools (F12)
2. Click: "Console" tab
3. Navigate: Dashboard → Past Deeds → Shared Deeds
```

**✅ PASS if**:
- No red errors about API calls
- No 404 errors
- No 401/403 auth errors (we fixed this in Phase 5-Prequal C)

**❌ FAIL if**:
- Console shows errors about:
  - /deeds/summary
  - /deeds
  - /shared-deeds
  - Authentication failures

**Expected**:
- Clean console (maybe warnings, but no errors)

---

### **STEP 7: Network Tab Validation** 🔍

**What to test**: API calls are working correctly

**Steps**:
```
1. Open: Browser DevTools (F12)
2. Click: "Network" tab
3. Refresh: Dashboard page
4. Look for: Request to /deeds/summary
```

**✅ PASS if**:
- GET /deeds/summary returns 200 OK
- Response contains: {total, completed, in_progress, month}
- GET /deeds returns 200 OK
- GET /shared-deeds returns 200 OK

**❌ FAIL if**:
- 404 Not Found (endpoint missing)
- 500 Internal Server Error (backend bug)
- 401 Unauthorized (auth issue)

**Expected**:
- All API calls return 200
- Real data in responses

---

## 🎯 **OVERALL SUCCESS CRITERIA**

Phase 6-1 is successful if ALL of these are true:

```
✅ Dashboard shows real deed counts (not "12")
✅ Past Deeds shows real data (not fake addresses)
✅ Shared Deeds shows real data (not fake emails)
✅ Sidebar hides Team/Voice/Security
✅ No console errors
✅ All API calls return 200 OK
```

---

## ❌ **COMMON ISSUES & FIXES**

### **Issue**: Dashboard shows "—" instead of numbers

**Cause**: Backend `/deeds/summary` endpoint not deployed or failing  
**Fix**: 
1. Check Render logs for errors
2. Verify endpoint exists: https://deedpro-main-api.onrender.com/deeds/summary
3. Check auth token is being sent

---

### **Issue**: Past Deeds still shows fake data

**Cause**: Frontend not redeployed or browser cache  
**Fix**: 
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Check Vercel deployment status
3. Clear browser cache

---

### **Issue**: 401 Unauthorized errors

**Cause**: Auth token not being passed (should be fixed from Phase 5-Prequal C)  
**Fix**: 
1. Logout and login again
2. Check localStorage has 'access_token'
3. Verify API proxy routes forward Authorization header

---

### **Issue**: Sidebar still shows Team/Voice/Security

**Cause**: Feature flags not set or frontend cache  
**Fix**: 
1. Hard refresh browser
2. Feature flags default to "false" (hidden), so this should work
3. Only visible if you manually set NEXT_PUBLIC_ENABLE_TEAM=true

---

## 📸 **BEFORE/AFTER COMPARISON**

### **Dashboard Stats**
- **Before**: "12" Total Deeds, "3" In Progress (hardcoded)
- **After**: Real numbers from your database

### **Past Deeds**
- **Before**: 4 fake deeds (Main St, Oak Ave, Pine Rd, Elm St)
- **After**: Your actual deeds or "No deeds yet"

### **Shared Deeds**
- **Before**: 5 fake shares (john@title, sarah@lender, etc.)
- **After**: Your actual shares or "No shared deeds yet"

### **Sidebar**
- **Before**: Shows all menu items including incomplete features
- **After**: Only shows working features (Team/Voice/Security hidden)

---

## 🎉 **NEXT STEPS AFTER TESTING**

### **If ALL tests pass** ✅:
1. Update PROJECT_STATUS.md → Mark Phase 6-1 as COMPLETE
2. Celebrate! 🎉
3. Plan Phase 6-2 (Admin Dashboard)

### **If ANY tests fail** ❌:
1. Document the failure with screenshots
2. Share console errors
3. Check Network tab for failed requests
4. Debug and fix

---

**Ready to test!** 🚀

Start with Dashboard → Past Deeds → Shared Deeds → Sidebar



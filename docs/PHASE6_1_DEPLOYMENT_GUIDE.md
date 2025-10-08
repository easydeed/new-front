# 🚀 Phase 6-1 Deployment Guide

**Status**: Ready for deployment  
**Branch**: `feat/phase6-1`  
**Commits**: 4 commits ready to push

---

## ✅ **COMPLETED WORK**

### **Frontend Patches Applied** (4/4)
```
✅ Past Deeds API Integration
   File: frontend/src/app/past-deeds/page.tsx
   - Removed hardcoded data
   - Connected to GET /deeds
   - Added loading/error states

✅ Shared Deeds API Integration
   File: frontend/src/app/shared-deeds/page.tsx
   - Connected to GET /shared-deeds
   - Resend/Revoke actions working
   - Real-time refresh after actions

✅ Dashboard Stats (Real Data)
   File: frontend/src/app/dashboard/page.tsx
   - Connected to GET /deeds/summary
   - Fallback to /deeds if summary not available
   - Real counts displayed

✅ Sidebar Feature Flags
   File: frontend/src/components/Sidebar.tsx
   - Team/Voice/Security hidden by default
   - Feature flags: ENABLE_TEAM, ENABLE_VOICE, ENABLE_SECURITY
```

### **Backend Patches Applied** (1/1 critical)
```
✅ Deeds Summary Endpoint
   File: backend/main.py
   - New endpoint: GET /deeds/summary
   - Returns: total, completed, in_progress, month
   - Uses real DB queries
```

---

## 🎯 **NEXT STEPS: DEPLOYMENT**

### **STEP 1: Push to GitHub** ✅ READY

```bash
git push origin feat/phase6-1
```

**What this triggers**:
- ❌ GitHub Actions (not configured yet - no secrets)
- The branch will be available for manual deployment

---

### **STEP 2: Configure GitHub Secrets** (MANUAL - User Required)

The Release Train workflow needs these secrets configured in GitHub:

**Go to**: `https://github.com/YOUR_ORG/new-front/settings/secrets/actions`

**Required Secrets**:
```
VERCEL_TOKEN=<your-vercel-token>
VERCEL_ORG_ID=<your-vercel-org-id>
VERCEL_PROJECT_ID=<your-frontend-project-id>
API_DEPLOY_CMD=<command-to-deploy-backend>  # e.g., "render deploy"
FRONTEND_BASE_URL_STAGING=https://deedpro-frontend-new-staging.vercel.app
API_BASE_URL_STAGING=https://deedpro-api-staging.onrender.com
FRONTEND_BASE_URL_PROD=https://deedpro-frontend-new.vercel.app
API_BASE_URL_PROD=https://deedpro-main-api.onrender.com
```

**Note**: If these secrets are not configured, the Release Train workflow will fail. You can deploy manually instead (see below).

---

### **STEP 3A: Automated Deployment** (If GitHub Actions Configured)

Once secrets are configured:
1. Push triggers staging deployment
2. Playwright smoke tests run automatically
3. If tests pass, production deployment can be triggered

**Monitor**: `https://github.com/YOUR_ORG/new-front/actions`

---

### **STEP 3B: Manual Deployment** (Recommended for Now)

**Backend Deployment**:
```bash
# Option 1: Via Render Dashboard
1. Go to https://dashboard.render.com
2. Select: deedpro-main-api
3. Click: "Manual Deploy" → "Deploy latest commit"
4. Select branch: feat/phase6-1
5. Wait for deployment (~2 minutes)

# Option 2: Via Render CLI
render deploy --service deedpro-main-api --branch feat/phase6-1
```

**Frontend Deployment**:
```bash
# Option 1: Via Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Select: deedpro-frontend-new
3. Click: "Deployments" → "Deploy"
4. Select branch: feat/phase6-1
5. Wait for deployment (~1 minute)

# Option 2: Via Vercel CLI
vercel --prod --yes
```

---

## 🧪 **STEP 4: Manual Testing**

After deployment, test these key flows:

### **Dashboard Stats** ✅
```
1. Login to https://deedpro-frontend-new.vercel.app
2. Go to Dashboard
3. Verify: "Total Deeds" shows real number (not "12")
4. Verify: "In Progress" shows real number (not "3")
```

### **Past Deeds** ✅
```
1. Go to "Past Deeds" page
2. Verify: Shows your actual deeds (not hardcoded ones)
3. Verify: Loading state appears briefly
4. If no deeds: Should show "No deeds yet" with CTA
```

### **Shared Deeds** ✅
```
1. Go to "Shared Deeds" page
2. Verify: Shows actual shared deeds (not hardcoded)
3. Test: "Remind" button (should call API)
4. Test: "Revoke" button (should call API)
```

### **Sidebar** ✅
```
1. Check sidebar
2. Verify: Team/Voice/Security are HIDDEN (feature flags default to false)
3. To enable: Set env vars in Vercel:
   NEXT_PUBLIC_ENABLE_TEAM=true
   NEXT_PUBLIC_ENABLE_VOICE=true
   NEXT_PUBLIC_ENABLE_SECURITY=true
```

---

## 📊 **Expected Results**

### **Dashboard**
- **Before**: Hardcoded "12 Total Deeds", "3 In Progress"
- **After**: Real counts from your database

### **Past Deeds**
- **Before**: 4 hardcoded deeds (Main St, Oak Ave, Pine Rd, Elm St)
- **After**: Your actual deeds from database, or empty state

### **Shared Deeds**
- **Before**: 5 hardcoded shares
- **After**: Your actual shared deeds, or empty state

---

## ❌ **Troubleshooting**

### **Dashboard shows "—" instead of numbers**
**Cause**: `/deeds/summary` endpoint not deployed or returning error  
**Fix**: Check backend logs, verify endpoint exists

### **Past Deeds shows old hardcoded data**
**Cause**: Frontend not redeployed, or caching issue  
**Fix**: Hard refresh (Ctrl+Shift+R), check Vercel deployment

### **401 Unauthorized errors**
**Cause**: Auth token not being passed correctly  
**Fix**: Already fixed in Phase 5-Prequal C, should work fine

---

## 🎉 **SUCCESS CRITERIA**

Phase 6-1 is successful when:
- ✅ Dashboard shows real deed counts
- ✅ Past Deeds shows real data (or empty state)
- ✅ Shared Deeds shows real data (or empty state)
- ✅ Sidebar hides incomplete features
- ✅ No console errors related to API calls

---

## 📝 **Post-Deployment**

After successful deployment:
1. Update PROJECT_STATUS.md with deployment times
2. Create Phase 6-2 plan for admin features
3. Celebrate wizard-first integration! 🎉

---

**Ready to deploy!** 🚀


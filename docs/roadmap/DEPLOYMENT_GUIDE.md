# 🚀 Deployment Guide - DeedPro Platform
**Production Deployment Procedures & Best Practices**

---

## 📋 **TABLE OF CONTENTS**

1. [Deployment Overview](#deployment-overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
4. [Backend Deployment (Render)](#backend-deployment-render)
5. [Feature Flag Strategy](#feature-flag-strategy)
6. [Monitoring & Validation](#monitoring--validation)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 **DEPLOYMENT OVERVIEW**

### **Architecture**

```
Frontend (Vercel)              Backend (Render)
├─ Next.js App                 ├─ FastAPI App
├─ Auto-deploy from main       ├─ Auto-deploy from main
├─ ~2 min build time           ├─ ~5 min build time
└─ Instant rollback            └─ Manual rollback

Connected via:
  - REST API calls
  - JWT authentication
  - CORS configuration
```

### **Deployment Triggers**

**Vercel (Frontend)**:
- ✅ **Automatic**: On push to `main` branch
- ✅ **Manual**: Via Vercel dashboard
- ⏱️ **Build Time**: ~2 minutes
- 🔄 **Rollback**: Instant (select previous deployment)

**Render (Backend)**:
- ✅ **Automatic**: On push to `main` branch
- ✅ **Manual**: Via Render dashboard  
- ⏱️ **Build Time**: ~5 minutes
- 🔄 **Rollback**: Manual (select previous deployment or git revert)

---

## ✅ **PRE-DEPLOYMENT CHECKLIST**

### **Code Quality** (Must be GREEN)

```bash
# 1. All tests passing
cd frontend && npm run test              # Frontend unit tests
cd backend && pytest                     # Backend unit tests
cd frontend && npx cypress run           # E2E tests

# 2. No linter errors
cd frontend && npm run lint              # ESLint
cd backend && flake8 .                   # Python linter

# 3. TypeScript type check
cd frontend && npx tsc --noEmit          # Type checking
```

### **Documentation** (Must be COMPLETE)

- [ ] All code changes documented
- [ ] API changes reflected in `docs/backend/ROUTES.md`
- [ ] Architecture changes in `docs/wizard/ARCHITECTURE.md`
- [ ] Update `docs/roadmap/PROJECT_STATUS.md` with new status
- [ ] Changelog entry added (if applicable)

### **Environment Variables** (Must be CONFIGURED)

**Vercel (Frontend)**:
```bash
# Check in Vercel dashboard → Settings → Environment Variables
NEXT_PUBLIC_API_URL=https://deedpro-main-api.onrender.com
NEXT_PUBLIC_DYNAMIC_WIZARD=false         # Start disabled
NEXT_PUBLIC_GOOGLE_PLACES_ENABLED=true
NEXT_PUBLIC_TITLEPOINT_ENABLED=true
```

**Render (Backend)**:
```bash
# Check in Render dashboard → Environment
DATABASE_URL=postgresql://...
SECRET_KEY=<secure-key>
GOOGLE_PLACES_API_KEY=<api-key>
TITLEPOINT_API_KEY=<api-key>
TITLEPOINT_USERNAME=<username>
TITLEPOINT_PASSWORD=<password>
```

### **Monitoring** (Must be ACTIVE)

- [ ] Vercel analytics enabled
- [ ] Render health checks configured
- [ ] Error tracking active (Sentry/similar)
- [ ] Performance monitoring enabled
- [ ] Logging infrastructure ready

### **Rollback Plan** (Must be READY)

- [ ] Previous deployment IDs documented
- [ ] Rollback procedure tested
- [ ] Team notified of deployment window
- [ ] Communication plan for failures

---

## 🌐 **FRONTEND DEPLOYMENT (VERCEL)**

### **Automatic Deployment**

**Trigger**: Push to `main` branch

```bash
# 1. Commit changes
git add .
git commit -m "feat: your feature description"

# 2. Push to main
git push origin main

# 3. Vercel auto-deploys
# Monitor: https://vercel.com/your-project/deployments
```

**Build Process**:
```
1. Vercel detects push to main
2. Installs dependencies (npm install)
3. Runs build (npm run build)
4. Deploys to production
5. Updates production URL
```

**Time**: ~2 minutes

### **Manual Deployment**

**Via Vercel Dashboard**:
1. Go to https://vercel.com/your-project
2. Click "Deployments"
3. Find the commit you want to deploy
4. Click "..." menu → "Redeploy"

**Via Vercel CLI**:
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel --prod
```

### **Environment Variables**

**To Update**:
1. Go to Vercel Dashboard
2. Settings → Environment Variables
3. Add/Edit variables
4. **Important**: Redeploy after changes!

**Critical Variables**:
```bash
# API Connection
NEXT_PUBLIC_API_URL=https://deedpro-main-api.onrender.com

# Feature Flags
NEXT_PUBLIC_DYNAMIC_WIZARD=false          # Toggle wizard
NEXT_PUBLIC_GOOGLE_PLACES_ENABLED=true    # Toggle Google Places
NEXT_PUBLIC_TITLEPOINT_ENABLED=true       # Toggle TitlePoint

# Analytics (optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### **Verification Steps**

After deployment:

```bash
# 1. Check deployment status
# Vercel Dashboard → Deployments → Should show "Ready"

# 2. Verify site loads
curl -I https://deedpro-frontend-new.vercel.app
# Should return: HTTP/2 200

# 3. Check health
curl https://deedpro-frontend-new.vercel.app/api/health
# Should return: {"status":"ok"}

# 4. Test key pages
curl https://deedpro-frontend-new.vercel.app/login
curl https://deedpro-frontend-new.vercel.app/create-deed

# 5. Manual verification
# Open in browser and test critical flows
```

---

## ⚙️ **BACKEND DEPLOYMENT (RENDER)**

### **Automatic Deployment**

**Trigger**: Push to `main` branch

```bash
# 1. Commit backend changes
git add backend/
git commit -m "feat(backend): your feature description"

# 2. Push to main
git push origin main

# 3. Render auto-deploys
# Monitor: https://dashboard.render.com/
```

**Build Process**:
```
1. Render detects push to main
2. Installs dependencies (pip install -r requirements.txt)
3. Runs database migrations (if configured)
4. Starts FastAPI server (uvicorn main:app)
5. Performs health check
6. Switches traffic to new version
```

**Time**: ~5 minutes

### **Manual Deployment**

**Via Render Dashboard**:
1. Go to https://dashboard.render.com/
2. Select your service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Or select specific commit to deploy

### **Environment Variables**

**To Update**:
1. Go to Render Dashboard
2. Select service → Environment
3. Add/Edit variables
4. Click "Save Changes"
5. **Important**: Service will restart!

**Critical Variables**:
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Security
SECRET_KEY=<256-bit-secret>           # For JWT signing
ALLOWED_ORIGINS=https://deedpro-frontend-new.vercel.app

# External APIs
GOOGLE_PLACES_API_KEY=<key>
TITLEPOINT_API_KEY=<key>
TITLEPOINT_USERNAME=<username>
TITLEPOINT_PASSWORD=<password>
TITLEPOINT_WSDL_URL=<url>

# Feature Flags (optional)
DYNAMIC_WIZARD_ENABLED=false
PDF_GENERATION_TIMEOUT=30
```

### **Health Checks**

**Render Health Check Configuration**:
```yaml
# render.yaml
services:
  - name: deedpro-backend
    healthCheckPath: /health
    plan: starter
```

**Endpoint**: `https://deedpro-main-api.onrender.com/health`

**Expected Response**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-10-01T12:00:00Z"
}
```

### **Verification Steps**

After deployment:

```bash
# 1. Check health endpoint
curl https://deedpro-main-api.onrender.com/health
# Should return: {"status":"healthy"}

# 2. Test authentication
curl -X POST https://deedpro-main-api.onrender.com/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@deedpro-check.com","password":"TestPassword123!"}'
# Should return: {"access_token":"..."}

# 3. Test API endpoints
curl https://deedpro-main-api.onrender.com/api/doc-types
# Should return: {"grant_deed":{...}}

# 4. Test PDF generation (authenticated)
# Use Postman or test script with valid JWT

# 5. Check logs
# Render Dashboard → Logs → Look for errors
```

---

## 🚩 **FEATURE FLAG STRATEGY**

### **Why Feature Flags?**

- ✅ **Gradual rollout**: Enable for 10% → 50% → 100% of users
- ✅ **Quick disable**: Turn off if bugs found
- ✅ **A/B testing**: Compare old vs new wizard
- ✅ **Zero downtime**: Toggle without redeployment

### **Available Feature Flags**

| Flag | Location | Purpose | Default |
|------|----------|---------|---------|
| `NEXT_PUBLIC_DYNAMIC_WIZARD` | Frontend | Enable dynamic wizard | `false` |
| `NEXT_PUBLIC_GOOGLE_PLACES_ENABLED` | Frontend | Enable Google Places API | `true` |
| `NEXT_PUBLIC_TITLEPOINT_ENABLED` | Frontend | Enable TitlePoint integration | `true` |
| `DYNAMIC_WIZARD_ENABLED` | Backend | Enable dynamic wizard backend | `false` |

### **Deployment Strategy**

**Phase 5 Rollout Plan**:

```yaml
Stage 1: Dark Launch (0% users)
  - Deploy to production
  - Feature flags: ALL DISABLED
  - Test with test accounts only
  - Duration: 24 hours
  - Success: No errors, performance OK

Stage 2: Canary (10% users)
  - Enable NEXT_PUBLIC_DYNAMIC_WIZARD=true
  - Monitor closely
  - Duration: 24 hours
  - Success: <1% error rate, good feedback

Stage 3: Gradual Rollout (50% users)
  - Keep monitoring
  - Duration: 48 hours
  - Success: Stable performance

Stage 4: Full Rollout (100% users)
  - All feature flags enabled
  - Duration: 72 hours
  - Success: <0.5% error rate

Stage 5: Cleanup
  - Remove old code paths
  - Update documentation
  - Archive old wizard
```

### **How to Toggle Flags**

**Frontend (Vercel)**:
1. Vercel Dashboard → Settings → Environment Variables
2. Change `NEXT_PUBLIC_DYNAMIC_WIZARD` from `false` to `true`
3. Redeploy (or wait for next deployment)

**Backend (Render)**:
1. Render Dashboard → Environment
2. Change `DYNAMIC_WIZARD_ENABLED` from `false` to `true`
3. Save (service restarts automatically)

**No Code Changes Required!**

---

## 📊 **MONITORING & VALIDATION**

### **What to Monitor**

**Immediately After Deployment** (First Hour):
- ✅ Deployment status (Vercel/Render dashboards)
- ✅ Health check endpoints responding
- ✅ Error rates (should be <1%)
- ✅ Response times (should be <2s)
- ✅ User logins (should succeed)
- ✅ PDF generation (should work)

**24-Hour Burn-In**:
- ✅ Error rates remain low
- ✅ No memory leaks (check Render metrics)
- ✅ No database issues
- ✅ Performance stable
- ✅ No user complaints

### **Key Metrics**

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Error Rate | <0.5% | >2% |
| API Response Time | <2s | >5s |
| PDF Generation Time | <3s | >10s |
| Uptime | 99.9% | <99% |
| Memory Usage | <80% | >90% |

### **Where to Check**

**Vercel**:
- Dashboard → Analytics → Performance
- Dashboard → Deployments → Logs
- Dashboard → Analytics → Web Vitals

**Render**:
- Dashboard → Metrics → CPU/Memory
- Dashboard → Logs → Application Logs
- Dashboard → Events → Deployment History

**Application Logs**:
```bash
# Vercel logs (via CLI)
vercel logs

# Render logs (dashboard)
# Render Dashboard → Logs → Real-time view
```

---

## 🔄 **ROLLBACK PROCEDURES**

### **When to Rollback**

🚨 **Immediate Rollback** if:
- Critical errors affecting >5% of users
- Complete service outage
- Data corruption or loss
- Security vulnerability discovered
- Payment processing failures

⚠️ **Consider Rollback** if:
- Error rate >2% for >15 minutes
- Performance degradation >50%
- Key features broken
- Multiple user complaints

### **Frontend Rollback (Vercel)**

**Method 1: Instant Rollback via Dashboard**
1. Vercel Dashboard → Deployments
2. Find last known good deployment
3. Click "..." menu → "Promote to Production"
4. Confirm

**Time**: ~30 seconds (instant)

**Method 2: Git Revert**
```bash
# 1. Identify bad commit
git log --oneline

# 2. Revert
git revert <commit-hash>

# 3. Push
git push origin main

# 4. Vercel auto-deploys good version
```

**Time**: ~2 minutes (includes build)

### **Backend Rollback (Render)**

**Method 1: Rollback to Previous Deploy**
1. Render Dashboard → Select service
2. Events tab → Find last good deployment
3. Click "..." → "Rollback to this deploy"
4. Confirm

**Time**: ~30 seconds

**Method 2: Git Revert**
```bash
# 1. Identify bad commit
git log --oneline -- backend/

# 2. Revert
git revert <commit-hash>

# 3. Push
git push origin main

# 4. Render auto-deploys good version
```

**Time**: ~5 minutes (includes build)

### **Database Rollback**

⚠️ **WARNING**: Database rollbacks are risky!

**If database migration failed**:
```bash
# Connect to database
psql $DATABASE_URL

# Check migration status
SELECT * FROM alembic_version;

# Downgrade one version
alembic downgrade -1

# Or: Manual SQL rollback
# Run your prepared rollback script
```

**Best Practice**: Always have rollback SQL scripts prepared before migrations.

### **Post-Rollback Actions**

After rolling back:

1. **Communicate**:
   - Notify team of rollback
   - Update status page if applicable
   - Document incident

2. **Investigate**:
   - Review logs for root cause
   - Check error tracking (Sentry)
   - Identify what went wrong

3. **Document**:
   - Create incident report
   - Update docs with lessons learned
   - Plan fix for next deployment

4. **Fix & Redeploy**:
   - Fix the issue
   - Test thoroughly
   - Deploy again following this guide

---

## 🐛 **TROUBLESHOOTING**

### **Deployment Failures**

**Problem**: Vercel build fails

**Common Causes**:
- Missing dependencies in package.json
- TypeScript errors
- Environment variables missing
- Build script errors

**Solution**:
```bash
# Test build locally
cd frontend
npm run build

# Check logs in Vercel dashboard
# Fix errors and redeploy
```

---

**Problem**: Render build fails

**Common Causes**:
- Missing dependencies in requirements.txt
- Python version mismatch
- Database connection issues
- Environment variables missing

**Solution**:
```bash
# Test build locally
cd backend
pip install -r requirements.txt
python -m uvicorn main:app

# Check logs in Render dashboard
# Fix errors and redeploy
```

---

### **Runtime Errors**

**Problem**: 502 Bad Gateway on frontend

**Cause**: Backend is down or unreachable

**Solution**:
1. Check backend health: `curl https://deedpro-main-api.onrender.com/health`
2. Check Render service status
3. Check CORS configuration
4. Check environment variable `NEXT_PUBLIC_API_URL`

---

**Problem**: 500 Internal Server Error on backend

**Cause**: Application error

**Solution**:
1. Check Render logs for error traceback
2. Check database connectivity
3. Check environment variables
4. Check external API status (Google, TitlePoint)

---

### **Performance Issues**

**Problem**: Slow response times

**Solution**:
1. Check Render metrics (CPU/Memory)
2. Check database query performance
3. Check external API latency
4. Consider scaling up Render plan
5. Add caching if needed

---

## 📚 **REFERENCE**

### **Important URLs**

- **Frontend Production**: https://deedpro-frontend-new.vercel.app
- **Backend Production**: https://deedpro-main-api.onrender.com
- **Vercel Dashboard**: https://vercel.com/your-project
- **Render Dashboard**: https://dashboard.render.com/

### **Configuration Files**

- `render.yaml` - Render service configuration
- `frontend/vercel.json` - Vercel configuration
- `frontend/next.config.js` - Next.js configuration
- `backend/main.py` - FastAPI app entry point

### **Related Documentation**

- **[WIZARD_REBUILD_PLAN.md](./WIZARD_REBUILD_PLAN.md)** - Phase 5 deployment requirements
- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** - Current deployment status
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Pre-deployment testing
- **[DEPLOYMENT_MONITORING.md](./DEPLOYMENT_MONITORING.md)** - Monitoring strategy

---

## ✅ **DEPLOYMENT CHECKLIST**

Use this before every production deployment:

### **Pre-Deployment**
- [ ] All tests passing (frontend + backend + E2E)
- [ ] No linter errors
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] Monitoring active
- [ ] Rollback plan ready
- [ ] Team notified

### **Deployment**
- [ ] Code pushed to `main`
- [ ] Vercel build succeeded
- [ ] Render build succeeded
- [ ] Health checks passing
- [ ] Manual smoke test passed

### **Post-Deployment**
- [ ] Monitor for 1 hour (no critical errors)
- [ ] Check key metrics (error rate, response time)
- [ ] Test critical flows manually
- [ ] Document deployment in PROJECT_STATUS.md
- [ ] Team notified of success

### **24-Hour Burn-In**
- [ ] Error rates remain low (<1%)
- [ ] Performance stable (<2s API, <3s PDF)
- [ ] No memory leaks
- [ ] No user complaints
- [ ] Ready for feature flag rollout

---

**Questions?** Contact DevOps team or see `docs/ONBOARDING_NEW_AGENTS.md`.

---

**Last Updated**: October 1, 2025  
**Maintained By**: DevOps Team


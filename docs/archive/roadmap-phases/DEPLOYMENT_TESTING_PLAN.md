# Deployment Testing Plan - Phase-by-Phase Production Readiness

This document outlines the critical deployment testing requirements for each phase of the Wizard Rebuild Plan, focusing on Vercel (frontend) and Render (backend) auto-deployment validation.

## 🚨 **CRITICAL DEPLOYMENT GAPS IDENTIFIED**

### **Missing Configuration Files**
- ❌ **No `vercel.json`** in frontend directory (auto-deployment may fail)
- ❌ **Missing environment variables** in Render configuration
- ❌ **No deployment health checks** configured
- ❌ **Missing feature flag configuration** for staged rollouts

### **Auto-Deployment Risks**
- 🔥 **Phase 3 backend changes** will auto-deploy with authentication requirements
- 🔥 **Frontend may break** without proper environment variable setup
- 🔥 **No rollback mechanism** configured for failed deployments
- 🔥 **Missing smoke tests** in deployment pipeline

---

## Phase 1 - Foundation & Linting ✅ (COMPLETED)

### Deployment Requirements
- **Render**: No backend changes, safe to deploy
- **Vercel**: Linting fixes only, safe to deploy
- **Risk Level**: 🟢 **LOW** - No functional changes

### ✅ **Already Deployed Successfully**
- All linting fixes are backward compatible
- No breaking changes to existing functionality
- Auto-deployment should work without issues

---

## Phase 2 - Integrations Enablement ✅ (COMPLETED)

### Deployment Requirements

#### **Vercel Frontend**
```bash
# REQUIRED Environment Variables (MISSING!)
NEXT_PUBLIC_DYNAMIC_WIZARD=false
NEXT_PUBLIC_GOOGLE_PLACES_ENABLED=false  
NEXT_PUBLIC_TITLEPOINT_ENABLED=false
NEXT_PUBLIC_API_URL=https://deedpro-main-api.onrender.com
```

#### **Render Backend**
- **Risk Level**: 🟡 **MEDIUM** - Feature flags control new functionality
- **Current Status**: ⚠️ **NEEDS TESTING** - Auto-deployed but not validated

### 🧪 **Required Tests**
```bash
# Frontend Build Test
cd frontend
npm run build  # Must succeed with missing env vars

# Backend Health Check
curl https://deedpro-main-api.onrender.com/health
curl https://deedpro-main-api.onrender.com/api/property/search -X POST
```

---

## Phase 3 - Backend Services & Routes ⚠️ (NEEDS IMMEDIATE TESTING)

### **🚨 HIGH RISK DEPLOYMENT**

#### **Critical Changes That Auto-Deployed**
1. **Grant Deed Route**: Now requires authentication (`get_current_user_id`)
2. **AI Assist**: Enhanced with timeout handling and new endpoints
3. **New Dependencies**: `asyncio`, enhanced logging, validation

#### **Render Backend - CRITICAL ISSUES**
```yaml
# render.yaml MISSING REQUIRED ENV VARS:
envVars:
  - key: DYNAMIC_WIZARD_ENABLED
    value: "false"  # CRITICAL: Must be false initially
  - key: TEMPLATE_VALIDATION_STRICT  
    value: "true"
  - key: PDF_GENERATION_TIMEOUT
    value: "30"
  - key: AI_ASSIST_TIMEOUT
    value: "15"
  - key: TITLEPOINT_TIMEOUT
    value: "10"
  - key: MAX_CONCURRENT_REQUESTS
    value: "5"
```

#### **Vercel Frontend**
- **Risk Level**: 🟡 **MEDIUM** - Should work with feature flags off
- **Dependencies**: Must handle backend API changes gracefully

### 🧪 **URGENT Tests Required**
```bash
# 1. Backend Route Health Check
curl https://deedpro-main-api.onrender.com/api/generate/grant-deed-ca -X POST \
  -H "Content-Type: application/json" \
  -d '{"grantors_text":"Test","grantees_text":"Test","legal_description":"Test","county":"Test"}'
# Expected: 401/403 (auth required) or 422 (validation error)

# 2. AI Assist Endpoint
curl https://deedpro-main-api.onrender.com/api/ai/assist -X POST \
  -H "Content-Type: application/json" \
  -d '{"docType":"grant_deed","type":"vesting"}'
# Expected: 401/403 (auth required)

# 3. Multi-Document Endpoint (NEW)
curl https://deedpro-main-api.onrender.com/api/ai/multi-document -X POST
# Expected: 401/403 (auth required)
```

---

## Phase 4 - Quality Assurance & Hardening (UPCOMING)

### Deployment Requirements

#### **Render Backend**
```yaml
# Additional QA instrumentation
envVars:
  - key: BACKEND_LOGGING_LEVEL
    value: "DEBUG"  # For QA testing
  - key: ENABLE_QA_INSTRUMENTATION
    value: "true"
```

#### **Vercel Frontend**
```bash
# QA Environment Variables
NEXT_PUBLIC_QA_MODE=true
NEXT_PUBLIC_ENABLE_CYPRESS_HOOKS=true
NEXT_PUBLIC_ACCESSIBILITY_TESTING=true
```

### 🧪 **Required Tests**
- **Unit Tests**: `pytest` with 90%+ backend coverage
- **Integration Tests**: Contract tests with fault injection
- **Cypress E2E**: Full regression with accessibility checks
- **Performance**: Lighthouse score ≥ 90

---

## Phase 5 - Deployment & Rollout (FINAL)

### Deployment Requirements

#### **Feature Flag Activation Sequence**
```bash
# Step 1: Backend (Render)
DYNAMIC_WIZARD_ENABLED=true

# Step 2: Frontend (Vercel) - Staged Rollout
NEXT_PUBLIC_DYNAMIC_WIZARD=true  # 10% → 50% → 100%
NEXT_PUBLIC_GOOGLE_PLACES_ENABLED=true
NEXT_PUBLIC_TITLEPOINT_ENABLED=true
```

### 🧪 **Production Validation**
- **Smoke Tests**: Core wizard flow end-to-end
- **Performance**: API latency < 5s, PDF generation < 3s
- **Monitoring**: Real-time error rates, user funnels
- **Rollback**: 30-minute checkpoint for immediate rollback

---

## 🚨 **IMMEDIATE ACTION REQUIRED**

### **1. Fix Render Configuration**
```yaml
# Update render.yaml with Phase 3 environment variables
services:
- type: web
  name: deedpro-main-api
  env: python
  plan: free
  repo: https://github.com/easydeed/new-front
  branch: main
  rootDir: backend
  buildCommand: pip install -r requirements.txt
  startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
  envVars:
  - key: DATABASE_URL
    fromDatabase:
      name: deedpro-db
  - key: ALLOWED_ORIGINS
    value: https://deedpro-frontend-new.vercel.app
  # PHASE 3 REQUIRED VARIABLES
  - key: DYNAMIC_WIZARD_ENABLED
    value: "false"
  - key: TEMPLATE_VALIDATION_STRICT
    value: "true"
  - key: PDF_GENERATION_TIMEOUT
    value: "30"
  - key: AI_ASSIST_TIMEOUT
    value: "15"
  - key: TITLEPOINT_TIMEOUT
    value: "10"
  - key: MAX_CONCURRENT_REQUESTS
    value: "5"
```

### **2. Create Vercel Configuration**
```json
// frontend/vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm ci",
  "env": {
    "NEXT_PUBLIC_DYNAMIC_WIZARD": "false",
    "NEXT_PUBLIC_GOOGLE_PLACES_ENABLED": "false",
    "NEXT_PUBLIC_TITLEPOINT_ENABLED": "false",
    "NEXT_PUBLIC_API_URL": "https://deedpro-main-api.onrender.com"
  }
}
```

### **3. Add Health Check Endpoints**
```python
# backend/main.py - Add health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "phase": "3",
        "dynamic_wizard_enabled": os.getenv("DYNAMIC_WIZARD_ENABLED", "false"),
        "timestamp": time.time()
    }
```

### **4. Deployment Smoke Tests**
```bash
# Create deployment validation script
#!/bin/bash
echo "🧪 Testing Phase 3 Deployment..."

# Backend Health
curl -f https://deedpro-main-api.onrender.com/health || exit 1

# Frontend Build
cd frontend && npm run build || exit 1

echo "✅ Deployment validation passed"
```

---

## 📊 **Deployment Monitoring Dashboard**

### **Key Metrics to Track**
- **Backend**: Response times, error rates, authentication success
- **Frontend**: Build success, page load times, API call success
- **Integration**: TitlePoint availability, Google Places quota
- **Business**: Deed generation success rate, user conversion

### **Alert Thresholds**
- **Backend Error Rate**: > 5%
- **Frontend Build Failures**: > 0%
- **API Response Time**: > 10s
- **Authentication Failures**: > 10%

---

## 🔄 **Rollback Procedures**

### **Immediate Rollback (< 5 minutes)**
```bash
# 1. Disable feature flags
DYNAMIC_WIZARD_ENABLED=false
NEXT_PUBLIC_DYNAMIC_WIZARD=false

# 2. Redeploy previous version
git revert <commit-hash>
git push origin main  # Triggers auto-deployment
```

### **Full Rollback (< 30 minutes)**
```bash
# 1. Render: Revert to previous image
# 2. Vercel: Redeploy previous build
# 3. Database: Restore snapshot if needed
# 4. Verify: Run smoke tests
```

This deployment testing plan ensures we can safely validate each phase in production while maintaining the ability to quickly rollback if issues arise.

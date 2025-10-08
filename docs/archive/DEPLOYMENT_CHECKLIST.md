# Phase 5 Deployment Checklist

**Per Wizard Rebuild Plan** - Strict adherence to documented deployment procedures

---

## 📋 **PRE-DEPLOYMENT CHECKLIST**

### **1. Code & Documentation** ✅
- [x] Architecture verified (see `docs/roadmap/PHASE_DEBUG_AGENT_REPORT.md`)
- [x] Documentation committed to repository
- [x] Testing tools committed to repository
- [ ] All changes pushed to GitHub
- [ ] Pull request (if applicable) reviewed and approved

### **2. Testing** ⏳
- [x] Unit tests passing (22/22)
- [x] Integration tests passing (18 backend tests)
- [ ] **Cypress regression tests executed** (REQUIRED - see below)
- [ ] Accessibility tests passing
- [ ] Sign-off evidence captured

### **3. Backend (Render)** ✅
- [x] 24-hour burn-in started
- [x] Health endpoint operational
- [x] All Phase 3 routes deployed
- [x] Performance metrics baseline established
- [ ] 24-hour burn-in completed successfully
- [x] Rollback procedure documented

### **4. Frontend (Vercel)** ✅
- [x] Staging deployment operational
- [x] Document selection page verified
- [x] Feature flags configured
- [ ] Feature flag behavior validated
- [ ] Manual staging test completed
- [x] Rollback procedure documented

---

## 🎯 **CRITICAL: CYPRESS TEST EXECUTION**

### **Status**: ⏳ **REQUIRED BEFORE DEPLOYMENT**

**Per Wizard Rebuild Plan Phase 5** (Required Tests section):
> "Cypress/UAT: Production smoke suite (limited set) verifying core scenarios with production feature flags enabled."

### **How to Execute**

#### **Step 1: Start Development Server**
```powershell
# Terminal 1
cd frontend
npm run dev

# Wait for: "ready - started server on 0.0.0.0:3000"
```

#### **Step 2: Run Cypress Tests**
```powershell
# Terminal 2 (from project root)
.\scripts\run-cypress-phase5-tests.ps1

# Or manually:
cd frontend
npx cypress run --spec cypress/e2e/wizard-regression-pack.cy.js
```

#### **Step 3: Review Results**
- Check console output for pass/fail
- Review screenshots: `frontend/cypress/screenshots/`
- Review videos: `frontend/cypress/videos/`
- Verify all 11 test groups pass

#### **Step 4: Capture Sign-Off Evidence**
- Document results in `docs/roadmap/PHASE5_CYPRESS_SIGNOFF_EVIDENCE.md`
- Commit test artifacts (if needed)
- Get stakeholder sign-off

### **Expected Test Groups** (11 total)
1. ✓ Landing Page & Navigation
2. ✓ Dynamic Wizard Flow
3. ✓ Legacy Wizard Fallback
4. ✓ Error Handling & Resilience
5. ✓ Feature Flag Resilience
6. ✓ Mobile & Responsive Testing
7. ✓ PDF Download Verification
8. ✓ Performance & Loading
9. ✓ Form Validation
10. ✓ Loading States
11. ✓ API Failures

---

## 🚀 **DEPLOYMENT WORKFLOW**

### **Per Wizard Rebuild Plan - Phase 5 Deployment Steps**

### **STAGING** (Already Active)

#### **Render (Backend)**
**Per Wizard Rebuild Plan**:
> "Monitor high-priority metrics (latency, error rates, queue depth) for 24h burn-in."

- [x] Final rehearsal using production-like data
- [x] Monitoring started (Hour 2+ of 24)
- [ ] 24-hour burn-in completed
- [ ] Metrics review: latency <1s, error rate 0%, no anomalies

#### **Vercel (Frontend)**
**Per Wizard Rebuild Plan**:
> "Validate feature flag sequencing via LaunchDarkly (or equivalent). Run final Cypress regression and capture sign-off evidence."

- [x] Staging deployment operational
- [ ] Feature flag sequencing validated
- [ ] Final Cypress regression executed
- [ ] Sign-off evidence captured

---

### **PRODUCTION** (After Burn-In & Tests)

#### **Render (Backend)**
**Per Wizard Rebuild Plan**:
> "Deploy final image. Apply outstanding migrations (if any) during low-traffic window. Turn on `DYNAMIC_WIZARD_ENABLED=true` and monitor logs/APM for first-hour anomalies. Set rollback checkpoint at 30 minutes."

**Steps**:
1. [ ] Deploy final image to Render
2. [ ] Verify no outstanding migrations (N/A for this deployment)
3. [ ] Enable `DYNAMIC_WIZARD_ENABLED=true`
4. [ ] Monitor logs/APM for first hour
5. [ ] Set 30-minute rollback checkpoint
6. [ ] Verify all routes operational

**Monitoring Thresholds**:
- Response time: <5s target
- Error rate: <2% acceptable, <1% target
- Uptime: >99.9%

#### **Vercel (Frontend)**
**Per Wizard Rebuild Plan**:
> "Promote release. Enable feature flags incrementally (10% → 50% → 100%) while watching real-time analytics. If metrics regress, toggle flags off and redeploy prior build."

**Steps**:
1. [ ] Promote release to production
2. [ ] **Option A**: Gradual rollout with flags
   - [ ] Enable 10% traffic
   - [ ] Monitor for 1 hour
   - [ ] Scale to 50% traffic
   - [ ] Monitor for 1 hour
   - [ ] Scale to 100% traffic
3. [ ] **Option B**: Full deployment (if flag doesn't control selection)
   - [ ] Deploy to 100%
   - [ ] Monitor closely for first hour
4. [ ] Watch real-time analytics
5. [ ] Monitor user funnels, API errors, business KPIs

**Monitoring Thresholds**:
- User conversion: No >20% drop
- Wizard completion: >80% rate
- Error overlay: <5% users
- Support tickets: No significant increase

---

## 🚨 **ROLLBACK PROCEDURES**

### **Immediate Rollback** (<5 minutes)
**Per Wizard Rebuild Plan**:
> "Ability to toggle flags (`DYNAMIC_WIZARD_ENABLED`, `NEXT_PUBLIC_DYNAMIC_WIZARD`, `NEXT_PUBLIC_TITLEPOINT_ENABLED`) within minutes."

**Triggers**:
- Error rate >5% for >15 minutes
- Response time >2x baseline for >10 minutes
- User conversion drop >20%
- Critical functionality failure

**Steps**:
```powershell
# 1. Toggle feature flags via Vercel dashboard
NEXT_PUBLIC_DYNAMIC_WIZARD=false

# 2. Verify legacy wizard functional
# 3. Monitor error rates return to baseline
```

### **Full Rollback** (<30 minutes)
**Per Wizard Rebuild Plan**:
> "Documented process to redeploy previous Vercel build and Render image."

**Steps**:
```powershell
# 1. Revert Vercel deployment
vercel rollback <previous-deployment-url>

# 2. Revert Render deployment (if needed - unlikely)
# Via Render dashboard: Rollback to previous deployment

# 3. Verify system functionality
# 4. Run smoke tests
# 5. Monitor for 1 hour
```

---

## 📊 **POST-DEPLOYMENT VERIFICATION**

### **Immediate (First Hour)**
- [ ] Backend health check: `https://deedpro-main-api.onrender.com/health`
- [ ] Doc types endpoint: `https://deedpro-main-api.onrender.com/api/doc-types`
- [ ] Frontend loads: Visit production URL
- [ ] Document selection page displays
- [ ] User can complete wizard flow
- [ ] PDF generation works
- [ ] No console errors
- [ ] Monitoring shows healthy metrics

### **24-Hour Validation**
- [ ] Error rates stable (<2%)
- [ ] Response times within baseline
- [ ] User conversion rates maintained
- [ ] No increase in support tickets
- [ ] Business KPIs stable or improved

### **7-Day Success Metrics**
- [ ] System stability: >99.9% uptime
- [ ] User satisfaction: No negative feedback spike
- [ ] Performance: Maintained or improved
- [ ] Architecture: No new deviations detected

---

## 🎯 **GO/NO-GO DECISION**

### **GO Criteria** (All must be met)
- [ ] ✅ Architecture verified (COMPLETE)
- [ ] ✅ 24-hour burn-in successful
- [ ] **⏳ Cypress tests passing** (REQUIRED)
- [ ] Feature flags validated
- [ ] Rollback procedures tested
- [ ] Team briefed on deployment plan
- [ ] Stakeholder approval obtained

### **NO-GO Criteria** (Any triggers NO-GO)
- ❌ Cypress tests failing
- ❌ Backend burn-in failures
- ❌ Critical bugs discovered
- ❌ Architectural deviation detected
- ❌ Missing rollback procedures
- ❌ Insufficient monitoring

---

## 📝 **SIGN-OFF SECTION**

### **Technical Sign-Off**
- [ ] **Developer**: Architecture verified, code reviewed
- [ ] **QA Lead**: Tests passed, sign-off evidence captured
- [ ] **DevOps**: Deployment procedures ready, monitoring configured
- [ ] **Security**: No security issues identified

### **Management Sign-Off**
- [ ] **Product Manager**: Features approved for deployment
- [ ] **Project Manager**: Timeline and risk assessment approved
- [ ] **Technical Lead**: Final go/no-go decision

### **Deployment Authorization**
- [ ] **Authorized By**: ___________________
- [ ] **Date**: ___________________
- [ ] **Time**: ___________________
- [ ] **Deployment Window**: ___________________

---

## 🔗 **REFERENCE DOCUMENTS**

### **Master Plan**
- **[Wizard Rebuild Plan](docs/roadmap/WIZARD_REBUILD_PLAN.md)** - Master deployment plan for all phases

### **Phase 5 Specific**
- **[Phase 5 Architecture-Aligned Deployment](docs/roadmap/PHASE5_ARCHITECTURE_ALIGNED_DEPLOYMENT.md)** - Detailed deployment guide
- **[Phase 5 Production Readiness Report](docs/roadmap/PHASE5_PRODUCTION_READINESS_REPORT.md)** - Go/no-go assessment
- **[Phase 5 Cypress Sign-Off Evidence](docs/roadmap/PHASE5_CYPRESS_SIGNOFF_EVIDENCE.md)** - Test results

### **Architecture**
- **[Dynamic Wizard Architecture](docs/wizard/ARCHITECTURE.md)** - Design specification
- **[Phase 4 Architecture Verification](docs/roadmap/PHASE4_ARCHITECTURE_VERIFICATION.md)** - Verification audit
- **[Debug Agent Report](docs/roadmap/PHASE_DEBUG_AGENT_REPORT.md)** - Executive summary

### **Navigation**
- **[Phase 4/5 Index](docs/roadmap/PHASE4_PHASE5_INDEX.md)** - Complete documentation hub

---

## 📞 **CONTACTS**

### **During Deployment**
- **Technical Lead**: Available for go/no-go decisions
- **DevOps**: Monitoring dashboards and alerts
- **On-Call**: Ready for rollback if needed

### **Post-Deployment**
- **Support Team**: Monitoring user feedback
- **Development Team**: Available for hotfixes if needed
- **Management**: Briefed on deployment status

---

**Current Status**: ⏳ **PENDING CYPRESS TEST EXECUTION**  
**Next Action**: **Run Cypress tests → Review results → Deploy**  
**Estimated Deployment**: After 24h burn-in + test completion

---

*This checklist follows the Wizard Rebuild Plan Phase 5 deployment procedures with strict architectural adherence.*


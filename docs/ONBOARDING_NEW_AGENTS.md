# 🚀 New Agent Onboarding Guide
**DeedPro AI-Powered Legal Document Platform**

---

## 👋 **Welcome!**

This guide will get you up to speed on the DeedPro platform in **30 minutes**. Follow this reading order exactly.

---

## 📖 **READING ORDER** (30 minutes)

### **Phase 1: Understand the "Why"** (5 minutes)
**Purpose**: Learn what problems we're solving and why this rebuild matters.

1. **[README.md](../README.md)** - Project overview and quick start
2. **[wizard-catastrophes.md](./wizard-catastrophes.md)** - Critical failures that drove the rebuild
   - Legal compliance issues
   - UX disasters
   - Why we can't skip steps

**Key Takeaway**: We're rebuilding because the old system had critical legal and UX flaws. Compliance is non-negotiable.

---

### **Phase 2: Learn the Architecture** (10 minutes)
**Purpose**: Understand how the system is designed to work.

3. **[wizard/ARCHITECTURE.md](./wizard/ARCHITECTURE.md)** - Dynamic Wizard Architecture
   - Document selection → Wizard flow
   - Metadata-driven rendering
   - Centralized state management
   - Backend integration map

4. **[backend/ROUTES.md](./backend/ROUTES.md)** - Backend API structure
   - FastAPI routers and endpoints
   - Authentication requirements
   - Known gaps and fallbacks

**Key Takeaway**: We use a **metadata-driven dynamic wizard** that fetches document types from the backend. The frontend renders based on backend configuration.

---

### **Phase 3: Understand the Plan** (10 minutes)
**Purpose**: Learn the phased rebuild strategy and current status.

5. **[roadmap/WIZARD_REBUILD_PLAN.md](./roadmap/WIZARD_REBUILD_PLAN.md)** - Master rebuild plan
   - 5-phase approach
   - Exit criteria for each phase
   - Rollback checkpoints
   - Deployment strategy

6. **[roadmap/PROJECT_STATUS.md](./roadmap/PROJECT_STATUS.md)** - Current status
   - What's complete
   - What's in progress
   - What's blocked
   - Next milestones

**Key Takeaway**: We're following a **5-phase plan** with clear objectives, tests, and rollback points. Never deviate from the plan without documentation.

---

### **Phase 4: Know the Tools** (5 minutes)
**Purpose**: Learn where to find tools, scripts, and references.

7. **[DOCS_INDEX.md](./DOCS_INDEX.md)** - Master documentation index
   - All documentation organized by topic
   - Quick reference for common tasks
   - Tool locations

8. **[roadmap/TESTING_GUIDE.md](./roadmap/TESTING_GUIDE.md)** - Testing approach
   - Cypress E2E tests
   - Manual testing procedures
   - Authentication testing

**Key Takeaway**: All tools are documented. Check the index before creating new scripts or documents.

---

## 🎯 **YOUR FIRST TASKS**

After reading the above, you should:

### **1. Verify Your Understanding** (5 minutes)
Can you answer these questions?
- ✅ Why was the wizard rebuilt?
- ✅ What is the Dynamic Wizard Architecture?
- ✅ What are the 5 phases of the rebuild?
- ✅ Where is the backend API documented?
- ✅ What's the current project status?

### **2. Check Current Phase** (2 minutes)
- Read **[roadmap/PROJECT_STATUS.md](./roadmap/PROJECT_STATUS.md)**
- Identify current phase and blockers
- Review your assigned tasks

### **3. Set Up Your Environment** (15 minutes)
```bash
# Clone repository (if not done)
git clone https://github.com/easydeed/new-front.git
cd new-front

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies (Python 3.11+)
cd ../backend
pip install -r requirements.txt

# Copy environment files
cp env.example .env
cd ../frontend
cp env.example .env.local

# Configure environment variables
# See README.md for required values
```

### **4. Run Local Development** (5 minutes)
```bash
# Terminal 1 - Backend
cd backend
uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev

# Visit http://localhost:3000
```

### **5. Run Tests** (5 minutes)
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm run test

# Cypress E2E tests (requires dev server running)
npm run cypress:open
```

---

## 📚 **ROLE-SPECIFIC GUIDES**

### **If You're a Developer** 👨‍💻
**Additional Reading**:
- `docs/wizard/ARCHITECTURE.md` - Deep dive into wizard design
- `docs/backend/ROUTES.md` - All API endpoints
- `docs/roadmap/PHASE3_BACKEND_SERVICES_LOG.md` - Backend implementation details
- `frontend/README.md` - Frontend architecture and components

**Key Files to Know**:
- `backend/models/doc_types.py` - Document registry
- `frontend/src/app/create-deed/page.tsx` - Document selection
- `frontend/src/app/create-deed/dynamic-wizard.tsx` - Wizard renderer
- `backend/api/generate.py` - PDF generation endpoint

### **If You're QA/Testing** 🧪
**Additional Reading**:
- `docs/roadmap/TESTING_GUIDE.md` - Testing strategy
- `docs/roadmap/CYPRESS_AUTH_SOLUTION.md` - Cypress authentication
- `docs/resilience/DEGRADED_SERVICES_PLAYBOOK.md` - Error handling

**Key Tools**:
- `scripts/test-architecture-simple.ps1` - Architecture verification
- `scripts/phase5-feature-flag-validation.ps1` - Feature flag testing
- `frontend/cypress/e2e/wizard-regression-pack.cy.js` - E2E tests

### **If You're DevOps/Deployment** 🚀
**Additional Reading**:
- `docs/roadmap/DEPLOYMENT_GUIDE.md` - Deployment procedures
- `docs/roadmap/DEPLOYMENT_MONITORING.md` - Monitoring strategy
- `docs/resilience/DEGRADED_SERVICES_PLAYBOOK.md` - Incident response

**Key Files**:
- `render.yaml` - Backend deployment config
- `frontend/vercel.json` - Frontend deployment config
- `scripts/staging-deployment.ps1` - Staging deployment script

### **If You're a PM/Architect** 📋
**Additional Reading**:
- `docs/roadmap/WIZARD_REBUILD_PLAN.md` - Full project plan
- `docs/roadmap/PROJECT_STATUS.md` - Current status
- `docs/wizard/ARCHITECTURE.md` - System design
- `docs/roadmap/PHASE_DEBUG_AGENT_REPORT.md` - Recent findings

**Key Responsibilities**:
- Keep `PROJECT_STATUS.md` updated
- Review all architecture changes
- Enforce adherence to Wizard Rebuild Plan

---

## 🚨 **CRITICAL RULES**

### **DO**
✅ **Always** read the Wizard Rebuild Plan before making changes  
✅ **Always** update documentation when you change code  
✅ **Always** run tests before committing  
✅ **Always** follow the phased approach  
✅ **Always** check PROJECT_STATUS.md for current phase  

### **DON'T**
❌ **Never** bypass authentication in production code  
❌ **Never** deviate from the architecture without documentation  
❌ **Never** skip wizard steps (legal compliance)  
❌ **Never** commit without testing  
❌ **Never** deploy without following the deployment checklist  

---

## 🆘 **NEED HELP?**

### **Common Questions**

**Q: Where do I start coding?**  
A: Check `docs/roadmap/PROJECT_STATUS.md` for current phase and assigned tasks.

**Q: Where's the document registry?**  
A: `backend/models/doc_types.py` - This is the single source of truth for document types.

**Q: How do I add a new document type?**  
A: See `docs/wizard/ARCHITECTURE.md` section "Adding New Document Types"

**Q: Tests are failing, what do I do?**  
A: Check `docs/roadmap/TESTING_GUIDE.md` troubleshooting section.

**Q: Where are the deployment procedures?**  
A: `docs/roadmap/DEPLOYMENT_GUIDE.md` - Follow it exactly.

**Q: What's the rollback procedure?**  
A: Each phase in `WIZARD_REBUILD_PLAN.md` has rollback steps. Also see `DEPLOYMENT_GUIDE.md`.

### **Documentation Not Clear?**

If something is unclear or missing:
1. Check `docs/DOCS_INDEX.md` for all available docs
2. Search the `docs/archive/` folder for historical context
3. Ask the team and **update the docs** with the answer

---

## ✅ **ONBOARDING CHECKLIST**

Track your onboarding progress:

- [ ] Read all Phase 1 documents (Why)
- [ ] Read all Phase 2 documents (Architecture)
- [ ] Read all Phase 3 documents (Plan)
- [ ] Read all Phase 4 documents (Tools)
- [ ] Set up development environment
- [ ] Run backend locally
- [ ] Run frontend locally
- [ ] Run all tests successfully
- [ ] Read role-specific guides
- [ ] Review current PROJECT_STATUS.md
- [ ] Identify your first task
- [ ] Understand critical rules

**Time to Complete**: ~1 hour (including setup)

---

## 🎓 **YOU'RE READY!**

Once you've completed the checklist above, you're ready to contribute. Remember:

1. **Always check PROJECT_STATUS.md first**
2. **Follow the Wizard Rebuild Plan**
3. **Test everything**
4. **Document your changes**
5. **Ask questions**

**Welcome to the team!** 🎉

---

**Last Updated**: October 1, 2025  
**Maintained By**: Architecture Team


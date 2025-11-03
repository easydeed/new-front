# 👋 **Welcome to DeedPro!**

**Last Updated**: November 3, 2025  
**New Team Member?** You're in the right place! This guide will get you productive in 30 minutes.

---

## 🚀 **5-MINUTE QUICKSTART**

###  **1. What is DeedPro?**

DeedPro is an AI-enhanced real estate deed generation platform:
- **Frontend**: Next.js 15 + React + TypeScript + Tailwind CSS + V0 (AI-generated UI)
- **Backend**: Python FastAPI + PostgreSQL + External API Service
- **PDF Generation**: Weasyprint + Jinja2 templates
- **APIs**: Google Places (address search), SiteX (property enrichment), Stripe (billing)
- **5 Deed Types**: Grant, Quitclaim, Interspousal Transfer, Warranty, Tax
- **Enterprise API**: External deed generation for partners (API keys, webhooks, S3 storage)

---

### 2. **Clone & Setup** (15 minutes)

```bash
# Clone repository
git clone https://github.com/easydeed/new-front.git
cd new-front

# Frontend setup
cd frontend
npm install
cp env.example .env.local
# Edit .env.local with your API keys
npm run dev
# Frontend runs at http://localhost:3000

# Backend setup (new terminal)
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp env.example .env
# Edit .env with your database credentials
python main.py
# Backend runs at http://localhost:8000
```

**Access the app**: http://localhost:3000

---

### 3. **Read Key Documentation** (10 minutes)

1. 📊 **[PROJECT_STATUS.md](PROJECT_STATUS.md)** → Current system state (Phase 24-E in production!)
2. 🚀 **[BREAKTHROUGHS.md](BREAKTHROUGHS.md)** → Recent discoveries
3. 🗺️ **[docs/backend/ROUTES.md](docs/backend/ROUTES.md)** → Backend API endpoints
4. 🎨 **[v0-prompts/phase-24f-wizard-main-ui-redesign.md](v0-prompts/phase-24f-wizard-main-ui-redesign.md)** → Next V0 UI enhancement
5. 📚 **[docs/V0_INTEGRATION_LESSONS_LEARNED.md](docs/V0_INTEGRATION_LESSONS_LEARNED.md)** → V0 CSS isolation lessons
6. 📁 **[docs/archive/phase24/](docs/archive/phase24/)** → Phase 24 historical documentation

---

## 🏗️ **SYSTEM ARCHITECTURE** (Must Understand!)

### **Two Wizard Modes:**

#### **Modern Wizard** 🆕 (Recommended)
- **URL**: `/create-deed/{deed-type}?mode=modern`
- **Flow**: Dynamic AI-driven prompts → SmartReview → Finalize → Preview page
- **Features**: Flexible, question-based, modern UX
- **Tech**: `promptFlows`, canonical adapters, `finalizeDeed`
- **When**: Default for new deeds

#### **Classic Wizard** 🏛️ (Legacy)
- **URL**: `/create-deed/{deed-type}` (no mode param)
- **Flow**: 5-step wizard → Generate PDF → Finalize → Auto-redirect
- **Features**: Traditional step-by-step, all deed types
- **Tech**: Context builders, manual form steps
- **When**: Power users who prefer step-by-step

**Key Difference**: Modern = flexible prompts, Classic = fixed steps

---

### **Data Flow:**

```
User Searches Address
    ↓
Google Places API → Get placeId
    ↓
SiteX API → Property Enrichment
    ↓
Frontend Hydration → Prefill form fields
    ↓
User Completes Wizard
    ↓
Canonical Adapter (Modern) / Context Builder (Classic)
    ↓
Backend /api/deeds/create → Save to PostgreSQL
    ↓
PDF Generation → Jinja2 + Weasyprint
    ↓
Download PDF + Redirect to Dashboard
```

---

### **Tech Stack:**

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 15 (App Router) | React framework with SSR |
| **UI** | React + TypeScript + Tailwind | Component library |
| **State** | Zustand + localStorage | Wizard state management |
| **Backend** | FastAPI (Python) | REST API server |
| **Database** | PostgreSQL (Render) | User data, deed records |
| **PDF Engine** | Weasyprint + Jinja2 | PDF generation from HTML |
| **APIs** | Google Places, SiteX, Stripe | Address search, property data, payments |
| **Deployment** | Vercel (frontend), Render (backend) | Production hosting |

---

## 🎓 **KEY CONCEPTS TO KNOW**

### **1. Canonical Adapters**
Maps UI state → backend schema. Every deed type needs one.

**Location**: `frontend/src/utils/canonicalAdapters/{deedType}.ts`

**Example**:
```typescript
export function toCanonical(state: any) {
  return {
    deedType: 'grant-deed',
    property: {
      address: state.propertyAddress,
      apn: state.apn,
      county: state.county,
      legalDescription: state.legalDescription,
    },
    parties: {
      grantor: { name: state.grantorName },
      grantee: { name: state.granteeName },
    },
  };
}
```

**Why**: Decouples UI structure from backend requirements

---

### **2. SiteX Hydration**
Automatically fills property fields from SiteX API response.

**Key Fields** (CRITICAL - Updated Oct 2025):
- **Legal Description**: `LegalDescriptionInfo.LegalBriefDescription` (NOT `LegalDescription`!)
- **County**: `CountyName` or `SiteCountyName` (NOT `County`!)
- **Owner**: `OwnerInformation.OwnerFullName`
- **APN**: `PropertyAddress.APNFormatted`

**Files**:
- Backend: `backend/api/property_endpoints.py`
- Modern: `frontend/src/features/wizard/mode/bridge/PropertyStepBridge.tsx`
- Classic: `frontend/src/features/wizard/services/propertyPrefill.ts`

**Why**: Saves users from manual data entry

---

### **3. Session Management**
Wizard state persists in `localStorage`, cleared after finalization.

**Keys**:
- Modern: `WIZARD_DRAFT_KEY_MODERN` = `'deedWizardDraft_modern'`
- Classic: `WIZARD_DRAFT_KEY_CLASSIC` = `'deedWizardDraft_classic'`

**Location**: `frontend/src/features/wizard/mode/bridge/persistenceKeys.ts`

**Critical**: Always clear the correct key after deed finalization!

---

### **4. docType Formats**
Three formats used interchangeably (must support ALL):

```typescript
// Canonical (from URL param)
'quitclaim'

// Snake case (internal)
'quitclaim_deed'

// Hyphenated (backend expects)
'quitclaim-deed'
```

**Why**: Different parts of system evolved independently

---

### **5. PDF Generation Pipeline**

```
User Data
  ↓
Context Builder (Classic) / Canonical Adapter (Modern)
  ↓
Backend Pydantic Model Validation
  ↓
Jinja2 Template Rendering
  ↓
Weasyprint HTML → PDF
  ↓
Return PDF bytes
```

**Critical Files**:
- Models: `backend/models/{deed}_deed.py`
- Templates: `templates/{deed}_ca/index.jinja2`
- Endpoints: `backend/routers/deeds_extra.py`

---

## 🚨 **COMMON PITFALLS (Learn from our mistakes!)**

### ❌ **DON'T: Assume SiteX Field Names**
```python
# WRONG
profile.get('County')  # This field doesn't exist!
profile.get('LegalDescription')  # This is nested!

# CORRECT
profile.get('CountyName')
profile.get('LegalDescriptionInfo', {}).get('LegalBriefDescription')
```

---

### ❌ **DON'T: Use Strict Pydantic Validators**
```python
# WRONG - Causes 500 errors
@validator('county')
def county_required(cls, v):
    if not v:
        raise ValueError('County is required')

# CORRECT - Allow blanks, PDF template handles it
@validator('county')
def county_optional(cls, v):
    return v or ''
```

---

### ❌ **DON'T: Merge State in Classic Wizard**
```typescript
// WRONG - Preserves old data
setGrantDeed((prev) => ({
  ...prev,  // ← Keeps old junk!
  step4: freshData
}));

// CORRECT - Replace entirely
setGrantDeed({
  step2: {},
  step3: {},
  step4: freshData
});
```

---

### ❌ **DON'T: Forget to Pass `now()` to Jinja**
```python
# WRONG - Template will fail with 'now is undefined'
template.render(ctx)

# CORRECT - Pass datetime functions
ctx['now'] = datetime.now
ctx['datetime'] = datetime
template.render(ctx)
```

---

## 📚 **ESSENTIAL DOCUMENTATION**

### **Start Here:**
1. 📊 **[PROJECT_STATUS.md](PROJECT_STATUS.md)** → Current system state, rollback plan
2. 🚀 **[BREAKTHROUGHS.md](BREAKTHROUGHS.md)** → 14 critical discoveries from Phase 16-20
3. 🏗️ **[docs/wizard/ARCHITECTURE.md](docs/wizard/ARCHITECTURE.md)** → Modern vs Classic wizards
4. 🗺️ **[docs/backend/ROUTES.md](docs/backend/ROUTES.md)** → All API endpoints
5. 🔍 **[docs/wizard/SITEX_FIELD_MAPPING.md](docs/wizard/SITEX_FIELD_MAPPING.md)** → Property enrichment

### **When You Need To:**
- **Add a new deed type**: [docs/wizard/ADDING_NEW_DEED_TYPES.md](docs/wizard/ADDING_NEW_DEED_TYPES.md)
- **Understand PDF generation**: [docs/backend/PDF_GENERATION_SYSTEM.md](docs/backend/PDF_GENERATION_SYSTEM.md)
- **Debug SiteX issues**: [docs/wizard/SITEX_FIELD_MAPPING.md](docs/wizard/SITEX_FIELD_MAPPING.md)
- **Handle degraded services**: [docs/resilience/DEGRADED_SERVICES_PLAYBOOK.md](docs/resilience/DEGRADED_SERVICES_PLAYBOOK.md)

### **Reference:**
- **All docs**: [docs/DOCS_INDEX.md](docs/DOCS_INDEX.md)
- **Onboarding guide**: [docs/ONBOARDING_NEW_AGENTS.md](docs/ONBOARDING_NEW_AGENTS.md)
- **Project roadmap**: [docs/roadmap/](docs/roadmap/)

---

## 🎯 **CURRENT SYSTEM STATUS**

**Last Updated**: October 30, 2025  
**Current Phase**: Phase 20 (UX Flow Analysis) ✅  
**System Status**: **PRODUCTION-READY** 🟢

### **What's Working:**
✅ **5 Deed Types**: Grant, Quitclaim, Interspousal Transfer, Warranty, Tax  
✅ **Two Wizard Modes**: Modern (dynamic prompts) + Classic (step-by-step)  
✅ **SiteX Integration**: Full property enrichment (county, legal desc, owner)  
✅ **PDF Generation**: All deed types generate correctly  
✅ **Session Management**: Proper localStorage clearing  
✅ **Partners Integration**: Dropdown working correctly  
✅ **Auth System**: JWT with roles, password reset, email verification  

### **Recent Completions** (Last 2 Weeks):
- ✅ **Phase 16**: Partners API & Legal Description fixes
- ✅ **Phase 17-18**: Multi-deed type support (Quitclaim, Interspousal, etc.)
- ✅ **Phase 19**: Classic Wizard complete overhaul (10 hotfixes + forensic session)
- ✅ **Phase 20**: Modern Wizard county hydration verification

### **Known Issues:**
- ⏳ **UX Flow Inconsistency**: Modern vs Classic have different finalization flows (pending standardization)

**Full Status**: [PROJECT_STATUS.md](PROJECT_STATUS.md)

---

## 🛠️ **YOUR FIRST TASK (30 minutes)**

### **Goal**: Generate a Grant Deed locally

1. ✅ **Setup environment** (see above)
2. ✅ **Start frontend & backend**
3. ✅ **Create account** at http://localhost:3000/signup
4. ✅ **Search property**: "1358 5th St, La Verne, CA 91750"
5. ✅ **Complete Modern Wizard**:
   - Answer prompts (grantor, grantee, requested by)
   - Review SmartReview page
   - Click "Confirm & Finalize"
   - Generate PDF on preview page
6. ✅ **Verify**:
   - PDF downloads successfully
   - Legal description shows: "TRACT NO 6654 LOT 44"
   - County shows: "LOS ANGELES"
   - Grantor shows: "HERNANDEZ GERARDO J; MENDOZA YESSICA S"

**Success?** You understand the core workflow! 🎉

**Failed?** Check [BREAKTHROUGHS.md](BREAKTHROUGHS.md) for common issues.

---

## 🆘 **GETTING HELP**

### **Debug Checklist:**
1. ✅ Check browser console (F12) for errors
2. ✅ Check backend logs for 500 errors
3. ✅ Verify `.env` files have correct API keys
4. ✅ Check [BREAKTHROUGHS.md](BREAKTHROUGHS.md) for similar issues
5. ✅ Review [docs/wizard/ARCHITECTURE.md](docs/wizard/ARCHITECTURE.md) for data flow

### **Common Issues:**
- **"Not available" in legal description**: See BREAKTHROUGHS.md → Discovery #2
- **Partners 404 error**: See BREAKTHROUGHS.md → Discovery #1
- **500 error on PDF generation**: See BREAKTHROUGHS.md → Discovery #7
- **Old data persisting**: See BREAKTHROUGHS.md → Discovery #9

---

## ⚡ **QUICK COMMANDS**

```bash
# Frontend
cd frontend
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Check for errors

# Backend
cd backend
python main.py       # Start FastAPI server
pytest               # Run tests

# Git
git status           # Check changes
git add .            # Stage all changes
git commit -m "..."  # Commit with message
git push origin main # Deploy to production
```

---

## 🎓 **LEARNING PATH (First Week)**

### **Day 1** (Today):
- ✅ Setup environment
- ✅ Read PROJECT_STATUS.md
- ✅ Read BREAKTHROUGHS.md
- ✅ Generate your first deed locally

### **Day 2**:
- ✅ Read docs/wizard/ARCHITECTURE.md
- ✅ Read docs/backend/ROUTES.md
- ✅ Test all 5 deed types (Grant, Quitclaim, Interspousal, Warranty, Tax)
- ✅ Compare Modern vs Classic wizard UX

### **Day 3**:
- ✅ Read docs/wizard/SITEX_FIELD_MAPPING.md
- ✅ Trace SiteX hydration flow in code
- ✅ Understand canonical adapters

### **Day 4**:
- ✅ Read docs/backend/PDF_GENERATION_SYSTEM.md
- ✅ Examine Jinja2 templates
- ✅ Understand Pydantic models

### **Day 5**:
- ✅ Read docs/wizard/ADDING_NEW_DEED_TYPES.md
- ✅ Pick a small bug from PROJECT_STATUS.md
- ✅ Create a fix and submit PR

**End of Week 1**: You're a productive team member! 🚀

---

## 📧 **CONTACTS**

- **Technical Lead**: [Check PROJECT_STATUS.md for current contact]
- **GitHub**: https://github.com/easydeed/new-front
- **Production**: https://deedpro-frontend-new.vercel.app

---

## 🎉 **WELCOME TO THE TEAM!**

**Remember**:
- ✅ **Always** read the documentation first
- ✅ **Always** check PROJECT_STATUS.md before starting work
- ✅ **Always** test locally before deploying
- ✅ **Always** document your discoveries
- ✅ **Never** skip wizard steps or bypass auth

**Questions?** Check the docs first, then ask the team!

---

👉 **Next Step**: [Read PROJECT_STATUS.md](PROJECT_STATUS.md) to understand current system state!

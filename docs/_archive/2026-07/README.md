# 🏛️ DeedPro - AI-Powered Legal Document Platform

**Streamlined deed generation with intelligent automation**

[![Phase 5](https://img.shields.io/badge/Phase-5-blue)](docs/roadmap/PROJECT_STATUS.md)
[![Tests](https://img.shields.io/badge/Tests-Passing-green)](docs/roadmap/TESTING_GUIDE.md)
[![Docs](https://img.shields.io/badge/Docs-Complete-green)](docs/DOCS_INDEX.md)

---

## 🚀 **Quick Start**

### **New to the Project?**

👉 **[Read This First](docs/ONBOARDING_NEW_AGENTS.md)** - 30-minute onboarding guide

### **Current Status?**

👉 **[Project Status](docs/roadmap/PROJECT_STATUS.md)** - Always check this first

### **What's This Project About?**

DeedPro is an AI-powered platform for generating legal documents (primarily deeds). We recently completed a comprehensive rebuild to address critical legal compliance and UX issues.

**Key Features**:
- ✅ Dynamic metadata-driven wizard
- ✅ AI-assisted document generation
- ✅ TitlePoint & Google Places integration
- ✅ Professional PDF generation
- ✅ Accessibility compliant (WCAG 2.1 AA)

---

## 📖 **Documentation**

### **Essential Reading**

| Document | Purpose | Time |
|----------|---------|------|
| **[ONBOARDING_NEW_AGENTS.md](docs/ONBOARDING_NEW_AGENTS.md)** | Complete onboarding guide | 30 min |
| **[PROJECT_STATUS.md](docs/roadmap/PROJECT_STATUS.md)** | Current phase & blockers | 2 min |
| **[WIZARD_REBUILD_PLAN.md](docs/roadmap/WIZARD_REBUILD_PLAN.md)** | 5-phase rebuild strategy | 10 min |
| **[ARCHITECTURE.md](docs/wizard/ARCHITECTURE.md)** | System design | 10 min |
| **[DOCS_INDEX.md](docs/DOCS_INDEX.md)** | Master documentation index | 5 min |

### **By Role**

- **Developers**: See [Onboarding → Developer Section](docs/ONBOARDING_NEW_AGENTS.md#if-youre-a-developer-)
- **QA/Testing**: See [Testing Guide](docs/roadmap/TESTING_GUIDE.md)
- **DevOps**: See [Deployment Guide](docs/roadmap/DEPLOYMENT_GUIDE.md)
- **PM/Architects**: See [Project Status](docs/roadmap/PROJECT_STATUS.md) + [Wizard Rebuild Plan](docs/roadmap/WIZARD_REBUILD_PLAN.md)

---

## 💻 **Development Setup**

### **Prerequisites**

- **Node.js**: 18+ (for frontend)
- **Python**: 3.11+ (for backend)
- **PostgreSQL**: 14+ (for database)
- **Git**: Latest version

### **Quick Start**

```bash
# 1. Clone repository
git clone https://github.com/easydeed/new-front.git
cd new-front

# 2. Install frontend dependencies
cd frontend
npm install

# 3. Install backend dependencies
cd ../backend
pip install -r requirements.txt

# 4. Configure environment variables
# Frontend
cd ../frontend
cp env.example .env.local
# Edit .env.local with your values

# Backend
cd ../backend
cp env.example .env
# Edit .env with your values

# 5. Run development servers

# Terminal 1 - Backend
cd backend
uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev

# Visit http://localhost:3000
```

### **Environment Variables**

**Frontend (`.env.local`)**:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000  # Backend API URL
NEXT_PUBLIC_DYNAMIC_WIZARD=false           # Feature flag
NEXT_PUBLIC_GOOGLE_PLACES_ENABLED=true
NEXT_PUBLIC_TITLEPOINT_ENABLED=true
```

**Backend (`.env`)**:
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/deedpro
SECRET_KEY=your-secret-key-here
GOOGLE_PLACES_API_KEY=your-google-api-key
TITLEPOINT_API_KEY=your-titlepoint-key
TITLEPOINT_USERNAME=your-username
TITLEPOINT_PASSWORD=your-password
```

---

## 🧪 **Testing**

```bash
# Frontend unit tests
cd frontend
npm run test

# Backend unit tests
cd backend
pytest

# E2E tests (requires dev server running)
cd frontend
npm run dev              # Terminal 1
npx cypress run          # Terminal 2
```

**Full Testing Guide**: [docs/roadmap/TESTING_GUIDE.md](docs/roadmap/TESTING_GUIDE.md)

---

## 🚀 **Deployment**

### **Production Environments**

- **Frontend**: [https://deedpro-frontend-new.vercel.app](https://deedpro-frontend-new.vercel.app) (Vercel)
- **Backend**: [https://deedpro-main-api.onrender.com](https://deedpro-main-api.onrender.com) (Render)

### **Deployment Process**

```bash
# 1. All tests must pass
npm run test && pytest && npx cypress run

# 2. Push to main (triggers auto-deploy)
git push origin main

# 3. Monitor deployment
# - Vercel: https://vercel.com/your-project/deployments
# - Render: https://dashboard.render.com/
```

**Full Deployment Guide**: [docs/roadmap/DEPLOYMENT_GUIDE.md](docs/roadmap/DEPLOYMENT_GUIDE.md)

---

## 📊 **Project Status**

**Current Phase**: **Phase 5 - Production Deployment** 🔄

**Progress**: 85% Complete

**Status**: ⏳ 24-hour backend burn-in in progress

**Next Milestone**: Production deployment (Oct 2, 2025)

**Detailed Status**: [docs/roadmap/PROJECT_STATUS.md](docs/roadmap/PROJECT_STATUS.md)

---

## 🏗️ **Architecture**

### **Tech Stack**

**Frontend**:
- Next.js 15 (React 19)
- TypeScript
- Tailwind CSS
- Zustand (state management)
- Cypress (E2E testing)

**Backend**:
- FastAPI (Python 3.11)
- PostgreSQL
- SQLAlchemy
- Pydantic
- WeasyPrint (PDF generation)

**Infrastructure**:
- Vercel (Frontend hosting)
- Render (Backend hosting)
- PostgreSQL (Render managed)

### **System Design**

```
User → Frontend (Next.js) → Backend (FastAPI) → Database (PostgreSQL)
                ↓                    ↓
         Google Places API    TitlePoint API
                ↓                    ↓
              PDF Generation ← WeasyPrint
```

**Detailed Architecture**: [docs/wizard/ARCHITECTURE.md](docs/wizard/ARCHITECTURE.md)

---

## 📁 **Repository Structure**

```
new-front/
├── docs/                       # 📚 All documentation
│   ├── ONBOARDING_NEW_AGENTS.md   # Start here!
│   ├── DOCS_INDEX.md              # Master index
│   ├── roadmap/                   # Project roadmap & progress
│   │   ├── PROJECT_STATUS.md         # Current status
│   │   ├── WIZARD_REBUILD_PLAN.md    # Master plan
│   │   ├── TESTING_GUIDE.md          # Testing procedures
│   │   └── DEPLOYMENT_GUIDE.md       # Deployment procedures
│   ├── wizard/                    # Architecture docs
│   │   └── ARCHITECTURE.md           # System design
│   └── backend/                   # Backend docs
│       └── ROUTES.md                 # API reference
├── frontend/                   # Next.js frontend
│   ├── src/                       # Source code
│   ├── cypress/                   # E2E tests
│   └── package.json
├── backend/                    # FastAPI backend
│   ├── api/                       # API routes
│   ├── models/                    # Data models
│   ├── services/                  # Business logic
│   ├── tests/                     # Unit tests
│   └── requirements.txt
├── scripts/                    # Utility scripts
│   ├── test-architecture-simple.ps1
│   ├── phase5-feature-flag-validation.ps1
│   └── staging-deployment.ps1
├── templates/                  # Jinja2 PDF templates
├── START_HERE.md              # Quick orientation
├── DEPLOYMENT_CHECKLIST.md    # Pre-deployment checklist
├── STAGING_SETUP.md           # Staging environment setup
└── README.md                  # This file
```

---

## 🤝 **Contributing**

### **Development Workflow**

1. **Check Current Status**: [docs/roadmap/PROJECT_STATUS.md](docs/roadmap/PROJECT_STATUS.md)
2. **Read Relevant Docs**: See [docs/DOCS_INDEX.md](docs/DOCS_INDEX.md)
3. **Create Branch**: `git checkout -b feature/your-feature`
4. **Make Changes**: Follow [docs/wizard/ARCHITECTURE.md](docs/wizard/ARCHITECTURE.md)
5. **Test**: Run all tests (see [Testing Guide](docs/roadmap/TESTING_GUIDE.md))
6. **Update Docs**: Update relevant documentation
7. **Commit**: `git commit -m "feat: your feature description"`
8. **Push**: `git push origin feature/your-feature`
9. **PR**: Create pull request with description

### **Critical Rules**

⚠️ **NEVER**:
- Skip wizard steps (legal compliance)
- Bypass authentication in production
- Deviate from [WIZARD_REBUILD_PLAN.md](docs/roadmap/WIZARD_REBUILD_PLAN.md) without approval
- Deploy without running tests
- Commit without updating docs

✅ **ALWAYS**:
- Check [PROJECT_STATUS.md](docs/roadmap/PROJECT_STATUS.md) first
- Follow the [WIZARD_REBUILD_PLAN.md](docs/roadmap/WIZARD_REBUILD_PLAN.md)
- Run tests before committing
- Update documentation with code changes
- Follow the architecture in [ARCHITECTURE.md](docs/wizard/ARCHITECTURE.md)

---

## 🆘 **Need Help?**

### **Quick Links**

- **New to project?** → [docs/ONBOARDING_NEW_AGENTS.md](docs/ONBOARDING_NEW_AGENTS.md)
- **Current status?** → [docs/roadmap/PROJECT_STATUS.md](docs/roadmap/PROJECT_STATUS.md)
- **How to test?** → [docs/roadmap/TESTING_GUIDE.md](docs/roadmap/TESTING_GUIDE.md)
- **How to deploy?** → [docs/roadmap/DEPLOYMENT_GUIDE.md](docs/roadmap/DEPLOYMENT_GUIDE.md)
- **System design?** → [docs/wizard/ARCHITECTURE.md](docs/wizard/ARCHITECTURE.md)
- **All docs?** → [docs/DOCS_INDEX.md](docs/DOCS_INDEX.md)

### **Common Questions**

**Q: Where do I start?**  
A: Read [docs/ONBOARDING_NEW_AGENTS.md](docs/ONBOARDING_NEW_AGENTS.md) - 30 minutes gets you up to speed.

**Q: What's the current phase?**  
A: Check [docs/roadmap/PROJECT_STATUS.md](docs/roadmap/PROJECT_STATUS.md) - updated daily.

**Q: How do I add a new document type?**  
A: See [docs/wizard/ARCHITECTURE.md](docs/wizard/ARCHITECTURE.md) → "Adding New Document Types"

**Q: Tests are failing, what do I do?**  
A: See [docs/roadmap/TESTING_GUIDE.md](docs/roadmap/TESTING_GUIDE.md) → "Troubleshooting"

**Q: How do I deploy?**  
A: See [docs/roadmap/DEPLOYMENT_GUIDE.md](docs/roadmap/DEPLOYMENT_GUIDE.md) - follow checklist exactly.

---

## 📄 **License**

Proprietary - All rights reserved

---

## 📞 **Contact**

**Project Lead**: Gerard  
**Repository**: [https://github.com/easydeed/new-front](https://github.com/easydeed/new-front)  
**Documentation**: [docs/DOCS_INDEX.md](docs/DOCS_INDEX.md)

---

**Last Updated**: October 1, 2025  
**Version**: 1.0.0 (Phase 5)  
**Status**: 🔄 Production Deployment In Progress

---

👉 **Next Step**: [Read the Onboarding Guide](docs/ONBOARDING_NEW_AGENTS.md)


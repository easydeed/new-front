# 🏗️ DeedPro Repository Structure

## ⚠️ CRITICAL: Monorepo Architecture

**DeedPro uses a MONOREPO structure with DUAL DEPLOYMENTS**

One repository (`easydeed/new-front`) contains both frontend and backend, but they deploy to different services.

---

## 📋 **Complete Repository Structure**

```
new-front/                              # SINGLE REPOSITORY
├── 🌐 frontend/                        # FRONTEND (Vercel)
│   ├── src/
│   │   ├── app/                       # Next.js 13+ App Router
│   │   │   ├── page.tsx               # Homepage
│   │   │   ├── login/page.tsx         # Authentication
│   │   │   ├── register/page.tsx      # User registration
│   │   │   ├── dashboard/page.tsx     # User dashboard
│   │   │   ├── create-deed/page.tsx   # Deed wizard
│   │   │   ├── account-settings/page.tsx # User settings
│   │   │   ├── admin/page.tsx         # Admin dashboard
│   │   │   └── layout.tsx             # Root layout
│   │   └── components/
│   │       ├── Navbar.tsx             # Navigation
│   │       ├── Sidebar.tsx            # Dashboard sidebar
│   │       ├── Hero.tsx               # Landing page
│   │       └── Features.tsx           # Feature sections
│   ├── public/                        # Static assets
│   ├── package.json                   # Frontend dependencies
│   ├── next.config.js                 # Next.js configuration
│   ├── tailwind.config.js             # Tailwind CSS
│   └── tsconfig.json                  # TypeScript config
│
├── ⚙️ backend/                         # BACKEND (Render)
│   ├── main.py                        # FastAPI application (1400+ lines)
│   ├── auth.py                        # JWT authentication
│   ├── database.py                    # PostgreSQL operations
│   ├── ai_assist.py                   # AI assistance router
│   ├── requirements.txt               # Backend dependencies
│   ├── requirements_full.txt          # Full dependency list
│   └── scripts/                       # Database maintenance
│       ├── setup_database.py          # Initial DB setup
│       ├── add_addon.py               # Widget addon column
│       └── fix_database.py            # Database repairs
│
├── 📄 templates/                       # SHARED TEMPLATES
│   ├── grant_deed.html                # Grant deed template
│   ├── quitclaim_deed.html            # Quitclaim deed template
│   └── [future deed types]            # Additional templates
│
├── 📜 scripts/                         # DATABASE SCRIPTS
│   └── add_addon.py                   # Widget licensing script
│
├── 🔧 CONFIGURATION FILES
│   ├── .vercelignore                  # Vercel ignores backend/
│   ├── render.yaml                    # Render deployment config
│   ├── .gitignore                     # Git ignore patterns
│   └── package.json                   # Root package.json
│
└── 📚 DOCUMENTATION
    ├── README.md                       # Project overview
    ├── QUICK_START_FOR_NEW_AGENTS.md  # Start here!
    ├── REPOSITORY_STRUCTURE.md        # This file
    ├── DEVELOPMENT_GUIDE.md            # Development setup
    ├── VERCEL_FRONTEND_DEPLOYMENT_GUIDE.md # Frontend deployment
    ├── DEPLOYMENT_GUIDE.md             # Complete deployment
    ├── SETUP_GUIDE.md                  # Initial setup
    ├── TEMPLATES_GUIDE.md              # Template development
    └── INTEGRATION_GUIDE.md            # Client integration
```

---

## 🚀 **Dual Deployment Strategy**

### **Frontend Deployment: Vercel**
- **Source**: `/frontend` subdirectory ONLY
- **Ignored**: `/backend`, `/templates`, `/scripts` via `.vercelignore`
- **Command**: `vercel --prod` (from repository root)
- **URL**: https://deedpro-frontend-new.vercel.app
- **Auto-deploy**: On git push to main (frontend changes)

### **Backend Deployment: Render**
- **Source**: `/backend` subdirectory ONLY  
- **Config**: `render.yaml` specifies `rootDir: backend`
- **Command**: Automatic on git push (Render watches `/backend`)
- **URL**: https://deedpro-main-api.onrender.com
- **Templates**: Accessed via `../templates` relative path

---

## 🔄 **Data Flow Architecture**

```
┌─────────────────┐    HTTPS API Calls    ┌──────────────────┐
│   FRONTEND      │ ────────────────────► │    BACKEND       │
│   (Vercel)      │                       │    (Render)      │
│                 │                       │                  │
│ • Next.js UI    │                       │ • FastAPI        │
│ • React Pages   │                       │ • PostgreSQL     │
│ • Tailwind CSS  │                       │ • JWT Auth       │
│ • TypeScript    │                       │ • Stripe API     │
└─────────────────┘                       └──────────────────┘
                                                    │
                                                    │ Templates
                                                    ▼
                                          ┌──────────────────┐
                                          │   TEMPLATES      │
                                          │   (Shared)       │
                                          │                  │
                                          │ • Jinja2 HTML    │
                                          │ • WeasyPrint PDF │
                                          │ • Legal Formats  │
                                          └──────────────────┘
```

---

## 🔧 **Development Workflow**

### **Frontend Development**
```bash
cd frontend/                    # Navigate to frontend
npm install                     # Install dependencies
npm run dev                     # Start dev server (port 3000)
```

### **Backend Development**  
```bash
cd backend/                     # Navigate to backend
pip install -r requirements.txt # Install dependencies  
python main.py                  # Start FastAPI (port 8000)
```

### **Full Stack Development**
```bash
# Terminal 1: Frontend
cd frontend && npm run dev

# Terminal 2: Backend
cd backend && python main.py

# Terminal 3: Database (if needed)
cd scripts && python add_addon.py
```

---

## 📦 **Deployment Commands**

### **Frontend Only**
```bash
# Deploy frontend changes
git add frontend/
git commit -m "Update frontend"
git push origin main
vercel --prod
```

### **Backend Only**
```bash  
# Deploy backend changes (auto-triggers Render)
git add backend/ templates/ scripts/
git commit -m "Update backend"
git push origin main
# Render auto-deploys from /backend
```

### **Full Stack**
```bash
# Deploy everything
git add .
git commit -m "Full stack update"  
git push origin main
vercel --prod  # Frontend
# Backend auto-deploys
```

---

## 🚨 **Critical Rules for AI Agents**

### **✅ DO THIS**
- **Frontend tasks**: Work ONLY in `/frontend` directory
- **Backend tasks**: Work ONLY in `/backend` directory  
- **Templates**: Edit files in `/templates` directory
- **Scripts**: Run from repository root or `/scripts`
- **Deploy frontend**: Use `vercel --prod` from root
- **Deploy backend**: Git push triggers auto-deploy

### **❌ NEVER DO THIS**
- ❌ Put backend code in `/frontend`
- ❌ Put frontend code in `/backend`  
- ❌ Deploy frontend from `/backend`
- ❌ Deploy backend from `/frontend`
- ❌ Reference old separate repository names
- ❌ Ignore `.vercelignore` or `render.yaml`

---

## 🛠️ **Configuration Deep Dive**

### **.vercelignore** 
```gitignore
backend/         # Vercel ignores entire backend
templates/       # Templates not needed for frontend
scripts/         # Database scripts not for frontend  
*.pyc            # Python bytecode
__pycache__/     # Python cache
.env             # Environment files
```

### **render.yaml**
```yaml
services:
- type: web
  name: deedpro-main-api
  rootDir: backend           # Deploy from /backend only
  buildCommand: pip install -r requirements.txt
  startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
```

### **Frontend Environment Variables (Vercel)**
```env
NEXT_PUBLIC_API_URL=https://deedpro-main-api.onrender.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### **Backend Environment Variables (Render)**
```env  
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_live_...
ALLOWED_ORIGINS=https://deedpro-frontend-new.vercel.app
```

---

## 📊 **File Count & Size Overview**

| Directory | Purpose | Files | Key Technologies |
|-----------|---------|-------|------------------|
| `/frontend` | User Interface | ~50 files | Next.js, React, TypeScript, Tailwind |
| `/backend` | API Server | ~15 files | FastAPI, PostgreSQL, Stripe |
| `/templates` | Deed Generation | ~5 files | Jinja2, HTML, WeasyPrint |
| `/scripts` | Database Maintenance | ~5 files | Python, PostgreSQL |

---

## 🎯 **Key Benefits of Monorepo**

### **For Developers**
- ✅ **Single repository**: Clone once, get everything
- ✅ **Shared templates**: Frontend and backend access same templates
- ✅ **Unified versioning**: All components versioned together
- ✅ **Simpler development**: No repository switching

### **For AI Agents** 
- ✅ **Clear boundaries**: Subdirectories define scope
- ✅ **No confusion**: Everything in one place
- ✅ **Consistent structure**: Predictable file locations
- ✅ **Safer operations**: Configuration prevents mistakes

### **For Deployment**
- ✅ **Independent scaling**: Frontend and backend scale separately
- ✅ **Service optimization**: Vercel for frontend, Render for backend
- ✅ **Cost efficiency**: Pay only for what each service needs
- ✅ **Technology choice**: Best tool for each job

---

## 🚨 **Emergency Procedures**

### **If Frontend Breaks**
1. Check Vercel deployment logs
2. Verify environment variables
3. Test locally: `cd frontend && npm run dev`
4. Redeploy: `vercel --prod`

### **If Backend Breaks**  
1. Check Render deployment logs
2. Verify Render environment variables
3. Test locally: `cd backend && python main.py`
4. Check database connectivity

### **If Both Break**
1. Check if recent git push caused issues
2. Revert to last working commit
3. Redeploy both services
4. Check interdependency (frontend → backend API calls)

---

**🎯 Remember: One Repository, Two Services, Zero Confusion!** 
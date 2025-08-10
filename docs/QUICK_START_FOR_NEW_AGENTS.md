# 🚨 QUICK START FOR NEW AGENTS - READ THIS FIRST

## ⚠️ CRITICAL: Monorepo Structure

**This is a MONOREPO containing both frontend and backend in ONE repository**

---

## 📋 **Repository Structure**

### **🌐 DeedPro Repository: `easydeed/new-front` (THIS REPO)**
```
new-front/                           # THIS REPOSITORY
├── frontend/                        # Next.js frontend (Vercel deployment)
│   ├── src/app/                    # Next.js pages and components
│   ├── package.json                # Frontend dependencies
│   └── ...                         # Frontend files
├── backend/                         # FastAPI backend (Render deployment)
│   ├── main.py                     # FastAPI application
│   ├── requirements.txt            # Backend dependencies
│   ├── auth.py, database.py        # Backend modules
│   └── ...                         # Backend files
├── templates/                       # Jinja2 deed templates
├── scripts/                         # Database scripts
├── .vercelignore                   # Vercel ignores backend/
├── render.yaml                     # Render deployment config
└── INTEGRATION_GUIDE.md            # Client documentation
```

---

## 🎉 **CURRENT STATUS (Updated August 10, 2025)**

**✅ FULLY OPERATIONAL AND PRODUCTION READY**

- ✅ **Core Deed Generation**: Working perfectly - users can create and download PDFs
- ✅ **Database**: All schemas fixed, no more 500 errors  
- ✅ **Authentication**: JWT-based security with route protection
- ✅ **AI Features**: OpenAI integrated for smart suggestions
- ✅ **Payments**: Stripe configured and ready
- ✅ **Deployments**: Both frontend (Vercel) and backend (Render) stable

**Production URLs:**
- Frontend: https://deedpro-frontend-new.vercel.app
- Backend API: https://deedpro-main-api.onrender.com
- Test Account: test@deedpro-check.com / TestPassword123!

---

## ✅ **Current Working State**

**Frontend**: https://deedpro-frontend-new.vercel.app (deployed from `/frontend`)  
**Backend**: https://deedpro-main-api.onrender.com (deployed from `/backend`)  
**Status**: All systems operational, monorepo structure active  

---

## 📚 **Required Reading Order**

### 1. **FIRST READ**: `REPOSITORY_STRUCTURE.md`
- **WHY**: Explains monorepo architecture  
- **CRITICAL**: Understanding single-repo, dual-deployment setup
- **COVERS**: Frontend/backend separation within one repository

### 2. **THEN READ**: `VERCEL_FRONTEND_DEPLOYMENT_GUIDE.md`
- Frontend deployment from `/frontend` subdirectory
- Environment variables and Vercel configuration

### 3. **THEN READ**: `DEVELOPMENT_GUIDE.md`  
- Local development setup for both frontend and backend
- Monorepo development workflow

---

## 🚫 **DO NOT DO THESE**

❌ **Mix frontend and backend development concerns**  
❌ **Deploy frontend from wrong subdirectory**  
❌ **Deploy backend from wrong subdirectory**  
❌ **Reference old separate repository structure**  
❌ **Ignore .vercelignore or render.yaml configurations**  

---

## ✅ **Monorepo Development Workflow**

### **Frontend Development**
```bash
# In new-front repository
cd frontend
npm install
npm run dev
# Visit: http://localhost:3000
```

### **Backend Development**
```bash
# In new-front repository  
cd backend
pip install -r requirements.txt
python main.py
# Visit: http://localhost:8000
```

### **Full Stack Development**
```bash
# Terminal 1: Frontend
cd frontend && npm run dev

# Terminal 2: Backend  
cd backend && python main.py
```

---

## 🚀 **Deployment Commands**

### **Frontend Deployment (Vercel)**
```bash
# From new-front repository root
vercel --prod
# Result: Updates https://deedpro-frontend-new.vercel.app
# Deploys ONLY /frontend subdirectory
```

### **Backend Deployment (Render)**
```bash
# Automatic via git push (Render watches /backend subdirectory)
git add . && git commit -m "Update backend" && git push origin main
# Result: Updates https://deedpro-main-api.onrender.com
```

---

## 🔧 **Monorepo-Specific Tasks**

### **Frontend Changes**
- **Work in**: `frontend/src/app/` (pages)
- **Work in**: `frontend/src/components/` (components)
- **Deploy**: `vercel --prod` (from repository root)
- **Vercel ignores**: `/backend` directory via `.vercelignore`

### **Backend Changes**
- **Work in**: `backend/main.py` (FastAPI app)
- **Work in**: `backend/` (all backend files)
- **Deploy**: Auto-deploy via git push (Render watches `/backend`)
- **Templates**: Located at `/templates` (accessed via `../templates` from backend)

### **Database Scripts**
- **Location**: `scripts/` directory
- **Run from**: Repository root or `scripts/` directory
- **Example**: `python scripts/add_addon.py`

---

## 📞 **Common Issues & Solutions**

### **"Frontend not updating"**
- **Deploy**: Run `vercel --prod` from repository root
- **Check**: Vercel dashboard Root Directory = `frontend`
- **Verify**: Environment variables in Vercel

### **"Backend API not responding"**
- **Check**: Render deployment from `/backend` subdirectory
- **Deploy**: Git push triggers auto-deployment
- **Verify**: https://deedpro-main-api.onrender.com/docs

### **"Template not found errors"**
- **Templates location**: `/templates` directory in repository root
- **Backend access**: Via `../templates` relative path
- **Verify**: Templates exist in `/templates` directory

### **"Path errors in development"**
- **Frontend**: Always run from `/frontend` directory
- **Backend**: Always run from `/backend` directory
- **Scripts**: Run from repository root

---

## 🎯 **Key Reminders**

1. **Monorepo Structure**: One repository, two deployment targets
2. **Frontend Deployment**: Vercel deploys `/frontend` subdirectory only
3. **Backend Deployment**: Render deploys `/backend` subdirectory only  
4. **Environment Variables**: Frontend uses NEXT_PUBLIC_API_URL to connect to deployed backend
5. **Development**: Run frontend and backend from their respective subdirectories
6. **Templates**: Shared `/templates` directory accessed by backend via relative path

---

## 🛠️ **Quick Development Setup**

```bash
# Clone repository
git clone https://github.com/easydeed/new-front
cd new-front

# Frontend setup
cd frontend
npm install
npm run dev  # http://localhost:3000

# Backend setup (new terminal)
cd ../backend
pip install -r requirements.txt
python main.py  # http://localhost:8000

# Database setup (if needed)
cd ../scripts
python add_addon.py
```

---

**Remember: This is a MONOREPO! Frontend and backend are in the SAME repository but deploy to DIFFERENT services! 🎯** 
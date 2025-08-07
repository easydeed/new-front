# 🌐 DeedPro - Legal Document Platform

**⚠️ IMPORTANT**: This is a **MONOREPO** containing both frontend and backend with dual deployments.

---

## 🏗️ **Monorepo Architecture**

**Single Repository (`new-front`)**: Contains both frontend and backend  
**Dual Deployments**: Frontend → Vercel, Backend → Render  
**Shared Resources**: Templates, scripts, and documentation  

👉 **See [REPOSITORY_STRUCTURE.md](./REPOSITORY_STRUCTURE.md) for complete architecture details**

---

## 🚀 **Live Application**

- **Frontend**: https://deedpro-frontend-new.vercel.app (deployed from `/frontend`)  
- **Backend API**: https://deedpro-main-api.onrender.com (deployed from `/backend`)  
- **API Docs**: https://deedpro-main-api.onrender.com/docs  

---

## 📋 **What's in This Monorepo**

✅ **Frontend Application** (Next.js/React) → `/frontend`  
✅ **Backend API Server** (FastAPI) → `/backend`  
✅ **Deed Templates** (Jinja2/HTML) → `/templates`  
✅ **Database Scripts** (Python) → `/scripts`  
✅ **Documentation** (Markdown) → Root directory  
✅ **Configuration Files** (Deployment configs) → Root directory  

---

## 🛠️ **Quick Development Setup**

### **Prerequisites**
- Node.js 18+ 
- Python 3.8+
- PostgreSQL database

### **Clone & Setup**
```bash
# Clone the monorepo
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

### **Environment Variables**

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
```

**Backend** (`backend/.env`):
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/deedpro
STRIPE_SECRET_KEY=sk_test_your_key
JWT_SECRET_KEY=your_jwt_secret
ALLOWED_ORIGINS=http://localhost:3000
```

---

## 🚀 **Deployment**

### **Frontend Deployment (Vercel)**
```bash
# Deploy frontend only
vercel --prod
```
**Auto-deployment**: Connected to Vercel for auto-deployment on git push.

### **Backend Deployment (Render)**  
```bash
# Auto-deploy via git push (Render watches /backend subdirectory)
git add backend/ templates/ scripts/
git commit -m "Update backend"
git push origin main
```

### **Full Stack Deployment**
```bash
# Deploy everything
git add .
git commit -m "Full stack update"
git push origin main
vercel --prod  # Frontend manual deploy
# Backend auto-deploys
```

---

## 📚 **Documentation**

### **For New Contributors**
- **[Quick Start Guide](./QUICK_START_FOR_NEW_AGENTS.md)** - Start here!
- **[Repository Structure](./REPOSITORY_STRUCTURE.md)** - Understanding the monorepo
- **[Development Guide](./DEVELOPMENT_GUIDE.md)** - Local development setup

### **For Deployment**
- **[Vercel Frontend Guide](./VERCEL_FRONTEND_DEPLOYMENT_GUIDE.md)** - Frontend deployment
- **[Complete Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Full deployment process
- **[Setup Guide](./SETUP_GUIDE.md)** - Initial project setup

### **For Development**
- **[Templates Guide](./TEMPLATES_GUIDE.md)** - Deed template development  
- **[Integration Guide](./INTEGRATION_GUIDE.md)** - Client widget integration

---

## 🎯 **DeedPro Platform Overview**

DeedPro is a comprehensive legal document platform for creating, managing, and sharing property deeds with:

### ✨ **Core Features**
- **Deed Creation Wizard**: Step-by-step guided deed creation
- **Template Engine**: Professional legal document templates  
- **User Management**: Registration, authentication, subscription plans
- **Plan Tiers**: Free, Professional, Enterprise with usage limits
- **Payment Integration**: Stripe-powered subscription management
- **Document Sharing**: Secure deed sharing and approval workflows
- **Widget Add-On**: Embeddable deed creation for client websites ($49/mo)

### 🔑 **Licensing & Add-Ons**
- **Widget Add-On ($49/mo)**: Embed wizard via API/key.
- **Managed in /admin**: Toggle widget_addon, generate embed_key.
- **See INTEGRATION_GUIDE.md** for client setup.

### 🏢 **Business Model**
- **Free Plan**: 5 deeds/month, basic features
- **Professional Plan**: $29/month, unlimited deeds, SoftPro integration  
- **Enterprise Plan**: $99/month, all features, API access, priority support
- **Widget Add-On**: $49/month, embeddable widget for client sites

### 🔧 **Technical Stack**

**Frontend** (`/frontend`):
- Next.js 13+ with App Router
- React 18 with TypeScript
- Tailwind CSS for styling
- Vercel deployment

**Backend** (`/backend`):  
- FastAPI with Python 3.8+
- PostgreSQL database
- JWT authentication
- Stripe payment processing
- Render deployment

**Templates** (`/templates`):
- Jinja2 HTML templates
- WeasyPrint PDF generation
- Legal document formatting

**Infrastructure**:
- Vercel (frontend hosting)
- Render (backend hosting)  
- PostgreSQL (database)
- Stripe (payments)

---

## 🔄 **Development Workflow**

### **Frontend Development**
```bash
cd frontend/
npm run dev        # Start dev server
npm run build      # Test production build
npm run lint       # Check code quality
```

### **Backend Development**
```bash
cd backend/
python main.py     # Start FastAPI server
pytest tests/      # Run tests
python scripts/setup_database.py  # Database setup
```

### **Template Development**
```bash
# Edit templates in /templates directory
# Test with backend running locally
curl -X POST localhost:8000/generate-deed-preview \
  -H "Content-Type: application/json" \
  -d '{"deed_type": "grant_deed", "data": {...}}'
```

---

## 🛠️ **Directory Guide for Developers**

| Work on... | Edit files in... | Deploy via... |
|------------|------------------|---------------|
| UI/UX, Pages | `/frontend/src/` | `vercel --prod` |
| API, Database | `/backend/` | git push (auto) |
| Deed Templates | `/templates/` | git push (auto) |
| Database Scripts | `/scripts/` | Run manually |
| Documentation | `/*.md` | git push |

---

## 📞 **Support & Issues**

### **Issue Categories**
- **Frontend Issues**: UI, pages, components → Work in `/frontend`
- **Backend Issues**: API, database, auth → Work in `/backend`  
- **Template Issues**: Deed generation → Work in `/templates`
- **Integration Issues**: Check API communication and environment variables

### **Getting Help**
1. Check relevant documentation files
2. Verify environment variables  
3. Test locally before deploying
4. Check deployment logs (Vercel/Render)

---

## 🎉 **Quick Commands Reference**

```bash
# Development
cd frontend && npm run dev        # Frontend dev server
cd backend && python main.py     # Backend dev server

# Deployment  
vercel --prod                     # Deploy frontend
git push origin main              # Deploy backend (auto)

# Database
cd scripts && python add_addon.py # Run database scripts

# Testing
cd frontend && npm run build      # Test frontend build
cd backend && pytest tests/      # Test backend
```

---

## 🚨 **Critical Notes for AI Agents**

1. **This is a MONOREPO**: Frontend and backend in one repository
2. **Separate deployments**: Vercel (frontend) + Render (backend)
3. **Work in correct subdirectories**: `/frontend` or `/backend`
4. **Never mix concerns**: Keep frontend and backend code separate
5. **Use relative paths**: Templates at `../templates` from backend
6. **Check configuration**: `.vercelignore` and `render.yaml` are critical

---

**🚨 Remember**: This monorepo contains **frontend AND backend** with dual deployments. Always work in the correct subdirectory! 🎯
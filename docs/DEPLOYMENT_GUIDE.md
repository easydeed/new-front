# 🚀 DeedPro Complete Deployment Guide

## ⚠️ CRITICAL: Monorepo Dual Deployment

**This guide covers deploying both frontend and backend from a SINGLE monorepo.**

- **Frontend** (`/frontend`) → **Vercel**  
- **Backend** (`/backend`) → **Render**  
- **Templates & Scripts** → Shared in monorepo

---

## 📋 **Pre-Deployment Checklist**

### **Repository Structure Verification**
```
new-front/                          # SINGLE MONOREPO
├── frontend/                       # Next.js → Vercel
├── backend/                        # FastAPI → Render  
├── templates/                      # Shared deed templates
├── scripts/                        # Database scripts
├── .vercelignore                  # Vercel configuration
├── render.yaml                    # Render configuration
└── Documentation files
```

### **Required Accounts & Services**
- ✅ **Vercel Account**: For frontend hosting
- ✅ **Render Account**: For backend API hosting  
- ✅ **PostgreSQL Database**: Database hosting
- ✅ **Stripe Account**: For payment processing
- ✅ **GitHub Repository**: Source code hosting

---

## 🌐 **Frontend Deployment (Vercel)**

### **Step 1: Vercel Configuration**

1. **Connect Repository to Vercel**:
   - Visit [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import `easydeed/new-front` repository

2. **Configure Project Settings**:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend` ⚠️ **CRITICAL**
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

### **Step 2: Environment Variables**

Add in Vercel Dashboard → Settings → Environment Variables:

```env
# Production API URL (points to Render backend)
NEXT_PUBLIC_API_URL=https://deedpro-main-api.onrender.com

# Stripe Integration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_stripe_key

# Optional Features  
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
NEXT_PUBLIC_WIDGET_ADDON_ENABLED=true
```

### **Step 3: Deploy Frontend**

```bash
# Method 1: Vercel CLI
cd new-front
vercel --prod

# Method 2: Git Push (auto-deploy)
git add frontend/
git commit -m "Update frontend"
git push origin main
```

### **Step 4: Verify Frontend**

- **URL**: https://deedpro-frontend-new.vercel.app
- **Health Check**: Homepage loads without errors
- **API Connectivity**: Check browser console for backend calls

---

## ⚙️ **Backend Deployment (Render)**

### **Step 1: Create Render Web Service**

1. **Visit [Render Dashboard](https://render.com/)**
2. **Click "New +" → "Web Service"**
3. **Connect Repository**: `easydeed/new-front`
4. **Configure Service**:
   - **Name**: `deedpro-main-api`
   - **Environment**: Python 3
   - **Root Directory**: `backend` ⚠️ **CRITICAL**
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Choose appropriate plan

### **Step 2: Environment Variables**

Add in Render Service → Environment:

```env
# Database Connection
DATABASE_URL=postgresql://username:password@host:port/database

# Stripe Integration
STRIPE_SECRET_KEY=sk_live_your_live_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_stripe_publishable_key

# CORS Configuration
ALLOWED_ORIGINS=https://deedpro-frontend-new.vercel.app

# Authentication
JWT_SECRET_KEY=your_jwt_secret_key

# Application Settings
API_RATE_LIMIT=100
LOG_LEVEL=INFO
```

### **Step 3: Database Setup**

```bash
# Run database initialization scripts
cd scripts/
python add_addon.py        # Widget licensing column
python setup_database.py   # Initial database setup
```

### **Step 4: Deploy Backend**

```bash
# Auto-deploy via git push
git add backend/ templates/ scripts/
git commit -m "Update backend"
git push origin main

# Render automatically deploys from /backend subdirectory
```

### **Step 5: Verify Backend**

- **URL**: https://deedpro-main-api.onrender.com
- **Health Check**: https://deedpro-main-api.onrender.com/health
- **API Docs**: https://deedpro-main-api.onrender.com/docs

---

## 🔗 **Post-Deployment Configuration**

### **Step 1: Update Frontend Environment**

Ensure Vercel environment variables point to deployed backend:

```env
NEXT_PUBLIC_API_URL=https://deedpro-main-api.onrender.com
```

### **Step 2: Update Backend CORS**

Ensure Render environment variables allow frontend domain:

```env
ALLOWED_ORIGINS=https://deedpro-frontend-new.vercel.app
```

### **Step 3: Test Integration**

```bash
# Test frontend → backend connectivity
curl -X GET "https://deedpro-frontend-new.vercel.app"
# Should load homepage successfully

# Test backend API
curl -X GET "https://deedpro-main-api.onrender.com/health"
# Should return: {"status": "healthy"}

# Test API documentation
# Visit: https://deedpro-main-api.onrender.com/docs
```

---

## ✅ **Verification Tests**

### **Frontend Tests**
```bash
# Homepage loads
curl -I https://deedpro-frontend-new.vercel.app
# Expected: HTTP/2 200

# Static assets load
curl -I https://deedpro-frontend-new.vercel.app/_next/static/
# Expected: HTTP/2 200
```

### **Backend API Tests**
```bash
# Health endpoint
curl https://deedpro-main-api.onrender.com/health
# Expected: {"status": "healthy"}

# API documentation
curl https://deedpro-main-api.onrender.com/docs
# Expected: HTML page with API docs

# Widget access endpoint
curl -X GET "https://deedpro-main-api.onrender.com/check-widget-access" \
  -H "Authorization: Bearer test_token"
# Expected: 403 (without valid token) or 200 (with valid token)
```

### **Integration Tests**
```bash
# Frontend calls backend API
# Open browser → https://deedpro-frontend-new.vercel.app
# Open Developer Console → Network Tab
# Look for API calls to deedpro-main-api.onrender.com

# Test deed generation flow
# Navigate to /create-deed
# Verify widget access check calls backend
# Test deed preview functionality
```

---

## 🔧 **Configuration Files Deep Dive**

### **.vercelignore (Critical for Frontend)**
```gitignore
# Exclude backend from Vercel deployment
backend/
templates/
scripts/
*.pyc
__pycache__/
.env
*.log
venv/
```

### **render.yaml (Backend Deployment Config)**
```yaml
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
```

### **Environment Variables Summary**

| Service | Variable | Value | Purpose |
|---------|----------|-------|---------|
| Vercel | `NEXT_PUBLIC_API_URL` | `https://deedpro-main-api.onrender.com` | Frontend → Backend API |
| Render | `ALLOWED_ORIGINS` | `https://deedpro-frontend-new.vercel.app` | CORS configuration |
| Render | `DATABASE_URL` | `postgresql://...` | Database connection |
| Render | `STRIPE_SECRET_KEY` | `sk_live_...` | Payment processing |

---

## 🚨 **Troubleshooting**

### **Frontend Issues**

**Build Failures**:
```bash
# Check .vercelignore excludes backend
cat .vercelignore | grep backend

# Verify frontend dependencies
cd frontend && npm install

# Test local build
cd frontend && npm run build
```

**API Connection Issues**:
```bash
# Check environment variables
# Vercel Dashboard → Settings → Environment Variables
# Ensure NEXT_PUBLIC_API_URL is set correctly

# Test backend connectivity
curl https://deedpro-main-api.onrender.com/health
```

### **Backend Issues**

**Deployment Failures**:
```bash
# Check Render build logs
# Render Dashboard → Service → Logs

# Verify root directory setting
# Should be: backend

# Check requirements.txt
cd backend && pip install -r requirements.txt
```

**Database Connection Issues**:
```bash
# Verify DATABASE_URL format
# postgresql://username:password@host:port/database

# Test database connection
python -c "import psycopg2; print('DB connection OK')"
```

### **CORS Errors**

**Symptoms**: Frontend API calls fail with CORS errors

**Solution**:
```bash
# Update Render environment variables
ALLOWED_ORIGINS=https://deedpro-frontend-new.vercel.app

# Restart Render service
# Render Dashboard → Service → Manual Deploy
```

### **Template/Path Issues**

**Symptoms**: "Template not found" errors

**Solution**:
```bash
# Verify templates directory exists
ls templates/

# Check backend template path
cd backend
python -c "import os; print(os.path.exists('../templates/grant_deed.html'))"
```

---

## 🔄 **Maintenance & Updates**

### **Frontend Updates**
```bash
# Update frontend code
cd frontend/src/app/
# Make changes...

# Test locally
cd .. && npm run dev

# Deploy
cd .. && vercel --prod
```

### **Backend Updates**
```bash
# Update backend code
cd backend/
# Make changes to main.py, etc.

# Test locally
python main.py

# Deploy (auto via git push)
cd .. && git add backend/ && git commit -m "Update backend" && git push
```

### **Database Migrations**
```bash
# Create new migration script
cd scripts/
# Create new .py file

# Run migration
python new_migration.py

# Update database schema as needed
```

### **Template Updates**
```bash
# Update deed templates
cd templates/
# Edit .html files

# Test with backend
cd ../backend
python -c "from jinja2 import Environment, FileSystemLoader; env = Environment(loader=FileSystemLoader('../templates')); print('Templates OK')"

# Deploy (templates auto-deploy with backend)
git add templates/ && git commit -m "Update templates" && git push
```

---

## 📊 **Performance Optimization**

### **Frontend Performance**
- ✅ Vercel's global CDN (automatic)
- ✅ Next.js automatic image optimization
- ✅ Static generation for landing pages
- ✅ Code splitting for dynamic routes

### **Backend Performance**
- ✅ FastAPI's automatic documentation
- ✅ Async/await for database operations
- ✅ Connection pooling for PostgreSQL
- ✅ Response caching for templates

### **Database Performance**
- ✅ Proper indexing on user queries
- ✅ Connection pooling
- ✅ Query optimization
- ✅ Regular maintenance scripts

---

## 🔒 **Security Checklist**

### **Production Security**
- [ ] All environment variables use production values
- [ ] HTTPS enabled on both services (automatic)
- [ ] API keys rotated and secured
- [ ] CORS configured for production domains only
- [ ] Rate limiting enabled on backend
- [ ] Error messages sanitized
- [ ] Database connections secured
- [ ] JWT tokens properly configured
- [ ] Input validation on all endpoints

### **Monitoring Setup**
- [ ] Vercel analytics enabled
- [ ] Render health checks configured
- [ ] Error tracking (logs)
- [ ] Performance monitoring
- [ ] Database backup verification

---

## 🎯 **Success Criteria**

### **Deployment Complete When:**
- ✅ Frontend loads at https://deedpro-frontend-new.vercel.app
- ✅ Backend responds at https://deedpro-main-api.onrender.com
- ✅ API documentation accessible at /docs
- ✅ Database connection working
- ✅ Frontend can call backend APIs
- ✅ Authentication flow working
- ✅ Deed generation working
- ✅ Widget licensing functional
- ✅ Payment processing operational

---

## 📞 **Support Resources**

### **Deployment Logs**
- **Vercel**: Dashboard → Project → Functions
- **Render**: Dashboard → Service → Logs  
- **Database**: Check connection logs

### **Documentation References**
- **Next.js**: https://nextjs.org/docs
- **FastAPI**: https://fastapi.tiangolo.com/
- **Vercel**: https://vercel.com/docs
- **Render**: https://render.com/docs

---

**🚨 Remember**: This is a MONOREPO with DUAL DEPLOYMENTS. Frontend and backend deploy from the same repository to different services! 🎯 
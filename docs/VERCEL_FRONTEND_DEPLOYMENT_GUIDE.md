# 🚀 Vercel Frontend Deployment Guide

## ⚠️ CRITICAL: Monorepo Frontend Deployment

**This guide covers deploying the FRONTEND from the `/frontend` subdirectory of the monorepo.**

The backend deploys separately to Render from the `/backend` subdirectory.

---

## 📋 **Pre-Deployment Checklist**

### **Repository Structure Verification**
```
new-front/                          # THIS MONOREPO
├── frontend/                       # ← VERCEL DEPLOYS THIS
│   ├── src/app/                   # Next.js pages
│   ├── package.json               # Frontend dependencies
│   └── next.config.js             # Next.js config
├── backend/                        # ← VERCEL IGNORES THIS
├── templates/                      # ← VERCEL IGNORES THIS  
├── scripts/                        # ← VERCEL IGNORES THIS
├── .vercelignore                  # ← CRITICAL: Ignores backend
└── render.yaml                    # ← Backend deployment config
```

### **Required Files**
- ✅ `.vercelignore` exists in repository root
- ✅ `frontend/package.json` has all dependencies
- ✅ `frontend/next.config.js` is configured
- ✅ Environment variables are documented

---

## 🔧 **Vercel Configuration**

### **Dashboard Settings**
1. **Repository**: `easydeed/new-front`
2. **Framework**: Next.js (auto-detected)
3. **Root Directory**: `frontend` ⚠️ **CRITICAL SETTING**
4. **Build Command**: `npm run build` (default)
5. **Output Directory**: `.next` (default)
6. **Install Command**: `npm install` (default)

### **Critical .vercelignore File**
```gitignore
# Backend files (not needed for frontend)
backend/
templates/
scripts/
*.pyc
__pycache__/
.env
*.log

# Python environments
venv/
env/
.venv/

# Database files
*.db
*.sqlite
```

### **Why .vercelignore is Critical**
- ❌ **Without it**: Vercel tries to deploy backend files
- ❌ **Result**: Build failures, conflicting dependencies
- ✅ **With it**: Clean frontend-only deployment
- ✅ **Result**: Fast, reliable deployments

---

## 🌐 **Environment Variables Setup**

### **Production Environment Variables**
Add these in Vercel Dashboard → Settings → Environment Variables:

```env
# Backend API URL (points to Render deployment)
NEXT_PUBLIC_API_URL=https://deedpro-main-api.onrender.com

# Stripe Integration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_stripe_key

# Optional: Analytics
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id

# Optional: Feature Flags
NEXT_PUBLIC_WIDGET_ADDON_ENABLED=true
```

### **Development Environment Variables**
For local development (`frontend/.env.local`):

```env
# Local backend URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Test Stripe keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_stripe_key

# Development flags
NEXT_PUBLIC_ANALYTICS_ID=
NEXT_PUBLIC_WIDGET_ADDON_ENABLED=true
```

---

## 🚀 **Deployment Methods**

### **Method 1: Vercel CLI (Recommended)**
```bash
# From monorepo root
cd new-front

# Install Vercel CLI (if not installed)
npm install -g vercel

# Deploy to production
vercel --prod

# Result: Deploys /frontend to https://deedpro-frontend-new.vercel.app
```

### **Method 2: Git Integration (Automatic) ✅ CONFIGURED**
```bash
# From monorepo root
git add frontend/
git commit -m "Update frontend"
git push origin main

# Vercel auto-deploys frontend changes
# Backend remains unaffected
# ✅ Auto-deploy enabled: Aug 07, 2025
```

**Auto-Deploy Setup:**
- ✅ Repository: `easydeed/new-front` connected
- ✅ Root Directory: `frontend` configured
- ✅ Automatic Deploys: Enabled in Vercel Dashboard
- ✅ Environment Variables: Configured
- ✅ Test successful: Verified working

### **Method 3: Vercel Dashboard**
1. Go to Vercel Dashboard
2. Select `deedpro-frontend-new` project
3. Click "Deployments" → "Deploy"
4. Wait for build completion

---

## ✅ **Verification Steps**

### **1. Check Deployment URL**
```bash
# Test frontend loads correctly
curl -I https://deedpro-frontend-new.vercel.app

# Should return: HTTP/2 200
```

### **2. Verify API Connectivity**
1. **Open browser**: https://deedpro-frontend-new.vercel.app
2. **Open Developer Console**: F12
3. **Check Network Tab**: Look for API calls to backend
4. **Expected**: Calls to `https://deedpro-main-api.onrender.com`

### **3. Test Core Functionality**
- ✅ **Homepage loads**: No build errors
- ✅ **Login/Register**: Authentication flows work
- ✅ **Dashboard**: User interface responsive
- ✅ **Create Deed**: Widget access check works
- ✅ **Account Settings**: Widget add-on displays correctly

### **4. Environment Variables Check**
```javascript
// In browser console
console.log(process.env.NEXT_PUBLIC_API_URL);
// Should output: https://deedpro-main-api.onrender.com
```

---

## 🔄 **Update Workflow**

### **Frontend-Only Updates**
```bash
# 1. Make changes in /frontend directory
cd frontend/src/app/
# Edit files...

# 2. Test locally
cd ..
npm run dev
# Verify changes at http://localhost:3000

# 3. Deploy
cd ..  # Back to monorepo root
vercel --prod
```

### **Full-Stack Updates**
```bash
# 1. Update both frontend and backend
git add frontend/ backend/ templates/
git commit -m "Full stack update"
git push origin main

# 2. Deploy frontend manually (backend auto-deploys)
vercel --prod
```

---

## 🚨 **Troubleshooting**

### **Build Failures**

**Error**: `Module not found: Can't resolve '../backend'`
```bash
# Solution: Check .vercelignore excludes backend/
echo "backend/" >> .vercelignore
git add .vercelignore && git commit -m "Fix vercelignore"
vercel --prod
```

**Error**: `Python dependencies in package.json`
```bash
# Solution: Clean frontend package.json
cd frontend/
# Remove any Python/backend dependencies
npm install
cd .. && vercel --prod
```

### **Environment Variable Issues**

**Error**: API calls return 404
```bash
# Check environment variables in Vercel Dashboard
# Ensure NEXT_PUBLIC_API_URL points to deployed backend
```

**Error**: Stripe not working
```bash
# Verify Stripe keys in Vercel environment variables
# Check both publishable and secret keys match
```

### **Routing Issues**

**Error**: 404 on page refresh
```bash
# Solution: Verify next.config.js has proper routing
# Check Vercel deployment settings
```

---

## 🔧 **Advanced Configuration**

### **Custom Domain Setup**
1. **Vercel Dashboard** → Your Project → Settings → Domains
2. **Add Domain**: Enter your custom domain
3. **Configure DNS**: Update DNS records as instructed
4. **Verify SSL**: Ensure HTTPS certificate is active

### **Performance Optimization**
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['deedpro-main-api.onrender.com'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
}

module.exports = nextConfig
```

### **Build Optimization**
```json
// package.json scripts
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "analyze": "ANALYZE=true npm run build"
  }
}
```

---

## 📊 **Deployment Metrics**

| Metric | Target | Actual |
|---------|--------|---------|
| Build Time | < 2 minutes | ~90 seconds |
| Bundle Size | < 1MB | ~800KB |
| First Paint | < 2 seconds | ~1.2 seconds |
| TTI | < 3 seconds | ~2.1 seconds |

---

## 🎯 **Best Practices**

### **Code Organization**
- ✅ Keep all frontend code in `/frontend`
- ✅ Use TypeScript for type safety
- ✅ Follow Next.js 13+ App Router patterns
- ✅ Implement proper error boundaries

### **Performance**
- ✅ Use Next.js Image optimization
- ✅ Implement code splitting
- ✅ Optimize bundle size
- ✅ Use proper caching headers

### **Security**
- ✅ Never expose secret keys in frontend
- ✅ Use `NEXT_PUBLIC_` prefix for client-side variables
- ✅ Implement proper CORS headers
- ✅ Validate all user inputs

---

## 📞 **Support & Debugging**

### **Vercel Logs**
```bash
# View deployment logs
vercel logs https://deedpro-frontend-new.vercel.app

# View function logs
vercel logs --since 1h
```

### **Common Issues**
1. **Backend not responding**: Check NEXT_PUBLIC_API_URL
2. **Build timeouts**: Optimize dependencies, check .vercelignore
3. **Environment variables**: Verify in Vercel Dashboard
4. **CORS errors**: Check backend ALLOWED_ORIGINS setting

### **Debug Commands**
```bash
# Test local build
cd frontend && npm run build && npm start

# Check environment variables
cd frontend && npm run dev
# Check browser console for env vars

# Verify API connectivity
curl https://deedpro-main-api.onrender.com/health
```

---

**🚨 Remember**: Frontend deploys from `/frontend` subdirectory only. Backend files are ignored via `.vercelignore`! 🎯 
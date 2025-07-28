# 🌐 DeedPro Frontend Repository

**⚠️ IMPORTANT**: This is the **frontend-only** repository for DeedPro. Backend code is in a separate repository.

---

## 🏗️ **Repository Structure**

**This Repository (`new-front`)**: Frontend UI only  
**Backend Repository**: `easydeed/deedpro-backend-2024`  

👉 **See [REPOSITORY_STRUCTURE.md](./REPOSITORY_STRUCTURE.md) for complete details**

---

## 🚀 **Live Application**

- **Frontend**: https://deedpro-frontend-new.vercel.app  
- **Backend API**: https://deedpro-main-api.onrender.com  
- **API Docs**: https://deedpro-main-api.onrender.com/docs  

---

## 📋 **What's in This Repository**

✅ **Frontend Application** (Next.js/React)  
✅ **User Interface Components**  
✅ **Frontend Documentation**  
✅ **Vercel Deployment Configuration**  

❌ **No Backend Code** (moved to `deedpro-backend-2024`)  
❌ **No API Endpoints** (in separate repository)  
❌ **No Database Logic** (in separate repository)  

---

## 🛠️ **Development Setup**

### **Prerequisites**
- Node.js 18+ 
- npm or yarn

### **Frontend Development**
```bash
# Clone the frontend repository
git clone https://github.com/easydeed/new-front
cd new-front/frontend

# Install dependencies  
npm install

# Start development server
npm run dev

# Visit: http://localhost:3000
```

### **Environment Variables**
Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=https://deedpro-main-api.onrender.com
NEXT_PUBLIC_EXTERNAL_API_URL=https://deedpro-external-api.onrender.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

---

## 🚀 **Deployment**

### **Frontend Deployment (Vercel)**
```bash
# From project root
vercel --prod
```

**Automatic Deployment**: Connected to Vercel for auto-deployment on push to main.

---

## 📚 **Documentation**

- **[Repository Structure](./REPOSITORY_STRUCTURE.md)** - Understanding the two-repo architecture
- **[Vercel Deployment Guide](./VERCEL_FRONTEND_DEPLOYMENT_GUIDE.md)** - Frontend deployment
- **[Development Guide](./DEVELOPMENT_GUIDE.md)** - Local development setup
- **[Quick Start for New Agents](./QUICK_START_FOR_NEW_AGENTS.md)** - Getting started

---

## 🔗 **Related Repositories**

- **Backend**: [easydeed/deedpro-backend-2024](https://github.com/easydeed/deedpro-backend-2024)
- **Templates**: Backend repository contains deed generation templates

---

## 📞 **Support**

**Frontend Issues**: Create issues in this repository  
**Backend/API Issues**: Create issues in `deedpro-backend-2024` repository  
**Integration Issues**: Check API communication and environment variables  

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

### 🏢 **Business Model**
- **Free Plan**: 5 deeds/month, basic features
- **Professional Plan**: $29/month, unlimited deeds, SoftPro integration  
- **Enterprise Plan**: $99/month, all features, API access, priority support

### 🔧 **Technical Stack**
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: FastAPI, PostgreSQL, Jinja2, WeasyPrint
- **Deployment**: Vercel (frontend) + Render (backend)
- **Payments**: Stripe integration with webhooks
- **AI**: OpenAI integration for smart assistance

---

**🚨 Remember**: This repository contains **frontend code only**. Backend functionality is in the `deedpro-backend-2024` repository.
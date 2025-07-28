# 🚨 QUICK START FOR NEW AGENTS - READ THIS FIRST

## ⚠️ CRITICAL: Repository Structure

**This is the FRONTEND-ONLY repository for DeedPro**

---

## 📋 **Repository Separation**

### **🌐 Frontend Repository: `easydeed/new-front` (THIS REPO)**
- **Purpose**: React/Next.js user interface ONLY
- **Deployed to**: Vercel
- **Live URL**: https://deedpro-frontend-new.vercel.app
- **Contains**: Frontend code, UI components, pages

### **⚙️ Backend Repository: `easydeed/deedpro-backend-2024` (SEPARATE REPO)**
- **Purpose**: FastAPI server, database, business logic
- **Deployed to**: Render  
- **Live URL**: https://deedpro-main-api.onrender.com
- **Contains**: API endpoints, database models, deed generation

---

## ✅ **Current Working State**

**Frontend**: https://deedpro-frontend-new.vercel.app (working perfectly)  
**Backend**: https://deedpro-main-api.onrender.com (working perfectly)  
**Status**: All systems operational, no 404 errors  

---

## 📚 **Required Reading Order**

### 1. **FIRST READ**: `REPOSITORY_STRUCTURE.md`
- **WHY**: Explains two-repository architecture  
- **CRITICAL**: Prevents mixing frontend/backend code
- **COVERS**: Repository separation, deployment workflows

### 2. **THEN READ**: `VERCEL_FRONTEND_DEPLOYMENT_GUIDE.md`
- Frontend deployment process and configuration
- Environment variables and settings

### 3. **THEN READ**: `DEVELOPMENT_GUIDE.md`  
- Local development setup for frontend
- Frontend-specific development workflow

---

## 🚫 **DO NOT DO THESE**

❌ **Add backend code to this repository**  
❌ **Create API endpoints in `new-front`**  
❌ **Add database models or business logic here**  
❌ **Deploy backend services from this repository**  
❌ **Mix frontend and backend concerns**  

---

## ✅ **Frontend Development Workflow**

### **Local Development**
```bash
# In new-front repository
cd frontend
npm install
npm run dev
# Visit: http://localhost:3000
```

### **Frontend Deployment**
```bash
# From new-front repository root
vercel --prod
# Result: Updates https://deedpro-frontend-new.vercel.app
```

---

## 🔧 **Frontend-Specific Tasks**

### **UI Changes**
- **Work in**: `frontend/src/app/` (pages)
- **Work in**: `frontend/src/components/` (components)
- **Deploy**: `vercel --prod`

### **API Integration**
- **Environment**: Set `NEXT_PUBLIC_API_URL=https://deedpro-main-api.onrender.com`
- **Backend Changes**: Work in `deedpro-backend-2024` repository
- **Never**: Create API endpoints in frontend

---

## 🚨 **Backend Issues**

**If you need to fix backend/API issues:**

1. **Switch to backend repository**: `easydeed/deedpro-backend-2024`
2. **Make changes there**, not in `new-front`
3. **Deploy backend from backend repository**
4. **Frontend automatically uses deployed backend**

---

## 📞 **Common Issues & Solutions**

### **"API returns 404"**
- **Check**: Backend is deployed and running
- **Fix in**: `deedpro-backend-2024` repository, NOT here

### **"Frontend not updating"**
- **Deploy**: Run `vercel --prod` from `new-front`
- **Check**: Environment variables in Vercel dashboard

### **"Backend code found in frontend"**
- **Solution**: Delete it immediately
- **Rule**: Only frontend code belongs here

---

## 🎯 **Key Reminders**

1. **Frontend ONLY**: This repository handles UI/UX only
2. **API Calls**: Frontend calls backend via HTTPS
3. **Separate Deployments**: Vercel (frontend) + Render (backend)  
4. **No Mixing**: Keep repositories completely separate
5. **Environment Variables**: Point to deployed backend URLs

---

**Remember: When in doubt, check REPOSITORY_STRUCTURE.md! 🎯** 
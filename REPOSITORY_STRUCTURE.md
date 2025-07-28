# 🏗️ DeedPro Repository Structure & Separation

**IMPORTANT**: DeedPro uses a **two-repository architecture** with clear separation of concerns.

---

## 📋 **Repository Overview**

### **Frontend Repository: `easydeed/new-front`** 
**🌐 Deployed to: Vercel**
- **Purpose**: User interface, React/Next.js frontend
- **Live URL**: https://deedpro-frontend-new.vercel.app
- **Contains**: Frontend code ONLY
- **Deployment**: Automatic via Vercel

### **Backend Repository: `easydeed/deedpro-backend-2024`**
**⚙️ Deployed to: Render** 
- **Purpose**: API server, database, business logic
- **Live URL**: https://deedpro-main-api.onrender.com
- **Contains**: Backend code ONLY  
- **Deployment**: Manual via Render

---

## 🚫 **CRITICAL: What NOT to Do**

❌ **Never add backend code to `new-front`**  
❌ **Never add frontend code to `deedpro-backend-2024`**  
❌ **Never mix repository concerns**  
❌ **Never deploy backend from `new-front`**  
❌ **Never deploy frontend from `deedpro-backend-2024`**  

---

## ✅ **Correct Development Workflow**

### **Frontend Changes (UI, pages, components)**
1. **Repository**: `easydeed/new-front`
2. **Local Development**: `npm run dev` (from `frontend/` directory)
3. **Deployment**: `vercel --prod` (auto-deploys to Vercel)

### **Backend Changes (API, database, business logic)**
1. **Repository**: `easydeed/deedpro-backend-2024`  
2. **Local Development**: `python main.py` (from `backend/` directory)
3. **Deployment**: Push to GitHub → Render auto-deploys

---

## 📁 **Repository Contents**

### **`new-front` Contains ONLY:**
```
new-front/
├── frontend/                 # Next.js frontend application
│   ├── src/app/             # App router pages
│   ├── src/components/      # React components  
│   ├── package.json         # Frontend dependencies
│   └── next.config.js       # Next.js configuration
├── package.json             # Root package.json
├── .vercel/                 # Vercel deployment config
└── Documentation files
```

### **`deedpro-backend-2024` Contains ONLY:**
```
deedpro-backend-2024/
├── backend/                 # FastAPI backend application
│   ├── main.py             # Main API application
│   ├── database.py         # Database models & functions
│   ├── auth.py             # Authentication logic
│   ├── requirements.txt    # Backend dependencies
│   └── scripts/            # Database scripts
├── templates/              # Deed generation templates
│   ├── grant_deed.html     # Grant deed template
│   └── quitclaim_deed.html # Quitclaim deed template
└── Backend-specific files
```

---

## 🔄 **Communication Between Repositories**

**Frontend → Backend Communication:**
- Frontend calls backend APIs via environment variables
- `NEXT_PUBLIC_API_URL=https://deedpro-main-api.onrender.com`
- All API calls go to the deployed backend on Render

**No Direct Code Sharing:**
- Repositories are completely independent
- Communication happens only via HTTP API calls
- No shared files or dependencies

---

## 🚨 **Troubleshooting Common Issues**

### **"Backend code found in new-front"**
- **Solution**: Delete all backend code from `new-front`
- **Never**: Keep backend code in frontend repository

### **"Frontend code found in deedpro-backend-2024"**  
- **Solution**: Move frontend code to `new-front`
- **Never**: Keep frontend code in backend repository

### **"API calls return 404"**
- **Check**: Backend is deployed and running on Render
- **Check**: Frontend environment variables point to correct backend URL
- **Check**: Endpoint exists in `deedpro-backend-2024/backend/main.py`

### **"Changes not deploying"**
- **Frontend**: Ensure you're deploying from `new-front` to Vercel
- **Backend**: Ensure you're deploying from `deedpro-backend-2024` to Render

---

## 👥 **For Development Teams**

### **Frontend Developers:**
- **Work in**: `easydeed/new-front` repository only
- **Never touch**: Backend code or `deedpro-backend-2024`
- **API calls**: Use environment variables for backend URLs

### **Backend Developers:**  
- **Work in**: `easydeed/deedpro-backend-2024` repository only
- **Never touch**: Frontend code or `new-front`
- **API endpoints**: Document in OpenAPI/Swagger docs

### **Full-Stack Developers:**
- **Switch repositories** for different tasks
- **Never mix** frontend and backend code in same repo
- **Coordinate** API changes between repositories

---

## 📞 **Getting Help**

**Frontend Issues**: Work in `new-front` repository  
**Backend Issues**: Work in `deedpro-backend-2024` repository  
**Integration Issues**: Check API communication and environment variables

**Remember**: Keep repositories separate, keep concerns separate, keep deployments separate! 🎯 
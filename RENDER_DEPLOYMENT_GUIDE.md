# 🚀 Render Backend Deployment Guide

This guide will walk you through deploying your DeedPro backend to Render with zero issues.

## ✅ Prerequisites Checklist

- [x] **Frontend deployed to Vercel** ✅ https://frontend-mydmrvafb-easydeeds-projects.vercel.app
- [x] **GitHub repository** with latest code
- [x] **Backend code** ready in `/backend` directory
- [ ] **Render account** (free signup at render.com)
- [ ] **Stripe account** for payment processing

## 🎯 **Step-by-Step Deployment**

### **Step 1: Create Render Account & Connect GitHub**

1. **Go to**: https://render.com
2. **Sign up** with your GitHub account
3. **Authorize** Render to access your repositories
4. **Select** your `deeds` repository

### **Step 2: Create PostgreSQL Database**

1. **In Render Dashboard** → Click **"New +"** → **"PostgreSQL"**
2. **Configure Database:**
   ```
   Name: deedpro-database
   Database: deedpro
   User: deedpro_user
   Region: Choose closest to you (Ohio-US East for best performance)
   PostgreSQL Version: 15
   Plan: Free (can upgrade later)
   ```
3. **Click "Create Database"** ⏱️ (Takes ~2-3 minutes)
4. **Save Database URL** - You'll need this for the backend

### **Step 3: Deploy Main API Backend**

1. **In Render Dashboard** → Click **"New +"** → **"Web Service"**
2. **Connect Repository** → Select your `deeds` repo
3. **Configure Service:**
   ```
   Name: deedpro-main-api
   Root Directory: backend
   Environment: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: python main.py
   Instance Type: Free
   ```

4. **Environment Variables** → Click **"Add Environment Variable"**:
   ```bash
   # Database Connection
   DATABASE_URL = [Copy from your PostgreSQL database]
   
   # JWT Security  
   JWT_SECRET_KEY = your-secret-jwt-key-here-make-it-long-and-random
   
   # Stripe Keys (Get from https://dashboard.stripe.com/apikeys)
   STRIPE_SECRET_KEY = sk_test_your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET = whsec_your_webhook_secret
   
   # Environment
   ENVIRONMENT = production
   ```

5. **Click "Create Web Service"** ⏱️ (Takes ~5-10 minutes)

### **Step 4: Deploy External API Backend**

1. **In Render Dashboard** → Click **"New +"** → **"Web Service"**
2. **Connect Repository** → Select your `deeds` repo
3. **Configure Service:**
   ```
   Name: deedpro-external-api
   Root Directory: backend
   Environment: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: python start_external_api.py
   Instance Type: Free
   ```

4. **Environment Variables**:
   ```bash
   DATABASE_URL = [Same as main API]
   JWT_SECRET_KEY = [Same as main API]  
   ENVIRONMENT = production
   ```

5. **Click "Create Web Service"**

### **Step 5: Initialize Database**

Once both services are deployed:

1. **Go to your main API service** → **Shell** tab
2. **Run database initialization**:
   ```bash
   cd /opt/render/project/src
   python scripts/init_db.py
   ```

### **Step 6: Update Frontend URLs**

1. **Go to Vercel Dashboard** → Your frontend project → **Settings** → **Environment Variables**
2. **Update URLs** with your live Render services:
   ```bash
   NEXT_PUBLIC_API_URL = https://deedpro-main-api.onrender.com
   NEXT_PUBLIC_EXTERNAL_API_URL = https://deedpro-external-api.onrender.com
   ```
3. **Redeploy frontend** to apply changes

## 🎉 **Testing Your Deployment**

### **1. Health Check**
Visit: `https://deedpro-main-api.onrender.com/health`
Should return: `{"status": "healthy"}`

### **2. Test Registration**
1. Go to your frontend: https://frontend-mydmrvafb-easydeeds-projects.vercel.app/register
2. Register a new account
3. Check if you can login at: /login

### **3. Test API Endpoints**
```bash
# Test registration
curl -X POST https://deedpro-main-api.onrender.com/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","full_name":"Test User"}'
```

## 🔧 **Environment Variables Reference**

### **Required for Main API:**
```bash
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET_KEY=your-super-secret-jwt-key-at-least-32-characters
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
ENVIRONMENT=production
```

### **Required for External API:**
```bash
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET_KEY=your-super-secret-jwt-key-at-least-32-characters
ENVIRONMENT=production
```

## 🚨 **Common Issues & Solutions**

### **Build Fails**
- **Check**: requirements.txt in backend directory
- **Solution**: Ensure all dependencies are listed

### **Database Connection Error**
- **Check**: DATABASE_URL format
- **Solution**: Copy exact URL from Render PostgreSQL dashboard

### **CORS Errors**
- **Check**: Frontend URL in CORS settings
- **Solution**: Backend allows all origins by default

### **Stripe Webhook Fails**
- **Check**: Webhook URL in Stripe dashboard
- **Solution**: Set to `https://deedpro-main-api.onrender.com/payments/webhook`

## 🎯 **Expected Service URLs**

After deployment, you'll have:
- **Main API**: https://deedpro-main-api.onrender.com
- **External API**: https://deedpro-external-api.onrender.com  
- **Database**: Internal connection via DATABASE_URL
- **Frontend**: https://frontend-mydmrvafb-easydeeds-projects.vercel.app

## ✅ **Success Checklist**

- [ ] Database created and accessible
- [ ] Main API service deployed and running
- [ ] External API service deployed and running
- [ ] Database initialized with test data
- [ ] Frontend URLs updated
- [ ] Registration/login working
- [ ] Deed creation functional
- [ ] Stripe integration working

## 🆘 **Need Help?**

If you encounter issues:
1. **Check Render logs** in each service dashboard
2. **Verify environment variables** are set correctly
3. **Test database connection** in the Shell tab
4. **Check Stripe dashboard** for webhook events

**Your DeedPro platform will be fully functional once these steps are complete! 🚀** 
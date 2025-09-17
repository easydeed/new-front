# 🚀 DeedPro Deployment Guide

This guide will walk you through deploying your DeedPro platform to **Vercel** (Frontend) and **Render** (Backend).

## 📋 Prerequisites

- GitHub repository with your code
- Vercel account (free tier available)
- Render account (free tier available)
- Supabase database credentials
- Stripe API keys

## 🌐 Frontend Deployment (Vercel)

### Step 1: Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "New Project" and import your GitHub repository
3. Select the `frontend` folder as the root directory
4. Vercel will auto-detect Next.js and configure build settings

### Step 2: Configure Environment Variables

In your Vercel project dashboard, go to **Settings > Environment Variables** and add:

```
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51RnOGWGbFaaG6u2M8eNvlkz052ORvtPRb2CqlTSYWfaKCm1qfrJPwFDXyz3nRAm04ozmOHHGAYWYx26BYfFkjntr00Xwxp7jkR
```

### Step 3: Deploy

1. Click "Deploy" - Vercel will automatically build and deploy
2. Your frontend will be available at `https://your-project.vercel.app`

## 🔧 Backend Deployment (Render)

### Step 1: Create Web Service

1. Go to [render.com](https://render.com) and sign in with GitHub
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `deedpro-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `cd backend && pip install -r requirements.txt`
   - **Start Command**: `cd backend && python main.py`

### Step 2: Set Environment Variables

In your Render service dashboard, go to **Environment** and add:

```
SUPABASE_URL=postgresql://postgres:ZachZoe3000@db.qefwvhmtdgcqmvcaoqsj.supabase.co:5432/postgres
SUPABASE_KEY=your_supabase_anon_or_service_key_here
STRIPE_SECRET_KEY=sk_test_51RnOGWGbFaaG6u2MwDcYL8F8XSQZDeS2qn2sTmhLvm5osSJGDdb3zRO4kr6uAP6nBb9RHMGfwTkaNkx1IF6pGfhE00iCJeMIF2
STRIPE_PUBLISHABLE_KEY=pk_test_51RnOGWGbFaaG6u2M8eNvlkz052ORvtPRb2CqlTSYWfaKCm1qfrJPwFDXyz3nRAm04ozmOHHGAYWYx26BYfFkjntr00Xwxp7jkR
PYTHON_VERSION=3.11
```

### Step 3: Deploy

1. Click "Create Web Service"
2. Render will build and deploy your backend
3. Your API will be available at `https://your-service.onrender.com`

## 🔗 Connect Frontend to Backend

After both services are deployed:

1. **Update Vercel Environment Variables**:
   - Go to your Vercel project settings
   - Update `NEXT_PUBLIC_API_URL` with your Render backend URL
   - Redeploy the frontend

2. **Update CORS in Backend** (if needed):
   - Add your Vercel domain to the CORS allowed origins
   - Redeploy the backend

## ✅ Verification Steps

### Test Your Deployment

1. **Frontend Health Check**: Visit your Vercel URL
2. **Backend Health Check**: Visit `https://your-backend.onrender.com/health`
3. **API Connection**: Test creating a deed or user registration
4. **Database Connection**: Verify Supabase connectivity
5. **Stripe Integration**: Test payment functionality

### Common URLs to Test

```
Frontend: https://your-project.vercel.app
Backend API: https://your-backend.onrender.com
Health Check: https://your-backend.onrender.com/health
Admin Dashboard: https://your-project.vercel.app/admin
```

## 🔧 Troubleshooting

### Frontend Issues

- **Build Failures**: Check that all dependencies are in `frontend/package.json`
- **Environment Variables**: Ensure all `NEXT_PUBLIC_*` variables are set
- **API Connection**: Verify the backend URL is correct

### Backend Issues

- **Startup Failures**: Check Python version and dependencies
- **Database Connection**: Verify Supabase credentials
- **CORS Errors**: Add frontend domain to allowed origins

### Common Solutions

1. **Cold Starts**: Render free tier has cold starts (~30 seconds)
2. **Environment Variables**: Double-check all variables are set correctly
3. **Build Path**: Ensure correct paths in build/start commands

## 📊 Performance Optimization

### Vercel (Frontend)
- Uses global CDN automatically
- Automatic image optimization
- Static generation for better performance

### Render (Backend)
- Consider upgrading to paid plan for better performance
- Use connection pooling for database
- Implement caching for frequently accessed data

## 🔒 Security Considerations

1. **Environment Variables**: Never commit sensitive keys to Git
2. **CORS Configuration**: Restrict to your domain in production
3. **Database Security**: Use Supabase RLS (Row Level Security)
4. **API Rate Limiting**: Implement rate limiting in production

## 📈 Monitoring & Maintenance

### Vercel Analytics
- Enable Vercel Analytics for frontend monitoring
- Monitor Core Web Vitals and user experience

### Render Monitoring
- Use Render's built-in monitoring
- Set up health checks and alerts
- Monitor API response times

## 🚀 Automatic Deployments

The included GitHub Actions workflow will:
- Automatically deploy to Vercel on main branch pushes
- Run tests before deployment
- Notify you of deployment status

## 💡 Tips for Success

1. **Test Locally First**: Always test the full stack locally before deploying
2. **Environment Parity**: Keep development and production environments similar
3. **Database Migrations**: Plan for database schema changes
4. **Backup Strategy**: Implement regular Supabase backups
5. **Monitoring**: Set up monitoring and alerts for production issues

## 📞 Support

If you encounter issues:
1. Check the deployment logs in Vercel/Render dashboards
2. Verify all environment variables are correctly set
3. Test API endpoints individually
4. Check database connectivity from backend logs

Your DeedPro platform is now ready for production! 🎉 
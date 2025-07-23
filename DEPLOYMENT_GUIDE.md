# DeedPro Deployment Guide

Complete guide for deploying DeedPro to production with Vercel (Frontend) and Render (Backend APIs).

## 🚀 Quick Deployment Checklist

- [ ] Frontend deployed to Vercel
- [ ] Main API deployed to Render  
- [ ] External API deployed to Render
- [ ] Environment variables configured
- [ ] Domain names updated
- [ ] SSL certificates active
- [ ] Health checks passing

## 📋 Pre-Deployment Requirements

### Repository Setup
- All code committed and pushed to main branch
- Environment variables documented
- Dependencies updated and tested locally

### Service Accounts Needed
- **Vercel Account**: For frontend hosting
- **Render Account**: For backend API hosting
- **Domain**: Optional custom domain
- **Stripe Account**: For payment processing
- **OpenAI Account**: Optional for AI features

## 🌐 Frontend Deployment (Vercel)

### 1. Connect Repository to Vercel

1. **Visit [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Click "New Project"**
3. **Import from GitHub**: Select `easydeed/deeds` repository
4. **Configure Project**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### 2. Environment Variables

Add these variables in Vercel Dashboard → Settings → Environment Variables:

```env
# Production API URLs (update after backend deployment)
NEXT_PUBLIC_API_URL=https://deedpro-main-api.onrender.com
NEXT_PUBLIC_EXTERNAL_API_URL=https://deedpro-external-api.onrender.com

# Stripe Public Key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_stripe_key

# Optional: Analytics
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
```

### 3. Deploy and Verify

1. **Click "Deploy"**
2. **Wait for build completion** (typically 2-3 minutes)
3. **Test deployment**: Visit your Vercel URL
4. **Check console**: Ensure no API connection errors

### 4. Custom Domain (Optional)

1. **Vercel Dashboard** → Your Project → Settings → Domains
2. **Add Domain**: Enter your custom domain
3. **Configure DNS**: Update DNS records as instructed
4. **Verify SSL**: Ensure HTTPS certificate is active

## 🔧 Backend Deployment (Render)

### 1. Main API Service

#### Create Web Service
1. **Visit [Render Dashboard](https://render.com/)**
2. **Click "New +" → "Web Service"**
3. **Connect Repository**: Select `easydeed/deeds`
4. **Configure Service**:
   - **Name**: `deedpro-main-api`
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements_full.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Choose appropriate plan based on usage

#### Environment Variables
```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Stripe
STRIPE_SECRET_KEY=sk_live_your_live_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_stripe_publishable_key

# AI (Optional)
OPENAI_API_KEY=sk-your_openai_api_key

# Security
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app,https://your-custom-domain.com
API_RATE_LIMIT=100
LOG_LEVEL=INFO
```

### 2. External Integrations API Service

#### Create Second Web Service  
1. **New Web Service** in Render
2. **Same Repository**: `easydeed/deeds`
3. **Configure Service**:
   - **Name**: `deedpro-external-api`
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r external_requirements.txt`
   - **Start Command**: `python start_external_api.py`
   - **Environment Variable**: `EXTERNAL_API_PORT=$PORT`

#### Environment Variables
```env
# All same variables as Main API, plus:

# External API Specific
EXTERNAL_API_SECRET_KEY=your_external_api_secret_key
EXTERNAL_API_HOST=0.0.0.0
EXTERNAL_API_PORT=$PORT

# Qualia Integration (Optional)
QUALIA_USERNAME=your_qualia_username
QUALIA_PASSWORD=your_qualia_password
QUALIA_API_URL=https://api.qualia.com/graphql

# SoftPro Integration
SOFTPRO_WEBHOOK_SECRET=your_softpro_webhook_secret
```

### 3. Deploy and Verify

1. **Deploy both services**
2. **Wait for builds** (typically 3-5 minutes each)
3. **Test health endpoints**:
   - Main API: `https://deedpro-main-api.onrender.com/health`
   - External API: `https://deedpro-external-api.onrender.com/health`
4. **Check logs** for any startup errors

## 🔄 Post-Deployment Configuration

### 1. Update Frontend URLs

Update Vercel environment variables with actual Render URLs:

```env
NEXT_PUBLIC_API_URL=https://deedpro-main-api.onrender.com
NEXT_PUBLIC_EXTERNAL_API_URL=https://deedpro-external-api.onrender.com
```

### 2. Update vercel.json Routes

Ensure `vercel.json` routes point to correct Render services:

```json
{
  "routes": [
    {
      "src": "/api/external/(.*)",
      "dest": "https://deedpro-external-api.onrender.com/$1"
    },
    {
      "src": "/api/(.*)", 
      "dest": "https://deedpro-main-api.onrender.com/$1"
    }
  ]
}
```

### 3. Configure External Integrations

#### SoftPro 360 Setup
1. **Login to SoftPro 360**
2. **Navigate to Process Automation**
3. **Create webhook**:
   - URL: `https://deedpro-external-api.onrender.com/api/v1/softpro/webhook`
   - Method: POST
   - Headers: `X-API-Key: softpro_api_key_123`
4. **Test integration** with sample order

#### Qualia Setup
1. **Contact Qualia API support**
2. **Provide webhook URLs**:
   - Import: `https://deedpro-external-api.onrender.com/api/v1/qualia/import-order`
   - Export: `https://deedpro-external-api.onrender.com/api/v1/qualia/export-deed`
3. **Configure API credentials** in environment variables

## ✅ Verification Tests

### Frontend Tests
```bash
# Test frontend loads
curl -I https://your-app.vercel.app

# Test API connectivity (check browser console)
# Should see successful API calls to Render services
```

### Backend API Tests
```bash
# Test Main API
curl https://deedpro-main-api.onrender.com/health

# Test External API  
curl https://deedpro-external-api.onrender.com/health

# Test API docs
# Visit: https://deedpro-main-api.onrender.com/docs
# Visit: https://deedpro-external-api.onrender.com/docs
```

### Integration Tests
```bash
# Test SoftPro webhook
curl -X POST "https://deedpro-external-api.onrender.com/api/v1/softpro/webhook" \
  -H "X-API-Key: softpro_api_key_123" \
  -H "Content-Type: application/json" \
  -d '{"order_id": "TEST123", "property_address": "123 Test St", "buyer_name": "Test Buyer", "seller_name": "Test Seller"}'

# Test AI assistance
curl -X POST "https://deedpro-main-api.onrender.com/api/ai/assist" \
  -H "Content-Type: application/json" \
  -d '{"deed_type": "Grant Deed", "field": "property_address", "input": "123 test street"}'
```

## 🚨 Troubleshooting

### Common Issues

#### Frontend Build Fails
- **Check Node.js version**: Ensure compatible version (18+)
- **Verify dependencies**: Check `package.json` and `package-lock.json`
- **Environment variables**: Ensure all required variables are set

#### Backend Deployment Fails
- **Python version**: Ensure Python 3.8+ is specified
- **Dependencies**: Check `requirements_full.txt` for all packages
- **Port binding**: Ensure app binds to `$PORT` environment variable

#### API Connection Issues
- **CORS errors**: Verify `ALLOWED_ORIGINS` includes frontend domain
- **SSL certificates**: Ensure all services use HTTPS
- **Network timeouts**: Check service health and response times

#### Integration Problems
- **API key errors**: Verify correct API keys in environment variables
- **Webhook failures**: Check endpoint URLs and authentication headers
- **Data format issues**: Verify payload formats match API specifications

### Performance Optimization

#### Frontend
- **Enable caching**: Configure appropriate cache headers
- **Optimize images**: Use Next.js Image optimization
- **Code splitting**: Ensure proper dynamic imports

#### Backend
- **Database connections**: Configure connection pooling
- **Response caching**: Implement caching for frequently accessed data
- **Rate limiting**: Configure appropriate limits for production

## 📊 Monitoring & Maintenance

### Health Monitoring
- Set up Render health checks
- Monitor Vercel analytics
- Configure error tracking (Sentry, etc.)

### Regular Maintenance
- **Security updates**: Keep dependencies updated
- **Performance monitoring**: Track API response times
- **Log analysis**: Review error logs regularly
- **Backup verification**: Ensure database backups are working

### Scaling Considerations
- **Traffic analysis**: Monitor usage patterns
- **Resource scaling**: Upgrade Render plans as needed
- **CDN setup**: Consider CDN for static assets
- **Database optimization**: Optimize queries and indexes

## 🔒 Security Checklist

- [ ] All environment variables use production values
- [ ] HTTPS enabled on all services
- [ ] API keys rotated and secured
- [ ] CORS configured for production domains only
- [ ] Rate limiting enabled
- [ ] Error messages sanitized (no sensitive data exposure)
- [ ] Database connections secured
- [ ] Webhook signatures verified
- [ ] Audit logging enabled

## 📞 Support

### Deployment Issues
- **Vercel Support**: Check Vercel documentation and community
- **Render Support**: Render support team for backend issues
- **Repository Issues**: Create GitHub issues for code-related problems

### Integration Support
- **SoftPro**: Contact SoftPro developer support
- **Qualia**: Reach out to Qualia API team
- **OpenAI**: Check OpenAI API status and documentation

---

**Deployment Status**: Ready for production deployment with dual API architecture and enterprise integrations. 
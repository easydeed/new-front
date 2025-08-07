# ✅ Deployment Checklist

## 🎯 Overview

Comprehensive checklist for deploying DeedPro to production environments. Follow this checklist step-by-step to ensure a successful deployment.

**Target Environments:**
- **Frontend**: Vercel
- **Backend**: Render
- **Database**: PostgreSQL on Render
- **Monitoring**: Built-in health checks

---

## 🔄 Pre-Deployment Preparation

### ✅ Code Quality Checks

- [ ] **All tests pass locally**
  ```bash
  cd frontend && npm test
  cd backend && pytest
  ```

- [ ] **Linting passes without errors**
  ```bash
  cd frontend && npm run lint
  cd backend && flake8 .
  ```

- [ ] **TypeScript compilation successful**
  ```bash
  cd frontend && npm run type-check
  ```

- [ ] **Build process completes successfully**
  ```bash
  cd frontend && npm run build
  ```

- [ ] **No console errors in development**
  - Test all major user flows
  - Check browser console for errors
  - Verify API connectivity

### ✅ Environment Configuration

- [ ] **Environment variables documented**
  - All required variables listed
  - Example values provided
  - Sensitive values marked

- [ ] **Frontend environment variables ready**
  ```env
  NEXT_PUBLIC_API_URL=https://deedpro-main-api.onrender.com
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
  NEXT_PUBLIC_ANALYTICS_ID=xxx
  ```

- [ ] **Backend environment variables ready**
  ```env
  DATABASE_URL=postgresql://prod_user:pass@host/db
  STRIPE_SECRET_KEY=sk_live_xxx
  STRIPE_WEBHOOK_SECRET=whsec_xxx
  JWT_SECRET_KEY=xxx
  ALLOWED_ORIGINS=https://your-frontend.vercel.app
  ```

- [ ] **Database connection string tested**
  ```bash
  psql $DATABASE_URL -c "SELECT 1;"
  ```

### ✅ Security Review

- [ ] **No hardcoded secrets in code**
  ```bash
  grep -r "sk_live\|pk_live\|password\|secret" src/
  ```

- [ ] **JWT secret key is secure**
  - At least 32 characters
  - Randomly generated
  - Not reused from development

- [ ] **CORS origins restricted**
  - Only production domains allowed
  - No wildcard (*) in production

- [ ] **Stripe webhooks configured**
  - Webhook endpoint added in Stripe
  - Webhook secret configured
  - Events selected: checkout.session.completed, invoice.payment_succeeded

---

## 🌐 Frontend Deployment (Vercel)

### ✅ Vercel Project Setup

- [ ] **Repository connected to Vercel**
  - GitHub repository linked
  - Correct branch selected (main)
  - Auto-deploy enabled

- [ ] **Build settings configured**
  - [ ] Framework: Next.js
  - [ ] Root Directory: `frontend`
  - [ ] Build Command: `npm run build`
  - [ ] Output Directory: `.next`
  - [ ] Install Command: `npm install`

- [ ] **Environment variables added**
  - [ ] `NEXT_PUBLIC_API_URL` set to production backend
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` set to live key
  - [ ] All optional variables configured

### ✅ Frontend Verification

- [ ] **Deployment successful**
  - Build logs show no errors
  - Deployment status is "Ready"
  - URL is accessible

- [ ] **Homepage loads correctly**
  ```bash
  curl -I https://your-project.vercel.app
  # Should return 200 OK
  ```

- [ ] **API connectivity working**
  - Open browser developer tools
  - Check Network tab for API calls
  - Verify calls go to production backend

- [ ] **All pages accessible**
  - [ ] `/` (Homepage)
  - [ ] `/login` (Login page)
  - [ ] `/register` (Registration)
  - [ ] `/dashboard` (User dashboard)
  - [ ] `/create-deed` (Deed wizard)
  - [ ] `/admin` (Admin dashboard)

- [ ] **No console errors**
  - Check browser console on all pages
  - Verify no 404 or CORS errors
  - Test user interactions

---

## ⚙️ Backend Deployment (Render)

### ✅ Render Service Setup

- [ ] **Web service created**
  - [ ] Name: `deedpro-main-api`
  - [ ] Environment: Python 3
  - [ ] Root Directory: `backend`
  - [ ] Build Command: `pip install -r requirements.txt`
  - [ ] Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

- [ ] **Environment variables configured**
  - [ ] All required variables added
  - [ ] No test/development values
  - [ ] Database URL points to production

- [ ] **Auto-deploy enabled**
  - Connected to correct repository
  - Watches main branch
  - Deploys on git push

### ✅ Backend Verification

- [ ] **Service deployment successful**
  - Build logs show no errors
  - Service status is "Live"
  - No crash loops

- [ ] **Health endpoint responds**
  ```bash
  curl https://deedpro-main-api.onrender.com/health
  # Should return {"status": "healthy"}
  ```

- [ ] **API documentation accessible**
  ```bash
  curl https://deedpro-main-api.onrender.com/docs
  # Should return HTML page
  ```

- [ ] **Database connectivity working**
  - Check service logs for DB connection
  - No database connection errors
  - Queries execute successfully

- [ ] **Authentication endpoints working**
  ```bash
  # Test registration endpoint
  curl -X POST https://deedpro-main-api.onrender.com/users/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"TestPass123!","full_name":"Test User","role":"user","state":"CA"}'
  ```

---

## 🗄️ Database Setup

### ✅ Database Service

- [ ] **PostgreSQL service running**
  - Database created on Render
  - Connection string available
  - Firewall rules configured

- [ ] **Database initialized**
  ```bash
  cd scripts
  python init_db.py
  ```

- [ ] **Tables created successfully**
  ```sql
  \dt
  # Should show all required tables
  ```

- [ ] **Indexes created**
  ```sql
  \di
  # Should show performance indexes
  ```

### ✅ Data Migration

- [ ] **Pricing table populated**
  ```bash
  python scripts/add_pricing.py
  ```

- [ ] **Plan limits configured**
  ```sql
  SELECT * FROM plan_limits;
  # Should show free, professional, enterprise plans
  ```

- [ ] **Test users created (optional)**
  ```sql
  SELECT email, plan FROM users WHERE email LIKE '%@test.com';
  ```

### ✅ Database Security

- [ ] **Connection encrypted**
  - SSL/TLS enabled
  - Certificate verification active

- [ ] **Access restricted**
  - Only application can connect
  - Admin access from secure IPs

- [ ] **Backup configured**
  - Automated daily backups
  - Backup retention policy set

---

## 💳 Stripe Configuration

### ✅ Stripe Dashboard Setup

- [ ] **Live mode activated**
  - Account fully activated
  - Bank account verified
  - Business details complete

- [ ] **Products created**
  - [ ] Professional Plan ($29/month)
  - [ ] Enterprise Plan ($99/month)
  - Price IDs copied to environment

- [ ] **Webhook endpoint configured**
  - [ ] URL: `https://deedpro-main-api.onrender.com/payments/webhook`
  - [ ] Events: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`
  - [ ] Webhook secret copied to environment

### ✅ Stripe Integration Testing

- [ ] **Test payment flow**
  - Create test subscription
  - Verify webhook received
  - Check user plan updated

- [ ] **Billing portal working**
  ```bash
  # Test portal session creation
  curl -X POST https://deedpro-main-api.onrender.com/payments/create-portal-session \
    -H "Authorization: Bearer test_token"
  ```

- [ ] **Subscription management**
  - Test plan upgrades
  - Test cancellations
  - Verify plan downgrades

---

## 🔗 Integration Testing

### ✅ End-to-End User Flows

- [ ] **User registration flow**
  1. Visit registration page
  2. Fill out form with valid data
  3. Submit registration
  4. Verify success redirect
  5. Check user created in database

- [ ] **Authentication flow**
  1. Visit login page
  2. Enter valid credentials
  3. Verify successful login
  4. Check JWT token received
  5. Test protected routes

- [ ] **Deed creation flow**
  1. Navigate to create deed
  2. Select deed type
  3. Fill out form fields
  4. Generate preview
  5. Create deed successfully

- [ ] **Plan upgrade flow**
  1. Click upgrade button
  2. Redirect to Stripe checkout
  3. Complete test payment
  4. Verify plan upgraded
  5. Check webhook processed

### ✅ API Integration

- [ ] **Frontend-Backend communication**
  - All API calls successful
  - No CORS errors
  - Authentication working

- [ ] **External API connectivity**
  ```bash
  curl https://deedpro-external-api.onrender.com/health
  # Should return healthy status
  ```

- [ ] **Database operations**
  - User CRUD operations
  - Deed CRUD operations
  - Subscription updates

---

## 📊 Monitoring Setup

### ✅ Health Checks

- [ ] **Application health endpoints**
  ```bash
  # Main API health
  curl https://deedpro-main-api.onrender.com/health

  # External API health
  curl https://deedpro-external-api.onrender.com/health
  ```

- [ ] **Database health monitoring**
  ```sql
  SELECT 1; -- Should execute successfully
  ```

- [ ] **Service status monitoring**
  - Render service status pages
  - Vercel deployment status
  - Uptime monitoring configured

### ✅ Logging Configuration

- [ ] **Application logs accessible**
  - Render service logs viewable
  - Error logs captured
  - Performance metrics available

- [ ] **Error tracking setup**
  - Critical errors logged
  - Error notifications configured
  - Log retention policies set

---

## 🔒 Security Verification

### ✅ Production Security

- [ ] **HTTPS enforced**
  - All connections encrypted
  - HTTP redirects to HTTPS
  - SSL certificates valid

- [ ] **API security headers**
  ```bash
  curl -I https://deedpro-main-api.onrender.com/health
  # Check for security headers
  ```

- [ ] **Authentication security**
  - JWT tokens properly signed
  - Token expiration working
  - Secure token storage

- [ ] **Data protection**
  - Passwords properly hashed
  - Sensitive data encrypted
  - PII handling compliant

### ✅ Access Controls

- [ ] **Admin access restricted**
  - Admin endpoints require admin role
  - User access properly scoped
  - No privilege escalation possible

- [ ] **API rate limiting**
  - Rate limits configured
  - DDoS protection active
  - Abuse prevention measures

---

## 🚨 Rollback Preparation

### ✅ Rollback Plan

- [ ] **Previous version tagged**
  ```bash
  git tag production-backup-$(date +%Y%m%d)
  git push origin production-backup-$(date +%Y%m%d)
  ```

- [ ] **Database backup created**
  ```bash
  pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
  ```

- [ ] **Environment variables backed up**
  - Vercel environment variables documented
  - Render environment variables saved

- [ ] **Rollback procedure documented**
  - Steps to revert code
  - Database rollback commands
  - Service restart procedures

### ✅ Emergency Contacts

- [ ] **Team notification setup**
  - Deployment notification sent
  - Monitoring alerts configured
  - On-call contacts updated

---

## 🎯 Post-Deployment Verification

### ✅ Smoke Tests

- [ ] **Critical paths working**
  - [ ] User can register
  - [ ] User can login
  - [ ] User can create deed
  - [ ] User can upgrade plan
  - [ ] Admin can access dashboard

- [ ] **Performance acceptable**
  - Page load times < 3 seconds
  - API response times < 1 second
  - Database queries optimized

- [ ] **Error handling working**
  - 404 pages display correctly
  - Error messages user-friendly
  - No server errors exposed

### ✅ User Acceptance

- [ ] **Stakeholder approval**
  - Product owner sign-off
  - Key users tested system
  - Business requirements met

- [ ] **Documentation updated**
  - Deployment notes recorded
  - User guides updated
  - Support documentation current

---

## 🎉 Go-Live Checklist

### ✅ Final Steps

- [ ] **DNS/Domain configuration**
  - Custom domain pointed to Vercel
  - SSL certificate active
  - CDN configured

- [ ] **Monitoring active**
  - Uptime monitoring configured
  - Performance monitoring active
  - Error tracking enabled

- [ ] **Team notified**
  - Deployment completion announced
  - Support team briefed
  - Documentation shared

- [ ] **Success metrics defined**
  - KPIs identified
  - Monitoring dashboards created
  - Success criteria documented

### ✅ 24-Hour Monitoring

- [ ] **System stability verified**
  - No critical errors
  - Performance within SLA
  - User feedback positive

- [ ] **Metrics collection**
  - User registrations tracking
  - Deed creation metrics
  - Payment processing stats

- [ ] **Support readiness**
  - Support team trained
  - Escalation procedures active
  - Bug reporting process live

---

## 📞 Troubleshooting Guide

### Common Issues

#### Frontend not loading
```bash
# Check Vercel deployment status
vercel --prod
# Check build logs in Vercel dashboard
```

#### Backend API errors
```bash
# Check Render service logs
# Verify environment variables
# Test database connectivity
```

#### Database connection issues
```bash
# Verify DATABASE_URL format
# Check database service status
# Test connection manually
psql $DATABASE_URL -c "SELECT 1;"
```

#### Stripe webhook failures
```bash
# Check webhook endpoint URL
# Verify webhook secret
# Test webhook manually in Stripe dashboard
```

---

**Deployment completed successfully when all items are checked ✅**

---

**Last Updated:** January 2025  
**Checklist Version:** 1.0.0

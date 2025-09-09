# 🚀 Production Deployment Guide
## Dynamic Wizard Architecture Overhaul - Phase 4

**Version**: 3.0  
**Date**: December 2024  
**Status**: Production Ready  

---

## 📋 **Pre-Deployment Checklist**

### **✅ Code Quality & Testing**
- [ ] All Phase 1-3 components implemented and tested
- [ ] >95% test coverage achieved across frontend and backend
- [ ] Integration tests passing for all document types
- [ ] User acceptance tests completed for all personas
- [ ] Performance benchmarks met (see Performance Criteria)
- [ ] Security audit completed and vulnerabilities addressed
- [ ] Legal compliance validation passed
- [ ] Accessibility standards (WCAG 2.1 AA) verified

### **✅ Infrastructure Requirements**
- [ ] Frontend deployment environment configured (Vercel/Netlify)
- [ ] Backend deployment environment configured (Render/Railway)
- [ ] Database migrations prepared and tested
- [ ] Environment variables configured and secured
- [ ] SSL certificates installed and verified
- [ ] CDN configuration optimized
- [ ] Monitoring and logging systems configured

### **✅ Third-Party Integrations**
- [ ] OpenAI API key configured and rate limits verified
- [ ] TitlePoint API credentials validated
- [ ] Google Places API integration tested
- [ ] Analytics tracking (Google Analytics) configured
- [ ] Error reporting (Sentry) integrated
- [ ] Email service (SendGrid/Mailgun) configured

### **✅ Legal & Compliance**
- [ ] California legal code integration verified
- [ ] Document templates reviewed by legal counsel
- [ ] Privacy policy updated for AI features
- [ ] Terms of service updated
- [ ] Data retention policies implemented
- [ ] GDPR/CCPA compliance measures in place

---

## 🏗️ **Deployment Architecture**

### **Frontend Deployment (Vercel)**
```yaml
# vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://your-backend.onrender.com/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NEXT_PUBLIC_API_URL": "https://your-backend.onrender.com",
    "NEXT_PUBLIC_GOOGLE_PLACES_API_KEY": "@google_places_key",
    "NEXT_PUBLIC_GA_TRACKING_ID": "@ga_tracking_id",
    "NEXT_PUBLIC_SENTRY_DSN": "@sentry_dsn"
  },
  "functions": {
    "app/api/**/*.js": {
      "maxDuration": 30
    }
  }
}
```

### **Backend Deployment (Render)**
```yaml
# render.yaml
services:
  - type: web
    name: deedpro-backend
    env: python
    buildCommand: "pip install -r requirements.txt"
    startCommand: "uvicorn main:app --host 0.0.0.0 --port $PORT"
    envVars:
      - key: OPENAI_API_KEY
        sync: false
      - key: TITLEPOINT_API_KEY
        sync: false
      - key: GOOGLE_PLACES_API_KEY
        sync: false
      - key: DATABASE_URL
        sync: false
      - key: REDIS_URL
        sync: false
      - key: SENTRY_DSN
        sync: false
    healthCheckPath: "/health"
    numInstances: 2
    plan: standard
    region: oregon
    scaling:
      minInstances: 1
      maxInstances: 10
      targetMemoryPercent: 70
      targetCPUPercent: 70
```

### **Database Configuration**
```sql
-- Production database setup
-- PostgreSQL recommended for production

-- Create database
CREATE DATABASE deedpro_production;

-- Create user with limited privileges
CREATE USER deedpro_app WITH PASSWORD 'secure_password_here';
GRANT CONNECT ON DATABASE deedpro_production TO deedpro_app;
GRANT USAGE ON SCHEMA public TO deedpro_app;
GRANT CREATE ON SCHEMA public TO deedpro_app;

-- Performance optimizations
CREATE INDEX idx_wizard_state_user_id ON wizard_states(user_id);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_performance_metrics_timestamp ON performance_metrics(timestamp);

-- Enable row-level security
ALTER TABLE wizard_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
```

---

## 🔧 **Environment Configuration**

### **Frontend Environment Variables**
```bash
# .env.production
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_key
NEXT_PUBLIC_GA_TRACKING_ID=GA-XXXXXXXXX
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_VERSION=3.0.0
NEXT_PUBLIC_FEATURE_FLAGS=ai_assistance:true,chain_of_title:true,batch_processing:true
```

### **Backend Environment Variables**
```bash
# Production environment variables (Render)
OPENAI_API_KEY=sk-proj-your-openai-key
TITLEPOINT_API_KEY=your-titlepoint-key
GOOGLE_PLACES_API_KEY=your-google-places-key
DATABASE_URL=postgresql://user:password@host:port/database
REDIS_URL=redis://user:password@host:port
SENTRY_DSN=https://your-sentry-dsn
ENVIRONMENT=production
LOG_LEVEL=INFO
CORS_ORIGINS=https://your-frontend-domain.vercel.app
JWT_SECRET=your-jwt-secret-key
RATE_LIMIT_REQUESTS_PER_MINUTE=100
RATE_LIMIT_DAILY_COST_LIMIT=100.00
```

---

## 📊 **Monitoring & Observability**

### **Application Performance Monitoring**
```typescript
// frontend/src/lib/monitoring.ts
import { performanceMonitor } from './performance';

// Initialize monitoring in production
if (process.env.NODE_ENV === 'production') {
  performanceMonitor.setEnabled(true);
  
  // Configure Sentry
  import * as Sentry from '@sentry/nextjs';
  
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: 'production',
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // Filter out sensitive data
      if (event.request?.data) {
        delete event.request.data.password;
        delete event.request.data.apiKey;
      }
      return event;
    }
  });
  
  // Configure Google Analytics
  import { gtag } from 'ga-gtag';
  
  gtag('config', process.env.NEXT_PUBLIC_GA_TRACKING_ID, {
    page_title: 'DeedPro Wizard',
    page_location: window.location.href
  });
}
```

### **Backend Monitoring Configuration**
```python
# backend/monitoring/setup.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

def setup_monitoring():
    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        integrations=[
            FastApiIntegration(auto_enabling_integrations=False),
            SqlalchemyIntegration(),
        ],
        traces_sample_rate=0.1,
        environment="production",
        before_send=filter_sensitive_data
    )

def filter_sensitive_data(event, hint):
    # Remove sensitive information
    if 'request' in event and 'data' in event['request']:
        sensitive_keys = ['password', 'api_key', 'token', 'secret']
        for key in sensitive_keys:
            if key in event['request']['data']:
                event['request']['data'][key] = '[Filtered]'
    return event
```

### **Health Check Endpoints**
```python
# backend/api/health.py
from fastapi import APIRouter
from datetime import datetime
import psutil
import asyncio

router = APIRouter()

@router.get("/health")
async def health_check():
    """Comprehensive health check for production monitoring"""
    
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "3.0.0",
        "environment": "production"
    }
    
    try:
        # Database health
        db_start = time.time()
        # Perform simple DB query
        db_response_time = (time.time() - db_start) * 1000
        
        health_status["database"] = {
            "status": "healthy" if db_response_time < 100 else "degraded",
            "response_time_ms": db_response_time
        }
        
        # OpenAI API health
        ai_start = time.time()
        # Perform simple API test
        ai_response_time = (time.time() - ai_start) * 1000
        
        health_status["openai"] = {
            "status": "healthy" if ai_response_time < 2000 else "degraded",
            "response_time_ms": ai_response_time
        }
        
        # System resources
        health_status["system"] = {
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent
        }
        
        # Determine overall status
        if (health_status["database"]["status"] == "degraded" or 
            health_status["openai"]["status"] == "degraded" or
            health_status["system"]["memory_percent"] > 90):
            health_status["status"] = "degraded"
            
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["error"] = str(e)
    
    return health_status

@router.get("/metrics")
async def get_metrics():
    """Prometheus-compatible metrics endpoint"""
    
    metrics = []
    
    # Application metrics
    metrics.append("# HELP wizard_requests_total Total number of wizard requests")
    metrics.append("# TYPE wizard_requests_total counter")
    metrics.append(f"wizard_requests_total {get_request_count()}")
    
    metrics.append("# HELP wizard_response_time_seconds Response time in seconds")
    metrics.append("# TYPE wizard_response_time_seconds histogram")
    metrics.append(f"wizard_response_time_seconds {get_avg_response_time()}")
    
    metrics.append("# HELP wizard_errors_total Total number of errors")
    metrics.append("# TYPE wizard_errors_total counter")
    metrics.append(f"wizard_errors_total {get_error_count()}")
    
    return "\n".join(metrics)
```

---

## 🔒 **Security Configuration**

### **Frontend Security Headers**
```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' *.googletagmanager.com *.google-analytics.com;
      style-src 'self' 'unsafe-inline' fonts.googleapis.com;
      font-src 'self' fonts.gstatic.com;
      img-src 'self' data: *.google-analytics.com *.googletagmanager.com;
      connect-src 'self' *.render.com *.sentry.io *.google-analytics.com;
    `.replace(/\s{2,}/g, ' ').trim()
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

### **Backend Security Configuration**
```python
# backend/security/config.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.sessions import SessionMiddleware

def configure_security(app: FastAPI):
    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.getenv("CORS_ORIGINS", "").split(","),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["*"],
    )
    
    # Trusted hosts
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["your-backend.onrender.com", "localhost"]
    )
    
    # Session security
    app.add_middleware(
        SessionMiddleware,
        secret_key=os.getenv("JWT_SECRET"),
        https_only=True,
        same_site="strict"
    )
    
    # Rate limiting
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    
    limiter = Limiter(key_func=get_remote_address)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

---

## 🚀 **Deployment Process**

### **Step 1: Pre-Deployment Validation**
```bash
#!/bin/bash
# scripts/pre-deploy-check.sh

echo "🔍 Running pre-deployment validation..."

# Run all tests
echo "Running test suite..."
npm run test:ci
python -m pytest backend/tests/ -v

# Check code quality
echo "Checking code quality..."
npm run lint
npm run type-check
flake8 backend/
mypy backend/

# Security scan
echo "Running security scan..."
npm audit --audit-level moderate
safety check -r backend/requirements.txt

# Performance benchmarks
echo "Running performance benchmarks..."
npm run test:performance

# Build verification
echo "Verifying builds..."
npm run build
docker build -t deedpro-backend backend/

echo "✅ Pre-deployment validation complete!"
```

### **Step 2: Database Migration**
```bash
#!/bin/bash
# scripts/migrate-database.sh

echo "🗄️ Running database migrations..."

# Backup current database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations
alembic upgrade head

# Verify migration
python scripts/verify_migration.py

echo "✅ Database migration complete!"
```

### **Step 3: Frontend Deployment**
```bash
#!/bin/bash
# scripts/deploy-frontend.sh

echo "🌐 Deploying frontend to Vercel..."

# Build and deploy
vercel --prod --confirm

# Verify deployment
curl -f https://your-app.vercel.app/health || exit 1

# Update DNS if needed
# vercel domains add your-custom-domain.com

echo "✅ Frontend deployment complete!"
```

### **Step 4: Backend Deployment**
```bash
#!/bin/bash
# scripts/deploy-backend.sh

echo "🔧 Deploying backend to Render..."

# Deploy via Render API or Git push
git push render main

# Wait for deployment
echo "Waiting for deployment to complete..."
sleep 60

# Verify deployment
curl -f https://your-backend.onrender.com/health || exit 1

# Run post-deployment tests
python scripts/post_deploy_tests.py

echo "✅ Backend deployment complete!"
```

### **Step 5: Post-Deployment Verification**
```bash
#!/bin/bash
# scripts/post-deploy-verify.sh

echo "🔍 Running post-deployment verification..."

# Health checks
curl -f https://your-app.vercel.app/api/health
curl -f https://your-backend.onrender.com/health

# End-to-end tests
npm run test:e2e:production

# Performance validation
npm run test:performance:production

# Monitor for errors
echo "Monitoring for 5 minutes..."
sleep 300

# Check error rates
python scripts/check_error_rates.py

echo "✅ Post-deployment verification complete!"
```

---

## 📈 **Performance Criteria**

### **Response Time Targets**
- **Page Load**: < 2 seconds (95th percentile)
- **Step Transitions**: < 200ms (95th percentile)
- **AI Responses**: < 3 seconds (95th percentile)
- **Document Generation**: < 5 seconds (95th percentile)
- **API Calls**: < 1 second (95th percentile)

### **Availability Targets**
- **Uptime**: 99.9% (8.77 hours downtime/year max)
- **Error Rate**: < 0.1% (1 error per 1000 requests)
- **Recovery Time**: < 5 minutes for critical issues

### **Scalability Targets**
- **Concurrent Users**: 1000+ simultaneous users
- **Requests per Second**: 100+ RPS sustained
- **Database Connections**: 50+ concurrent connections
- **Memory Usage**: < 512MB per instance

---

## 🚨 **Incident Response Plan**

### **Severity Levels**
1. **Critical (P0)**: Complete service outage, data loss
2. **High (P1)**: Major feature broken, security breach
3. **Medium (P2)**: Minor feature issues, performance degradation
4. **Low (P3)**: Cosmetic issues, enhancement requests

### **Response Procedures**
```yaml
Critical (P0):
  - Response Time: 15 minutes
  - Escalation: Immediate
  - Communication: Status page + email alerts
  - Actions: 
    - Activate incident commander
    - Create war room
    - Implement rollback if needed
    - Communicate with stakeholders

High (P1):
  - Response Time: 1 hour
  - Escalation: Within 2 hours
  - Communication: Status page update
  - Actions:
    - Investigate and diagnose
    - Implement fix or workaround
    - Monitor for resolution

Medium (P2):
  - Response Time: 4 hours
  - Escalation: Within 24 hours
  - Communication: Internal notification
  - Actions:
    - Schedule fix in next release
    - Document issue and resolution

Low (P3):
  - Response Time: 24 hours
  - Escalation: As needed
  - Communication: Ticket system
  - Actions:
    - Add to backlog
    - Prioritize based on impact
```

### **Rollback Procedures**
```bash
#!/bin/bash
# scripts/emergency-rollback.sh

echo "🚨 EMERGENCY ROLLBACK INITIATED"

# Get last known good deployment
LAST_GOOD_COMMIT=$(git log --oneline -n 10 | grep "deploy:" | head -1 | cut -d' ' -f1)

echo "Rolling back to commit: $LAST_GOOD_COMMIT"

# Rollback frontend
vercel rollback --yes

# Rollback backend
git reset --hard $LAST_GOOD_COMMIT
git push render main --force

# Rollback database if needed
# psql $DATABASE_URL < backup_last_good.sql

# Verify rollback
sleep 60
curl -f https://your-app.vercel.app/health
curl -f https://your-backend.onrender.com/health

echo "✅ Rollback complete. Monitoring for stability..."
```

---

## 📊 **Success Metrics**

### **Technical Metrics**
- **Deployment Success Rate**: 95%+
- **Mean Time to Recovery (MTTR)**: < 30 minutes
- **Change Failure Rate**: < 5%
- **Lead Time for Changes**: < 2 hours

### **Business Metrics**
- **User Completion Rate**: 85%+
- **Document Generation Success**: 99%+
- **User Satisfaction Score**: 4.5/5+
- **Support Ticket Reduction**: 80%+

### **Performance Metrics**
- **Core Web Vitals**: All green
- **Lighthouse Score**: 90+
- **Error Rate**: < 0.1%
- **API Response Time**: < 1s average

---

## 🔄 **Maintenance & Updates**

### **Regular Maintenance Schedule**
- **Daily**: Automated health checks and monitoring
- **Weekly**: Performance review and optimization
- **Monthly**: Security updates and dependency upgrades
- **Quarterly**: Comprehensive system review and capacity planning

### **Update Procedures**
1. **Security Updates**: Immediate deployment within 24 hours
2. **Feature Updates**: Staged rollout over 1 week
3. **Major Releases**: Phased deployment with rollback plan
4. **Emergency Patches**: Hotfix deployment within 2 hours

---

## 📞 **Support & Escalation**

### **Contact Information**
- **Primary On-Call**: [Your Team Lead]
- **Secondary On-Call**: [Backup Team Member]
- **Infrastructure**: [DevOps Team]
- **Legal/Compliance**: [Legal Team]

### **External Vendors**
- **Vercel Support**: Enterprise support plan
- **Render Support**: Professional support plan
- **OpenAI Support**: API support channel
- **TitlePoint Support**: Integration support

---

**Deployment Checklist Complete** ✅  
**Production Ready** 🚀  
**Monitoring Active** 📊  
**Support Prepared** 📞



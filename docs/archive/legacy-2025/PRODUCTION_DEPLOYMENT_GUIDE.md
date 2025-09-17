# 🚀 Production Deployment Guide - Property Integration

## 📋 Deployment Overview

This guide covers deploying the Property Integration (Google Places, SiteX Data, TitlePoint) to your production environment.

**Environment**: Production Only  
**Backend**: Render  
**Frontend**: Vercel  
**Database**: PostgreSQL (Render)  

---

## 🎯 Pre-Deployment Checklist

### ✅ Environment Variables Added
- **Vercel** (Frontend):
  - `NEXT_PUBLIC_GOOGLE_API_KEY` 
  - `NEXT_PUBLIC_API_URL` 
  - `NEXT_PUBLIC_ENABLE_AI_FEATURES`
  
- **Render** (Backend):
  - `GOOGLE_API_KEY`
  - `TITLEPOINT_USER_ID`
  - `TITLEPOINT_PASSWORD`
  - `SITEX_API_KEY` (if required)

### ✅ Code Ready for Deployment
- Property Integration components created
- API endpoints implemented
- Database schema prepared
- Dependencies updated

---

## 🚀 Deployment Steps

### **Step 1: Deploy Backend (Render)**

1. **Push to GitHub** (triggers automatic Render deployment):
   ```bash
   git add .
   git commit -m "Add Property Integration - Google Places, SiteX, TitlePoint"
   git push origin main
   ```

2. **Monitor Render Deployment**:
   - Visit your Render dashboard
   - Watch the build logs for new dependencies installation
   - Verify successful deployment

3. **Run Database Migration** (via Render Shell):
   - Open Render dashboard → Your service → Shell
   - Navigate to scripts: `cd scripts`
   - Run deployment: `python deploy_property_integration.py`
   - Verify tables created successfully

### **Step 2: Deploy Frontend (Vercel)**

1. **Automatic Deployment**: Vercel will auto-deploy when you push to GitHub
2. **Monitor Vercel Dashboard**: 
   - Check build logs for new dependencies
   - Verify successful deployment
   - Test environment variables are active

### **Step 3: Verify Integration**

1. **Test Property Search**:
   - Navigate to `/create-deed` on your live site
   - Test Google Places autocomplete functionality
   - Verify address selection triggers data enrichment

2. **Check API Endpoints**:
   - Test `/api/property/validate` endpoint
   - Test `/api/property/enrich` endpoint
   - Monitor response times and data quality

---

## 🔧 Database Migration Commands

### **Run on Render Backend Shell**:

```bash
# Navigate to scripts directory
cd scripts

# Run the deployment script
python deploy_property_integration.py

# Verify tables were created
python -c "
import psycopg2
import os
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
cur.execute(\"SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'property%';\")
print('Property tables:', cur.fetchall())
conn.close()
"
```

### **Expected Database Tables**:
- `property_cache_enhanced`
- `api_integration_logs` 
- `property_search_history`

---

## 📊 Post-Deployment Verification

### **Frontend Checks**
- ✅ Google Places autocomplete loads
- ✅ Address selection works
- ✅ Form auto-population functions
- ✅ Error handling displays properly
- ✅ Loading states appear correctly

### **Backend Checks**
- ✅ Property validation endpoint responds
- ✅ Property enrichment endpoint responds
- ✅ Database connections established
- ✅ API services can connect to external APIs
- ✅ Logging is working correctly

### **Integration Workflow Test**
1. Navigate to create deed page
2. Start typing an address
3. Select from Google Places suggestions
4. Verify form auto-populates with:
   - Address components
   - APN (from SiteX)
   - Legal description (from TitlePoint)
   - Owner information (from TitlePoint)
   - County/FIPS data

---

## 🛠️ Troubleshooting

### **Google Places Not Working**
- Check Vercel environment variables
- Verify Google Cloud Console API is enabled
- Check domain restrictions in Google Cloud

### **Backend API Errors**
- Check Render logs for Python import errors
- Verify all environment variables are set
- Test database connectivity

### **TitlePoint/SiteX Connection Issues**
- Verify credentials in Render environment
- Check API service logs
- Test with sample data

---

## 📈 Monitoring Setup

### **Render Monitoring**
- Enable log aggregation
- Set up performance alerts
- Monitor database query performance

### **Vercel Analytics**
- Enable Web Analytics
- Monitor Core Web Vitals
- Track user experience metrics

### **Database Monitoring**
- Monitor connection pool usage
- Track query performance
- Set up storage alerts

---

## 🎉 Deployment Complete

Once all steps are completed successfully:

1. **Announce to Users**: New intelligent property search is live
2. **Monitor Performance**: Watch for any issues in first 24 hours
3. **Gather Feedback**: Track user adoption and satisfaction
4. **Optimize**: Use analytics to improve performance

---

**Status**: Ready for Production Deployment  
**Estimated Deployment Time**: 15-20 minutes  
**Rollback Plan**: Available via Git revert if needed

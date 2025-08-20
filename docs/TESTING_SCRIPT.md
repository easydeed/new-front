# 🧪 Property Integration Testing Script

## 📋 Step-by-Step Testing Guide

**Use this guide to systematically test your new property integration features.**

---

## 🚀 Pre-Testing: Verify Deployment

### **1. Check Render Backend**
1. Go to https://dashboard.render.com/
2. Find your DeedPro backend service
3. Verify status shows "Live" (green)
4. Check "Events" tab for successful deployment
5. Look for these success messages:
   ```
   Build succeeded
   Deploy succeeded  
   Service is live
   ```

### **2. Check Vercel Frontend**
1. Go to https://vercel.com/dashboard
2. Find your DeedPro frontend project
3. Verify latest deployment shows "Ready"
4. Check deployment logs for:
   ```
   Build succeeded
   Deployment completed
   Functions deployed
   ```

---
## 🧭 Production Smoke Test (TitlePoint)

1. Validate address (JWT required):
```bash
curl -s -X POST "$BACKEND/api/property/validate" \
 -H "Content-Type: application/json" \
 -H "Authorization: Bearer $TOKEN" \
 -d '{
  "fullAddress": "1358 5th St, La Verne, CA 91750",
  "street": "1358 5th St",
  "city": "La Verne",
  "state": "CA",
  "zip": "91750"
}' | jq .
```

2. Enrich LV (include normalized county, optional FIPS):
```bash
curl -s -X POST "$BACKEND/api/property/enrich" \
 -H "Content-Type: application/json" \
 -H "Authorization: Bearer $TOKEN" \
 -d '{
  "address": "1358 5th St, La Verne, CA 91750",
  "city": "La Verne",
  "state": "CA",
  "county": "Los Angeles",
  "fips": "06037"
}' | jq .
```

3. Enrich Tax (use known-good APN + county):
```bash
curl -s -X POST "$BACKEND/api/property/enrich" \
 -H "Content-Type: application/json" \
 -H "Authorization: Bearer $TOKEN" \
 -d '{
  "address": "",
  "city": "",
  "state": "CA",
  "county": "Los Angeles",
  "apn": "<YOUR_APN_HERE>"
}' | jq .
```

Expected:
- Validation: success=true, county present.
- Enrich LV/Tax: success=true; if LV empty, verify account access and parameters.


## 🗄️ Database Setup

### **Run Database Migration**

1. **Open Render Shell**:
   - Render Dashboard → Your Service → "Shell" tab
   - Wait for terminal to load

2. **Execute Commands**:
   ```bash
   # Navigate to scripts
   cd scripts
   
   # Run database migration
   python deploy_property_integration.py
   
   # You should see:
   # ✅ Connected to database
   # ✅ Creating property_cache_enhanced table...
   # ✅ Creating api_integration_logs table...
   # ✅ Creating property_search_history table...
   # ✅ Migration completed successfully!
   ```

3. **Verify Tables Created**:
   ```bash
   python -c "
   import psycopg2
   import os
   conn = psycopg2.connect(os.environ['DATABASE_URL'])
   cur = conn.cursor()
   cur.execute(\"SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%property%';\")
   result = cur.fetchall()
   print('Property tables created:', result)
   if len(result) >= 3:
       print('✅ All tables created successfully!')
   else:
       print('❌ Missing tables - check migration logs')
   conn.close()
   "
   ```

---

## 🧪 Frontend Integration Testing

### **Test 1: Basic Page Load**

1. **Navigate to Create Deed**:
   - Go to: `https://your-domain.com/create-deed`
   - Page should load without errors

2. **Visual Inspection**:
   - [ ] Property search field is visible
   - [ ] Search field has Google Places styling
   - [ ] No JavaScript console errors
   - [ ] Page layout looks correct [[memory:5508887]]

### **Test 2: Google Places Autocomplete**

1. **Start Typing Address**:
   - Click in the property address field
   - Type: "1600 Amphitheatre"
   - **Expected**: Dropdown appears with suggestions

2. **Verify Suggestions**:
   - [ ] Suggestions appear within 2 seconds
   - [ ] Multiple address options shown
   - [ ] Google Places formatting visible
   - [ ] Can navigate with arrow keys

3. **Test Address Selection**:
   - Click on "1600 Amphitheatre Parkway, Mountain View, CA, USA"
   - **Expected**: Address populates form fields

### **Test 3: Form Auto-Population**

1. **After Address Selection**:
   - [ ] Property address field filled
   - [ ] City field populated
   - [ ] State field populated  
   - [ ] ZIP code filled
   - [ ] Loading indicators appear briefly

2. **Check Network Tab**:
   - Open browser Developer Tools → Network tab
   - Should see API calls to:
     - `/api/property/validate`
     - `/api/property/enrich`

---

## 🔧 Backend API Testing

### **Test 4: Property Validation API**

1. **Get JWT Token**:
   - Log into your DeedPro account
   - Open Developer Tools → Application → Local Storage
   - Copy the JWT token value

2. **Test Validation Endpoint**:
   ```bash
   # Replace YOUR_JWT_TOKEN and YOUR_BACKEND_URL
   curl -X POST https://YOUR_BACKEND_URL.onrender.com/api/property/validate \
   -H "Content-Type: application/json" \
   -H "Authorization: Bearer YOUR_JWT_TOKEN" \
   -d '{
     "fullAddress": "1600 Amphitheatre Parkway, Mountain View, CA 94043",
     "street": "1600 Amphitheatre Parkway",
     "city": "Mountain View",
     "state": "CA",
     "zip": "94043"
   }'
   ```

3. **Expected Response**:
   ```json
   {
     "success": true,
     "data": {
       "formatted_address": "1600 Amphitheatre Parkway, Mountain View, CA 94043",
       "street_address": "1600 Amphitheatre Parkway",
       "city": "Mountain View",
       "county": "Santa Clara",
       "state": "CA",
       "zip_code": "94043"
     },
     "source": "google",
     "cached": false
   }
   ```

### **Test 5: Property Enrichment API**

1. **Test Enrichment Endpoint**:
   ```bash
   curl -X POST https://YOUR_BACKEND_URL.onrender.com/api/property/enrich \
   -H "Content-Type: application/json" \
   -H "Authorization: Bearer YOUR_JWT_TOKEN" \
   -d '{
     "address": "1600 Amphitheatre Parkway",
     "city": "Mountain View",
     "state": "CA",
     "county": "Santa Clara"
   }'
   ```

2. **Expected Response** (partial data depending on API availability):
   ```json
   {
     "success": true,
     "data": {
       "apn": "123-45-678",
       "fips": "06085",
       "county_name": "Santa Clara",
       "legal_description": "LOT 1 OF TRACT 12345...",
       "primary_owner": "Google LLC",
       "property_type": "Commercial"
     },
     "source": "enriched"
   }
   ```

---

## 🎯 End-to-End Workflow Test

### **Test 6: Complete Integration**

1. **Start Fresh Deed Creation**:
   - Navigate to `/create-deed`
   - Clear browser cache if needed

2. **Property Search Workflow**:
   ```
   Step 1: Type "123 Main Street, Los Angeles"
   Step 2: Select suggestion from dropdown
   Step 3: Watch form auto-populate
   Step 4: Verify data quality
   Step 5: Continue with deed creation
   ```

3. **Data Quality Checklist**:
   - [ ] Address formatted correctly
   - [ ] County information present
   - [ ] APN displayed (if available)
   - [ ] Legal description filled (if available)
   - [ ] Owner information shown (if available)

### **Test 7: Error Handling**

1. **Test Invalid Address**:
   - Type: "1234567890 Fake Street Nowhere"
   - **Expected**: Graceful error message

2. **Test Network Issues**:
   - Disconnect internet briefly
   - Try address search
   - **Expected**: Timeout error with retry option

---

## 📊 Performance Testing

### **Test 8: Response Times**

1. **Measure Performance**:
   - Use browser Developer Tools → Network tab
   - Search for property
   - Record timing:
     - Google Places response: < 500ms
     - Property validation: < 1000ms  
     - Property enrichment: < 2000ms
     - Total workflow: < 3000ms

2. **Load Testing**:
   - Search multiple properties rapidly
   - Verify no rate limiting issues
   - Check caching works (second search faster)

---

## 🔍 AI Integration Testing [[memory:5713272]]

### **Test 9: Enhanced AI Suggestions**

1. **Test AI with Property Data**:
   - Complete property search
   - Navigate to deed type selection
   - **Expected**: AI suggestions based on property type

2. **Verify AI Enhancement**:
   - [ ] AI uses property ownership data for suggestions
   - [ ] County-specific recommendations appear
   - [ ] Property value influences document suggestions

---

## ✅ Success Criteria

### **✅ Integration Fully Working When**:

1. **Frontend**:
   - ✅ Google Places autocomplete works
   - ✅ Address selection populates form
   - ✅ Loading states work correctly
   - ✅ Error handling displays properly

2. **Backend**:
   - ✅ Property validation returns data
   - ✅ Property enrichment works
   - ✅ Database stores cache correctly
   - ✅ API logs are being created

3. **Integration**:
   - ✅ Complete workflow under 3 seconds
   - ✅ Data accuracy is high
   - ✅ Error recovery works
   - ✅ User experience is smooth [[memory:5508887]]

---

## 🚨 Common Issues & Quick Fixes

### **Google Places Not Working**
```
Issue: No suggestions appear
Fix: Check NEXT_PUBLIC_GOOGLE_API_KEY in Vercel
```

### **Backend 500 Errors**
```
Issue: API endpoints return errors
Fix: Check Render logs for Python import errors
```

### **Database Connection Issues**
```
Issue: Cannot connect to database
Fix: Verify DATABASE_URL in Render environment
```

### **TitlePoint/SiteX Timeout**
```
Issue: Property enrichment takes too long
Fix: Check credentials and service availability
```

---

## 📞 After Testing Complete

### **If All Tests Pass** ✅:
1. **Announce to Users**: New intelligent property search is live!
2. **Monitor Usage**: Watch for user adoption
3. **Gather Feedback**: Collect user experience data
4. **Optimize Performance**: Fine-tune based on real usage

### **If Issues Found** ❌:
1. **Document Issues**: Note specific problems
2. **Check Logs**: Review Render/Vercel logs
3. **Fix Critical Issues**: Address blocking problems first
4. **Retest**: Verify fixes work correctly

---

**Testing Status**: Ready to Begin  
**Estimated Testing Time**: 30-45 minutes  
**Success Rate Target**: 95%+ of test cases passing

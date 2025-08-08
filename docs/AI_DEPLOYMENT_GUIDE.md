# 🚀 AI Features Deployment Guide

## Overview

This guide covers the deployment and configuration of DeedPro's AI-enhanced deed generation features, including database schema updates, environment configuration, and performance optimization.

---

## 📋 Pre-Deployment Checklist

### Requirements
- ✅ **Backend**: FastAPI with PostgreSQL access
- ✅ **Frontend**: Next.js with Vercel deployment
- ✅ **Database**: PostgreSQL 12+ with admin access
- ✅ **Environment**: Production environment variables configured
- ✅ **Optional**: OpenAI API key for enhanced AI features

### Backup Considerations
- **Database backup** before schema changes
- **Environment variables backup**
- **Current deployment rollback plan**

---

## 🗄️ Database Schema Deployment

### Step 1: Create AI Enhancement Tables

Run these SQL commands on your production PostgreSQL database:

```sql
-- User Profiles Table for AI personalization
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    company_name VARCHAR(255),
    business_address TEXT,
    license_number VARCHAR(50),
    role VARCHAR(50) DEFAULT 'escrow_officer',
    default_county VARCHAR(100),
    notary_commission_exp DATE,
    preferred_deed_type VARCHAR(50) DEFAULT 'grant_deed',
    auto_populate_company_info BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Property Cache Table for intelligent suggestions
CREATE TABLE IF NOT EXISTS property_cache (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    property_address TEXT NOT NULL,
    legal_description TEXT,
    apn VARCHAR(50),
    county VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(10),
    zip_code VARCHAR(10),
    lookup_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, property_address)
);

-- User Preferences Table for workflow customization
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    default_recording_office VARCHAR(255),
    standard_disclaimers TEXT,
    enable_ai_suggestions BOOLEAN DEFAULT TRUE,
    preferred_templates TEXT, -- JSON for template customizations
    notification_preferences TEXT, -- JSON for notification settings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_property_cache_user_id ON property_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_property_cache_address ON property_cache(property_address);
CREATE INDEX IF NOT EXISTS idx_property_cache_lookup_date ON property_cache(lookup_date);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
```

### Step 2: Verify Schema Creation

```sql
-- Check that tables were created successfully
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('user_profiles', 'property_cache', 'user_preferences')
ORDER BY table_name, ordinal_position;

-- Verify indexes
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE tablename IN ('user_profiles', 'property_cache', 'user_preferences');
```

---

## ⚙️ Backend Deployment

### Step 1: Environment Variables

Add these optional environment variables to your backend:

```bash
# AI Enhancement (Optional)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Property Cache Settings
PROPERTY_CACHE_RETENTION_DAYS=90
MAX_CACHED_PROPERTIES_PER_USER=1000

# AI Suggestion Settings
AI_SUGGESTION_CONFIDENCE_THRESHOLD=0.7
AI_DEBOUNCE_DELAY_MS=1000
```

### Step 2: Deploy Updated Backend Code

The AI enhancement code is already integrated into the main backend files:
- `backend/database.py` - Enhanced with AI database functions
- `backend/ai_assist.py` - Enhanced with smart defaults and validation
- `backend/main.py` - Enhanced with new AI endpoints

**Render Deployment (Automatic):**
```bash
# Push to GitHub triggers automatic deployment
git add backend/
git commit -m "deploy: AI enhancement features"
git push origin main
```

**Manual Deployment:**
```bash
# If deploying manually to your server
pip install -r requirements.txt
python backend/main.py
```

### Step 3: Verify Backend Deployment

Test the new AI endpoints:

```bash
# Test health endpoint
curl https://deedpro-main-api.onrender.com/health

# Test enhanced profile endpoint (requires auth token)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://deedpro-main-api.onrender.com/users/profile/enhanced

# Test AI suggestions endpoint (requires auth token)
curl -X POST \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"deedType":"grant_deed","propertySearch":"123 Main St"}' \
     https://deedpro-main-api.onrender.com/ai/deed-suggestions
```

---

## 🌐 Frontend Deployment

### Step 1: Environment Variables

Ensure these environment variables are set in Vercel:

```bash
# Required
NEXT_PUBLIC_API_URL=https://deedpro-main-api.onrender.com

# Optional for enhanced AI features
NEXT_PUBLIC_ENABLE_AI_FEATURES=true
NEXT_PUBLIC_AI_DEBOUNCE_DELAY=1000
```

### Step 2: Deploy Frontend Code

**Vercel Deployment (Automatic):**
```bash
# Push to GitHub triggers automatic deployment
git add frontend/
git commit -m "deploy: AI-enhanced frontend features"
git push origin main
```

**Manual Vercel Deployment:**
```bash
cd frontend
vercel --prod
```

### Step 3: Verify Frontend Deployment

1. **Visit the live site**: https://deedpro-frontend-new.vercel.app
2. **Test AI features**:
   - Login to account
   - Go to deed wizard (`/create-deed`)
   - Look for AI tips at the top
   - Try property address suggestions
   - Verify AI suggestion indicators (✨ icons)

---

## 🔧 Configuration and Testing

### User Profile Migration

For existing users, you may want to create default profiles:

```sql
-- Create default profiles for existing users
INSERT INTO user_profiles (user_id, role, auto_populate_company_info)
SELECT id, 'escrow_officer', true
FROM users
WHERE id NOT IN (SELECT user_id FROM user_profiles);
```

### Test AI Features

#### 1. Profile Setup Test
1. **Login** to account settings
2. **Complete profile** with company info
3. **Verify** profile saves correctly
4. **Check** that AI suggestions appear in deed wizard

#### 2. Property Cache Test
1. **Search** for a property address in deed wizard
2. **Complete** the deed with property details
3. **Start new deed** and search same address
4. **Verify** property appears in suggestions dropdown

#### 3. Smart Defaults Test
1. **Complete user profile** with company name
2. **Start new deed** creation
3. **Verify** recording information auto-populates
4. **Check** AI tips appear with contextual guidance

#### 4. Validation Test
1. **Enter invalid data** (e.g., wrong APN format)
2. **Verify** validation warnings appear
3. **Check** suggestions for improvement
4. **Confirm** deed preview works with validation

---

## 📊 Performance Monitoring

### Database Performance

Monitor these queries for performance:

```sql
-- Monitor property cache usage
SELECT 
    COUNT(*) as total_cached_properties,
    COUNT(DISTINCT user_id) as users_with_cache,
    AVG(EXTRACT(days FROM (NOW() - lookup_date))) as avg_cache_age_days
FROM property_cache;

-- Monitor user profile completion
SELECT 
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN company_name IS NOT NULL THEN 1 END) as profiles_with_company,
    COUNT(CASE WHEN auto_populate_company_info = true THEN 1 END) as ai_enabled_profiles
FROM user_profiles;

-- Monitor AI endpoint usage (if logging implemented)
SELECT 
    endpoint,
    COUNT(*) as request_count,
    AVG(response_time_ms) as avg_response_time
FROM api_logs 
WHERE endpoint LIKE '%ai%' 
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY endpoint;
```

### Application Metrics

Monitor these application metrics:

- **AI suggestion response time**: < 500ms target
- **Property cache hit rate**: > 80% for return users
- **Profile completion rate**: Target 70%+ of active users
- **User satisfaction**: Track via feedback and usage patterns

---

## 🚨 Troubleshooting

### Common Issues

#### "AI suggestions not appearing"
**Symptoms**: Users don't see AI tips or suggestions

**Diagnostics**:
```bash
# Check if user has profile
SELECT * FROM user_profiles WHERE user_id = <USER_ID>;

# Check property cache
SELECT * FROM property_cache WHERE user_id = <USER_ID> ORDER BY lookup_date DESC LIMIT 5;

# Check backend logs for AI endpoint errors
grep "ai/deed-suggestions" /var/log/backend.log
```

**Solutions**:
1. Verify user completes profile in account settings
2. Check network connectivity and API response times
3. Ensure environment variables are set correctly

#### "Property suggestions empty"
**Symptoms**: Property dropdown shows no suggestions

**Diagnostics**:
```sql
-- Check for similar addresses in cache
SELECT * FROM property_cache 
WHERE user_id = <USER_ID> 
  AND property_address ILIKE '%<SEARCH_TERM>%';
```

**Solutions**:
1. User needs to build cache by completing a few deeds first
2. Verify address format consistency
3. Check if cache retention period expired

#### "Slow AI response times"
**Symptoms**: AI suggestions take > 2 seconds to appear

**Diagnostics**:
- Check database query performance
- Monitor OpenAI API response times (if using)
- Review server resource usage

**Solutions**:
1. Optimize database queries with better indexes
2. Implement response caching for common suggestions
3. Consider increasing server resources

### Database Maintenance

#### Clean Old Cache Entries
```sql
-- Remove cache entries older than 90 days
DELETE FROM property_cache 
WHERE lookup_date < NOW() - INTERVAL '90 days';

-- Update statistics for query optimizer
ANALYZE property_cache;
ANALYZE user_profiles;
ANALYZE user_preferences;
```

#### Monitor Table Sizes
```sql
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE tablename IN ('user_profiles', 'property_cache', 'user_preferences');
```

---

## 🔄 Rollback Plan

If issues arise, here's the rollback strategy:

### 1. Disable AI Features (Soft Rollback)
```sql
-- Disable AI suggestions for all users temporarily
UPDATE user_preferences SET enable_ai_suggestions = false;
```

### 2. Frontend Rollback
```bash
# Revert to previous frontend deployment
cd frontend
vercel rollback
```

### 3. Backend Rollback
```bash
# Revert to previous backend version
git revert <commit-hash>
git push origin main
```

### 4. Database Rollback (Last Resort)
```sql
-- Only if absolutely necessary - removes AI tables
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS property_cache;
DROP TABLE IF EXISTS user_profiles;
```

---

## 📈 Success Metrics

Track these metrics to measure AI feature success:

### User Adoption
- **Profile completion rate**: % of users with complete profiles
- **AI feature usage**: % of deeds created with AI assistance
- **Property cache utilization**: % of searches with cache hits

### Performance Impact
- **Time to create deed**: Reduction in average completion time
- **Error reduction**: Decrease in validation errors and corrections
- **User satisfaction**: Feedback scores and usage retention

### Technical Metrics
- **API response times**: < 500ms for AI suggestions
- **Database performance**: Query times and resource usage
- **System reliability**: Uptime and error rates

---

## 🔮 Future Considerations

### Scalability
- **Database partitioning** for property cache as it grows
- **Caching layer** (Redis) for frequently accessed suggestions
- **API rate limiting** to prevent abuse of AI endpoints

### Feature Enhancements
- **Machine learning models** for better suggestions
- **Integration APIs** with title and escrow software
- **Multi-language support** for diverse user base

### Monitoring
- **Real-time dashboards** for AI feature performance
- **User behavior analytics** for feature optimization
- **A/B testing framework** for UI improvements

---

**Deployment completed successfully! Your AI-enhanced deed generation system is now live and ready to provide users with that "walking on a cloud" experience.** 🎉

For support during deployment, contact the development team or refer to the troubleshooting section above.

-- DeedPro Production Database Fixes
-- Execute these commands in your Render PostgreSQL database
-- Access: Render Dashboard > PostgreSQL Service > Connect Tab

-- =============================================================================
-- Phase 1: Create Missing Tables
-- =============================================================================

-- Fix 1: Create plan_limits table (Critical - fixes profile endpoint)
CREATE TABLE IF NOT EXISTS plan_limits (
    id SERIAL PRIMARY KEY,
    plan_name VARCHAR(50) UNIQUE NOT NULL,
    max_deeds_per_month INTEGER,
    api_calls_per_month INTEGER,
    ai_assistance BOOLEAN DEFAULT TRUE,
    integrations_enabled BOOLEAN DEFAULT FALSE,
    priority_support BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fix 2: Create user_profiles table (for AI suggestions)
CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    business_address TEXT,
    license_number VARCHAR(100),
    role VARCHAR(50),
    default_county VARCHAR(100),
    preferred_deed_type VARCHAR(50) DEFAULT 'grant_deed',
    auto_populate_company_info BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fix 3: Create pricing table (for Stripe integration)
CREATE TABLE IF NOT EXISTS pricing (
    id SERIAL PRIMARY KEY,
    plan_name VARCHAR(50) UNIQUE NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stripe_price_id VARCHAR(50),
    stripe_product_id VARCHAR(50),
    features JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fix 4: Create deeds table (if missing)
CREATE TABLE IF NOT EXISTS deeds (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    deed_type VARCHAR(50) NOT NULL,
    grantor VARCHAR(255),
    grantee VARCHAR(255),
    property_address TEXT,
    apn VARCHAR(50),
    county VARCHAR(100),
    deed_data JSONB,
    html_content TEXT,
    pdf_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- Phase 2: Insert Default Data
-- =============================================================================

-- Insert plan limits
INSERT INTO plan_limits (plan_name, max_deeds_per_month, api_calls_per_month, ai_assistance, integrations_enabled, priority_support) 
VALUES
('free', 5, 100, true, false, false),
('professional', -1, 1000, true, true, true),
('enterprise', -1, 5000, true, true, true)
ON CONFLICT (plan_name) DO NOTHING;

-- Insert pricing data
INSERT INTO pricing (plan_name, price, features) VALUES
('free', 0.00, '["5 deeds per month", "Basic deed templates", "Email support", "Standard processing"]'::jsonb),
('professional', 29.00, '["Unlimited deeds", "Advanced templates", "Priority support", "SoftPro integration", "AI assistance", "Bulk processing"]'::jsonb),
('enterprise', 99.00, '["Everything in Professional", "API access", "Custom templates", "White-label options", "Team management", "Dedicated support", "Custom integrations"]'::jsonb)
ON CONFLICT (plan_name) DO NOTHING;

-- =============================================================================
-- Phase 3: Fix Existing User Data
-- =============================================================================

-- Fix test user role (Critical)
UPDATE users SET role = 'user' WHERE email = 'test@deedpro-check.com' AND role IS NULL;

-- Ensure all users have a plan assigned
UPDATE users SET plan = 'free' WHERE plan IS NULL;

-- Ensure all users have is_active = true
UPDATE users SET is_active = true WHERE is_active IS NULL;

-- =============================================================================
-- Phase 4: Create Indexes for Performance
-- =============================================================================

-- User performance indexes
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Deed performance indexes
CREATE INDEX IF NOT EXISTS idx_deeds_user_id ON deeds(user_id);
CREATE INDEX IF NOT EXISTS idx_deeds_created_at ON deeds(created_at);
CREATE INDEX IF NOT EXISTS idx_deeds_status ON deeds(status);

-- User profile indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- =============================================================================
-- Phase 5: Verification Queries (Run to confirm fixes)
-- =============================================================================

-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('plan_limits', 'user_profiles', 'pricing', 'deeds')
ORDER BY table_name;

-- Check plan limits data
SELECT * FROM plan_limits ORDER BY plan_name;

-- Check pricing data  
SELECT plan_name, price, array_length(features, 1) as feature_count FROM pricing ORDER BY price;

-- Check test user
SELECT id, email, role, plan, is_active FROM users WHERE email = 'test@deedpro-check.com';

-- Check user count by plan
SELECT plan, COUNT(*) as user_count FROM users GROUP BY plan;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

-- If all queries above run without errors, your database is fixed!
-- Next steps:
-- 1. Add Stripe environment variables to Render
-- 2. Redeploy your backend service
-- 3. Test the profile endpoint: GET /users/profile
-- 4. Test deed preview: POST /generate-deed-preview

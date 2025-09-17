# 🗄️ Database Schema Documentation

## 🎯 Overview

Complete documentation of the DeedPro PostgreSQL database schema, including tables, relationships, indexes, and data flows.

**Database System:** PostgreSQL 12+  
**Connection Library:** psycopg2  
**Migration Strategy:** Script-based initialization  
**Backup Strategy:** Automated daily backups  

---

## 📊 Database Architecture

### Entity Relationship Overview

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    Users    │    │    Deeds    │    │ Shared Deeds│
│             │───▶│             │───▶│             │
│ - id (PK)   │    │ - user_id   │    │ - deed_id   │
│ - email     │    │ - deed_type │    │ - recipient │
│ - plan      │    │ - status    │    │ - status    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                                      
       ▼                                      
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│Subscriptions│    │ Plan Limits │    │   Pricing   │
│             │    │             │    │             │
│ - user_id   │    │ - plan_name │    │ - plan_name │
│ - stripe_id │    │ - max_deeds │    │ - price     │
│ - status    │    │ - features  │    │ - stripe_id │
└─────────────┘    └─────────────┘    └─────────────┘
```

---

## 📋 Table Specifications

### Users Table

**Purpose:** Core user management with authentication and plan tracking

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    company_name VARCHAR(255),
    company_type VARCHAR(50),
    phone VARCHAR(20),
    state CHAR(2) NOT NULL,
    subscribe BOOLEAN DEFAULT FALSE,
    plan VARCHAR(50) DEFAULT 'free',
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    widget_access BOOLEAN DEFAULT FALSE
);
```

**Indexes:**
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_plan ON users(plan);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
```

**Field Descriptions:**

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | SERIAL | Primary key | NOT NULL, AUTO_INCREMENT |
| `email` | VARCHAR(255) | User's email address | UNIQUE, NOT NULL |
| `password_hash` | VARCHAR(255) | bcrypt hashed password | NOT NULL |
| `full_name` | VARCHAR(255) | User's display name | NOT NULL |
| `role` | VARCHAR(50) | User role | Values: 'admin', 'user', 'real_estate_agent', 'title_officer' |
| `company_name` | VARCHAR(255) | Company affiliation | Optional |
| `company_type` | VARCHAR(50) | Type of company | Values: 'title_company', 'real_estate', 'law_firm', 'other' |
| `phone` | VARCHAR(20) | Contact phone number | Optional |
| `state` | CHAR(2) | US state code | NOT NULL, 2-letter state code |
| `subscribe` | BOOLEAN | Email subscription opt-in | DEFAULT FALSE |
| `plan` | VARCHAR(50) | Current subscription plan | Values: 'free', 'professional', 'enterprise' |
| `stripe_customer_id` | VARCHAR(255) | Stripe customer reference | Optional, set during first payment |
| `widget_access` | BOOLEAN | Widget licensing access | DEFAULT FALSE, managed by addon system |

---

### Deeds Table

**Purpose:** Document storage and management with comprehensive deed information

```sql
CREATE TABLE deeds (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    deed_type VARCHAR(100) NOT NULL,
    property_address TEXT NOT NULL,
    apn VARCHAR(50),
    county VARCHAR(100),
    legal_description TEXT,
    owner_type VARCHAR(100),
    sales_price DECIMAL(15,2),
    grantee_name VARCHAR(255),
    vesting VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Additional deed-specific fields
    grantor_name VARCHAR(255),
    recording_requested_by VARCHAR(255),
    mail_to TEXT,
    order_no VARCHAR(100),
    escrow_no VARCHAR(100),
    documentary_tax VARCHAR(50),
    city VARCHAR(100),
    date_field DATE,
    grantor_signature VARCHAR(255),
    county_notary VARCHAR(100),
    notary_date DATE,
    notary_name VARCHAR(255),
    appeared_before_notary VARCHAR(255),
    notary_signature VARCHAR(255)
);
```

**Indexes:**
```sql
CREATE INDEX idx_deeds_user_id ON deeds(user_id);
CREATE INDEX idx_deeds_status ON deeds(status);
CREATE INDEX idx_deeds_type ON deeds(deed_type);
CREATE INDEX idx_deeds_created ON deeds(created_at);
CREATE INDEX idx_deeds_county ON deeds(county);
```

**Field Descriptions:**

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | SERIAL | Primary key | NOT NULL, AUTO_INCREMENT |
| `user_id` | INTEGER | Owner of the deed | FOREIGN KEY to users(id), CASCADE DELETE |
| `deed_type` | VARCHAR(100) | Type of deed | Values: 'Grant Deed', 'Quitclaim Deed', 'Warranty Deed' |
| `property_address` | TEXT | Full property address | NOT NULL |
| `apn` | VARCHAR(50) | Assessor's Parcel Number | Optional |
| `county` | VARCHAR(100) | County where property is located | Optional |
| `legal_description` | TEXT | Legal description of property | Optional |
| `owner_type` | VARCHAR(100) | Type of ownership | Values: 'individual', 'joint', 'corporate', 'trust' |
| `sales_price` | DECIMAL(15,2) | Sale price of property | Optional, 2 decimal places |
| `grantee_name` | VARCHAR(255) | Name of person receiving property | Optional |
| `vesting` | VARCHAR(255) | How title is held | Optional |
| `status` | VARCHAR(50) | Current deed status | Values: 'draft', 'in_progress', 'completed', 'cancelled' |

---

### Shared Deeds Table

**Purpose:** Collaboration system for deed approval and review

```sql
CREATE TABLE shared_deeds (
    id SERIAL PRIMARY KEY,
    deed_id INTEGER REFERENCES deeds(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    message TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    approval_token VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    comments TEXT
);
```

**Indexes:**
```sql
CREATE INDEX idx_shared_deeds_deed_id ON shared_deeds(deed_id);
CREATE INDEX idx_shared_deeds_recipient ON shared_deeds(recipient_email);
CREATE INDEX idx_shared_deeds_token ON shared_deeds(approval_token);
CREATE INDEX idx_shared_deeds_status ON shared_deeds(status);
```

**Field Descriptions:**

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `approval_token` | VARCHAR(255) | Unique token for approval link | UNIQUE, generated UUID |
| `status` | VARCHAR(50) | Approval status | Values: 'pending', 'approved', 'rejected', 'expired' |
| `comments` | TEXT | Reviewer comments | Optional |

---

### Plan Limits Table

**Purpose:** Configuration of plan features and limitations

```sql
CREATE TABLE plan_limits (
    id SERIAL PRIMARY KEY,
    plan_name VARCHAR(50) UNIQUE NOT NULL,
    max_deeds_per_month INTEGER,
    api_calls_per_month INTEGER,
    ai_assistance BOOLEAN DEFAULT TRUE,
    integrations_enabled BOOLEAN DEFAULT FALSE,
    priority_support BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Default Data:**
```sql
INSERT INTO plan_limits (plan_name, max_deeds_per_month, api_calls_per_month, ai_assistance, integrations_enabled, priority_support) VALUES
('free', 5, 100, TRUE, FALSE, FALSE),
('professional', -1, 1000, TRUE, TRUE, TRUE),
('enterprise', -1, 5000, TRUE, TRUE, TRUE);
```

**Field Descriptions:**

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `plan_name` | VARCHAR(50) | Plan identifier | UNIQUE, matches users.plan |
| `max_deeds_per_month` | INTEGER | Monthly deed limit | -1 = unlimited |
| `api_calls_per_month` | INTEGER | Monthly API call limit | -1 = unlimited |
| `ai_assistance` | BOOLEAN | AI features enabled | DEFAULT TRUE |
| `integrations_enabled` | BOOLEAN | External API access | DEFAULT FALSE |
| `priority_support` | BOOLEAN | Priority customer support | DEFAULT FALSE |

---

### Subscriptions Table

**Purpose:** Stripe subscription management and billing tracking

```sql
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    status VARCHAR(50) NOT NULL,
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    plan_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
```sql
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
```

**Field Descriptions:**

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `stripe_subscription_id` | VARCHAR(255) | Stripe subscription reference | UNIQUE |
| `status` | VARCHAR(50) | Subscription status | Values from Stripe: 'active', 'canceled', 'past_due', 'unpaid' |
| `current_period_start` | TIMESTAMP | Billing period start | Set by Stripe webhooks |
| `current_period_end` | TIMESTAMP | Billing period end | Set by Stripe webhooks |

---

### Pricing Table

**Purpose:** Dynamic pricing management with Stripe integration

```sql
CREATE TABLE pricing (
    id SERIAL PRIMARY KEY,
    plan_name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    features TEXT[],
    stripe_price_id VARCHAR(255),
    stripe_product_id VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
```sql
CREATE INDEX idx_pricing_plan_name ON pricing(plan_name);
CREATE INDEX idx_pricing_active ON pricing(is_active);
CREATE INDEX idx_pricing_stripe_price ON pricing(stripe_price_id);
```

**Default Data:**
```sql
INSERT INTO pricing (plan_name, price, features) VALUES
('Starter', 0.00, ARRAY['5 deeds/month', 'Basic deed wizard', 'Standard templates']),
('Professional', 29.00, ARRAY['Unlimited deeds', 'Advanced templates', 'SoftPro integration', 'Priority support']),
('Enterprise', 99.00, ARRAY['All features', 'API access', 'Custom templates', 'Team management', 'White-label option']);
```

---

### API Usage Table

**Purpose:** Track API calls for rate limiting and analytics

```sql
CREATE TABLE api_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_time_ms INTEGER,
    status_code INTEGER,
    ip_address INET
);
```

**Indexes:**
```sql
CREATE INDEX idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX idx_api_usage_timestamp ON api_usage(timestamp);
CREATE INDEX idx_api_usage_endpoint ON api_usage(endpoint);
```

---

### Audit Logs Table

**Purpose:** Security and compliance audit trail

```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
```sql
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_details ON audit_logs USING GIN(details);
```

**Field Descriptions:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `action` | VARCHAR(100) | Action performed | 'login', 'create_deed', 'update_user' |
| `resource_type` | VARCHAR(50) | Type of resource | 'user', 'deed', 'subscription' |
| `resource_id` | INTEGER | ID of affected resource | Deed ID, User ID, etc. |
| `details` | JSONB | Additional action details | JSON with context data |

---

## 🔄 Data Relationships

### Primary Relationships

```sql
-- User to Deeds (One-to-Many)
users.id → deeds.user_id

-- User to Subscriptions (One-to-One/Many)
users.id → subscriptions.user_id

-- Deed to Shared Deeds (One-to-Many)
deeds.id → shared_deeds.deed_id

-- Plan Limits Reference
users.plan → plan_limits.plan_name (Logical relationship)
```

### Cascade Rules

```sql
-- When user is deleted, cascade to:
- deeds (CASCADE DELETE)
- subscriptions (CASCADE DELETE)
- shared_deeds (via deed CASCADE DELETE)
- api_usage (CASCADE DELETE)
- audit_logs (SET NULL - preserve log but remove user reference)
```

---

## 📊 Data Flow Patterns

### User Registration Flow
```sql
-- 1. Create user record
INSERT INTO users (email, password_hash, full_name, role, state, plan)
VALUES ('user@example.com', '$2b$12$...', 'John Doe', 'user', 'CA', 'free');

-- 2. Check plan limits
SELECT * FROM plan_limits WHERE plan_name = 'free';

-- 3. Log registration
INSERT INTO audit_logs (user_id, action, details)
VALUES (1, 'user_registered', '{"email": "user@example.com"}');
```

### Deed Creation Flow
```sql
-- 1. Check user's current usage
SELECT COUNT(*) FROM deeds 
WHERE user_id = 1 
AND created_at >= date_trunc('month', CURRENT_DATE);

-- 2. Check plan limits
SELECT pl.max_deeds_per_month 
FROM plan_limits pl 
JOIN users u ON u.plan = pl.plan_name 
WHERE u.id = 1;

-- 3. Create deed if within limits
INSERT INTO deeds (user_id, deed_type, property_address, status)
VALUES (1, 'Grant Deed', '123 Main St', 'draft');

-- 4. Log action
INSERT INTO audit_logs (user_id, action, resource_type, resource_id)
VALUES (1, 'deed_created', 'deed', LASTVAL());
```

### Subscription Upgrade Flow
```sql
-- 1. Update user plan
UPDATE users SET plan = 'professional', updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- 2. Create/update subscription record
INSERT INTO subscriptions (user_id, stripe_subscription_id, status, plan_name)
VALUES (1, 'sub_1234567890', 'active', 'professional')
ON CONFLICT (stripe_subscription_id) 
DO UPDATE SET status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP;

-- 3. Log upgrade
INSERT INTO audit_logs (user_id, action, details)
VALUES (1, 'plan_upgraded', '{"from": "free", "to": "professional"}');
```

---

## 🔍 Query Patterns

### Common Queries

#### User Dashboard Metrics
```sql
-- Get user's deed statistics
SELECT 
    COUNT(*) as total_deeds,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_deeds,
    COUNT(*) FILTER (WHERE status = 'draft') as draft_deeds,
    COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) as this_month
FROM deeds 
WHERE user_id = $1;
```

#### Plan Usage Checking
```sql
-- Check if user can create more deeds
WITH user_plan AS (
    SELECT u.id, u.plan, pl.max_deeds_per_month
    FROM users u
    JOIN plan_limits pl ON u.plan = pl.plan_name
    WHERE u.id = $1
),
monthly_usage AS (
    SELECT COUNT(*) as deeds_this_month
    FROM deeds
    WHERE user_id = $1 
    AND created_at >= date_trunc('month', CURRENT_DATE)
)
SELECT 
    up.max_deeds_per_month,
    mu.deeds_this_month,
    CASE 
        WHEN up.max_deeds_per_month = -1 THEN TRUE
        WHEN mu.deeds_this_month < up.max_deeds_per_month THEN TRUE
        ELSE FALSE
    END as can_create_deed
FROM user_plan up, monthly_usage mu;
```

#### Admin Analytics
```sql
-- Revenue by plan (last 30 days)
SELECT 
    p.plan_name,
    p.price,
    COUNT(s.id) as active_subscriptions,
    SUM(p.price) as monthly_revenue
FROM pricing p
LEFT JOIN subscriptions s ON s.plan_name = p.plan_name AND s.status = 'active'
WHERE p.is_active = TRUE
GROUP BY p.plan_name, p.price
ORDER BY monthly_revenue DESC;
```

### Performance Optimization Queries

#### Index Usage Analysis
```sql
-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_tup_read + idx_tup_fetch DESC;
```

#### Query Performance
```sql
-- Find slow queries (requires pg_stat_statements)
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
WHERE query LIKE '%deeds%'
ORDER BY mean_time DESC
LIMIT 10;
```

---

## 🛠️ Database Maintenance

### Regular Maintenance Tasks

#### Monthly Usage Reset
```sql
-- Reset monthly counters (run on 1st of each month)
UPDATE users SET 
    deeds_count = (
        SELECT COUNT(*) FROM deeds 
        WHERE user_id = users.id 
        AND created_at >= date_trunc('month', CURRENT_DATE)
    ),
    api_calls_count = (
        SELECT COUNT(*) FROM api_usage 
        WHERE user_id = users.id 
        AND timestamp >= date_trunc('month', CURRENT_DATE)
    );
```

#### Cleanup Old Records
```sql
-- Remove expired shared deed tokens (older than 30 days)
DELETE FROM shared_deeds 
WHERE status = 'pending' 
AND created_at < CURRENT_DATE - INTERVAL '30 days';

-- Archive old audit logs (older than 1 year)
DELETE FROM audit_logs 
WHERE timestamp < CURRENT_DATE - INTERVAL '1 year';
```

### Backup Strategy

#### Daily Backup Script
```bash
#!/bin/bash
# Daily backup script
BACKUP_DIR="/backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Dump specific tables
pg_dump $DATABASE_URL -t users > $BACKUP_DIR/users.sql
pg_dump $DATABASE_URL -t deeds > $BACKUP_DIR/deeds.sql
pg_dump $DATABASE_URL -t subscriptions > $BACKUP_DIR/subscriptions.sql
pg_dump $DATABASE_URL -t pricing > $BACKUP_DIR/pricing.sql

# Full database backup
pg_dump $DATABASE_URL > $BACKUP_DIR/full_backup.sql

# Compress backups
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR/
rm -rf $BACKUP_DIR/
```

---

## 🔒 Security Considerations

### Data Protection

#### Sensitive Data Handling
```sql
-- Never store plain text passwords
-- password_hash stores bcrypt hash only

-- Audit log for sensitive operations
CREATE OR REPLACE FUNCTION audit_sensitive_operations()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.password_hash != NEW.password_hash THEN
        INSERT INTO audit_logs (user_id, action, details)
        VALUES (NEW.id, 'password_changed', '{"timestamp": "' || NOW() || '"}');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_password_changes
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION audit_sensitive_operations();
```

#### Access Control
```sql
-- Create read-only user for analytics
CREATE USER analytics_user WITH PASSWORD 'secure_password';
GRANT SELECT ON users, deeds, subscriptions, pricing TO analytics_user;

-- Create backup user
CREATE USER backup_user WITH PASSWORD 'backup_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
```

### Data Validation

#### Constraints and Triggers
```sql
-- Ensure valid plan references
ALTER TABLE users ADD CONSTRAINT valid_plan 
CHECK (plan IN ('free', 'professional', 'enterprise'));

-- Ensure positive prices
ALTER TABLE pricing ADD CONSTRAINT positive_price 
CHECK (price >= 0);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

---

## 📈 Monitoring & Analytics

### Key Metrics Queries

#### User Growth
```sql
-- New users per month
SELECT 
    date_trunc('month', created_at) as month,
    COUNT(*) as new_users
FROM users
WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY date_trunc('month', created_at)
ORDER BY month;
```

#### Revenue Analytics
```sql
-- Monthly recurring revenue by plan
SELECT 
    p.plan_name,
    COUNT(s.id) as subscribers,
    SUM(p.price) as mrr
FROM pricing p
JOIN subscriptions s ON s.plan_name = p.plan_name
WHERE s.status = 'active'
GROUP BY p.plan_name, p.price;
```

#### Usage Patterns
```sql
-- Most popular deed types
SELECT 
    deed_type,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM deeds
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY deed_type
ORDER BY count DESC;
```

---

## 🚀 Migration Scripts

### Schema Updates

#### Adding New Columns
```sql
-- Add widget access column (already in current schema)
ALTER TABLE users ADD COLUMN IF NOT EXISTS widget_access BOOLEAN DEFAULT FALSE;

-- Update existing users based on plan
UPDATE users SET widget_access = TRUE 
WHERE plan IN ('professional', 'enterprise');
```

#### Data Migrations
```sql
-- Migrate old subscription data format
UPDATE subscriptions SET 
    current_period_start = created_at,
    current_period_end = created_at + INTERVAL '1 month'
WHERE current_period_start IS NULL;
```

---

## 📞 Troubleshooting

### Common Issues

#### Connection Pool Exhaustion
```sql
-- Check active connections
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    query
FROM pg_stat_activity
WHERE state = 'active';

-- Kill long-running queries
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active' 
AND query_start < NOW() - INTERVAL '5 minutes';
```

#### Performance Issues
```sql
-- Find tables needing vacuum
SELECT 
    schemaname,
    tablename,
    n_dead_tup,
    n_live_tup,
    ROUND(n_dead_tup * 100.0 / (n_live_tup + n_dead_tup), 2) as dead_percentage
FROM pg_stat_user_tables
WHERE n_dead_tup > 0
ORDER BY dead_percentage DESC;

-- Manual vacuum if needed
VACUUM ANALYZE users;
VACUUM ANALYZE deeds;
```

---

**Last Updated:** January 2025  
**Schema Version:** 2.0.0  
**PostgreSQL Version:** 12+

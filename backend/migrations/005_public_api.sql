-- Migration 005: Public API Infrastructure
-- Creates tables for API-generated deeds and usage logging
-- Works with existing api_keys table (UUID primary key)

-- Add missing columns to existing api_keys table
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS organization_id INTEGER;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS rate_limit_hour INTEGER DEFAULT 100;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS rate_limit_day INTEGER DEFAULT 1000;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS created_by_email VARCHAR(255);

-- Update name from company if null
UPDATE api_keys SET name = company WHERE name IS NULL AND company IS NOT NULL;

-- API Deeds Table (separate from user deeds)
CREATE TABLE IF NOT EXISTS api_deeds (
    id SERIAL PRIMARY KEY,
    deed_id VARCHAR(50) UNIQUE NOT NULL,           -- "deed_abc123def456"
    document_id VARCHAR(20) UNIQUE NOT NULL,       -- "DOC-2026-A7X9K"
    
    -- API Key reference (UUID to match existing api_keys.id)
    api_key_id UUID REFERENCES api_keys(id),
    
    -- Deed data
    deed_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'completed',
    
    -- Property
    property_address TEXT,
    property_city VARCHAR(100),
    property_county VARCHAR(100),
    property_apn VARCHAR(50),
    
    -- Parties (abbreviated for display)
    grantor_name TEXT,
    grantee_name TEXT,
    
    -- Transfer tax
    transfer_tax_amount DECIMAL(10,2),
    transfer_tax_exempt BOOLEAN DEFAULT false,
    
    -- Storage
    pdf_data BYTEA,                                -- Stored PDF
    request_data JSONB,                            -- Original request
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Link to verification system (optional, may not exist)
    authenticity_id UUID
);

CREATE INDEX IF NOT EXISTS idx_api_deeds_deed_id ON api_deeds(deed_id);
CREATE INDEX IF NOT EXISTS idx_api_deeds_document_id ON api_deeds(document_id);
CREATE INDEX IF NOT EXISTS idx_api_deeds_api_key ON api_deeds(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_deeds_created ON api_deeds(created_at);

-- API Usage Log
CREATE TABLE IF NOT EXISTS api_usage_log (
    id SERIAL PRIMARY KEY,
    api_key_id UUID REFERENCES api_keys(id),
    endpoint VARCHAR(100),
    method VARCHAR(10),
    status_code INTEGER,
    response_time_ms INTEGER,
    ip_address INET,
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_key ON api_usage_log(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON api_usage_log(created_at);

-- Rate Limit Tracking (simple in-DB approach, can upgrade to Redis later)
CREATE TABLE IF NOT EXISTS api_rate_limits (
    id SERIAL PRIMARY KEY,
    api_key_id UUID REFERENCES api_keys(id),
    window_type VARCHAR(10) NOT NULL,              -- 'hour' or 'day'
    window_key VARCHAR(20) NOT NULL,               -- '2026012115' (YYYYMMDDHH) or '20260121' (YYYYMMDD)
    request_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(api_key_id, window_type, window_key)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON api_rate_limits(api_key_id, window_type, window_key);

-- Migration 005: Public API Infrastructure
-- Creates tables for API keys, API-generated deeds, and usage logging

-- API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    key_prefix VARCHAR(20) UNIQUE NOT NULL,       -- "dp_live_abc12345" (for lookup)
    key_hash VARCHAR(255) NOT NULL,                -- bcrypt hash of full key
    name VARCHAR(255) NOT NULL,                    -- "ABC Title Company"
    organization_id INTEGER,                       -- Optional org reference
    
    -- Permissions
    scopes TEXT[] DEFAULT ARRAY['deeds:create', 'deeds:read'],
    
    -- Rate limiting
    rate_limit_hour INTEGER DEFAULT 100,
    rate_limit_day INTEGER DEFAULT 1000,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_test BOOLEAN DEFAULT false,                 -- Test mode (no real docs)
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_by_email VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

-- API Deeds Table (separate from user deeds)
CREATE TABLE IF NOT EXISTS api_deeds (
    id SERIAL PRIMARY KEY,
    deed_id VARCHAR(50) UNIQUE NOT NULL,           -- "deed_abc123def456"
    document_id VARCHAR(20) UNIQUE NOT NULL,       -- "DOC-2026-A7X9K"
    
    -- API Key reference
    api_key_id INTEGER REFERENCES api_keys(id),
    
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
    
    -- Link to verification system
    authenticity_id UUID REFERENCES document_authenticity(id)
);

CREATE INDEX IF NOT EXISTS idx_api_deeds_deed_id ON api_deeds(deed_id);
CREATE INDEX IF NOT EXISTS idx_api_deeds_document_id ON api_deeds(document_id);
CREATE INDEX IF NOT EXISTS idx_api_deeds_api_key ON api_deeds(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_deeds_created ON api_deeds(created_at);

-- API Usage Log
CREATE TABLE IF NOT EXISTS api_usage_log (
    id SERIAL PRIMARY KEY,
    api_key_id INTEGER REFERENCES api_keys(id),
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
    api_key_id INTEGER REFERENCES api_keys(id),
    window_type VARCHAR(10) NOT NULL,              -- 'hour' or 'day'
    window_key VARCHAR(20) NOT NULL,               -- '2026012115' (YYYYMMDDHH) or '20260121' (YYYYMMDD)
    request_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(api_key_id, window_type, window_key)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON api_rate_limits(api_key_id, window_type, window_key);

-- Document Authenticity and QR Verification System
-- Creates tables for document verification tracking

-- Table: document_authenticity
-- Stores verification data for each generated deed
CREATE TABLE IF NOT EXISTS document_authenticity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Human-readable identifier
    short_code VARCHAR(16) UNIQUE NOT NULL,  -- e.g., "DOC-2026-A7X9K"
    
    -- Document metadata
    document_type VARCHAR(50) NOT NULL,       -- "grant_deed", "quitclaim_deed", etc.
    property_address TEXT,
    property_apn VARCHAR(50),
    county VARCHAR(100),
    
    -- Parties (for display, not sensitive - abbreviated)
    grantor_display VARCHAR(255),             -- "JOHN S." (abbreviated)
    grantee_display VARCHAR(255),             -- "JANE S." (abbreviated)
    
    -- Verification data
    content_hash VARCHAR(64) NOT NULL,        -- SHA-256 of deed content
    pdf_hash VARCHAR(64),                     -- SHA-256 of final PDF
    
    -- Timestamps
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    first_verified_at TIMESTAMP WITH TIME ZONE,
    last_verified_at TIMESTAMP WITH TIME ZONE,
    verification_count INTEGER DEFAULT 0,
    
    -- Ownership
    organization_id UUID,                     -- If multi-tenant
    created_by_user_id UUID REFERENCES users(id),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active',      -- active, revoked, superseded
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_reason TEXT,
    superseded_by UUID REFERENCES document_authenticity(id),
    
    -- Reference to deed record (optional - deed_id is just for linking, no FK constraint)
    deed_id INTEGER,
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('active', 'revoked', 'superseded'))
);

-- Table: verification_log
-- Audit trail of all verification attempts
CREATE TABLE IF NOT EXISTS verification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES document_authenticity(id) ON DELETE CASCADE,
    
    -- Verification details
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verification_method VARCHAR(20) NOT NULL,  -- 'qr_scan', 'manual', 'api'
    result VARCHAR(20) NOT NULL,               -- 'valid', 'invalid', 'revoked', 'not_found'
    
    -- Request metadata (anonymized)
    ip_hash VARCHAR(64),                       -- Hashed IP for abuse detection
    user_agent_hash VARCHAR(64),               -- Hashed UA
    country_code VARCHAR(2),                   -- From IP geolocation (optional)
    
    -- Error details (if any)
    error_message TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_doc_auth_short_code ON document_authenticity(short_code);
CREATE INDEX IF NOT EXISTS idx_doc_auth_deed_id ON document_authenticity(deed_id);
CREATE INDEX IF NOT EXISTS idx_doc_auth_status ON document_authenticity(status);
CREATE INDEX IF NOT EXISTS idx_doc_auth_created_by ON document_authenticity(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_verification_log_doc ON verification_log(document_id);
CREATE INDEX IF NOT EXISTS idx_verification_log_time ON verification_log(verified_at);

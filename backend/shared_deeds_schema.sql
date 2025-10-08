-- Phase 6-2: Shared Deeds Table Schema
-- Enables real deed sharing and collaboration workflow

-- Shared Deeds Table
CREATE TABLE IF NOT EXISTS shared_deeds (
    id SERIAL PRIMARY KEY,
    
    -- Relationship Fields
    deed_id INTEGER REFERENCES deeds(id) ON DELETE CASCADE,
    shared_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    shared_with_email VARCHAR(255) NOT NULL,
    shared_with_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Sharing Details
    status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'approved', 'rejected', 'revoked'
    message TEXT,
    share_type VARCHAR(50) DEFAULT 'review',  -- 'review', 'edit', 'sign'
    
    -- Permissions
    can_edit BOOLEAN DEFAULT FALSE,
    can_download BOOLEAN DEFAULT TRUE,
    can_share BOOLEAN DEFAULT FALSE,
    
    -- Response Tracking
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    revoked_at TIMESTAMP,
    response_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,  -- Optional expiration for temporary shares
    
    -- Audit Trail
    ip_address INET,
    user_agent TEXT,
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')),
    CONSTRAINT valid_share_type CHECK (share_type IN ('review', 'edit', 'sign'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shared_deeds_deed_id ON shared_deeds(deed_id);
CREATE INDEX IF NOT EXISTS idx_shared_deeds_shared_by ON shared_deeds(shared_by);
CREATE INDEX IF NOT EXISTS idx_shared_deeds_shared_with_email ON shared_deeds(shared_with_email);
CREATE INDEX IF NOT EXISTS idx_shared_deeds_shared_with_user_id ON shared_deeds(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_shared_deeds_status ON shared_deeds(status);
CREATE INDEX IF NOT EXISTS idx_shared_deeds_created_at ON shared_deeds(created_at);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_shared_deeds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shared_deeds_updated_at
    BEFORE UPDATE ON shared_deeds
    FOR EACH ROW
    EXECUTE FUNCTION update_shared_deeds_updated_at();

-- Sharing Activity Log Table (for audit trail)
CREATE TABLE IF NOT EXISTS sharing_activity_log (
    id SERIAL PRIMARY KEY,
    shared_deed_id INTEGER REFERENCES shared_deeds(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,  -- 'shared', 'viewed', 'approved', 'rejected', 'revoked', 'downloaded'
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for activity log
CREATE INDEX IF NOT EXISTS idx_sharing_activity_log_shared_deed_id ON sharing_activity_log(shared_deed_id);
CREATE INDEX IF NOT EXISTS idx_sharing_activity_log_user_id ON sharing_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sharing_activity_log_action ON sharing_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_sharing_activity_log_created_at ON sharing_activity_log(created_at);

-- Comment on tables
COMMENT ON TABLE shared_deeds IS 'Phase 6-2: Tracks deed sharing between users for collaboration and approval workflows';
COMMENT ON TABLE sharing_activity_log IS 'Phase 6-2: Audit trail for all sharing-related activities';


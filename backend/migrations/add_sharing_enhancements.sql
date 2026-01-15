-- Migration: Add Sharing Enhancements
-- Description: Adds view tracking, activity log, and extended columns for deed sharing

-- Add view tracking columns to deed_shares
ALTER TABLE deed_shares ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;
ALTER TABLE deed_shares ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE deed_shares ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;
ALTER TABLE deed_shares ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

-- Create activity log table for audit trail
CREATE TABLE IF NOT EXISTS deed_share_activity (
    id SERIAL PRIMARY KEY,
    share_id INTEGER NOT NULL REFERENCES deed_shares(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'created', 'viewed', 'reminded', 'approved', 'rejected', 'revoked', 'expired'
    actor_email VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient activity lookups
CREATE INDEX IF NOT EXISTS idx_share_activity_share_id ON deed_share_activity(share_id);
CREATE INDEX IF NOT EXISTS idx_share_activity_type ON deed_share_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_share_activity_created ON deed_share_activity(created_at DESC);

-- Add index for faster expiration queries
CREATE INDEX IF NOT EXISTS idx_deed_shares_expires_at ON deed_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_deed_shares_status ON deed_shares(status);

-- Update status enum to include 'viewed' (if using enum type)
-- Note: This may need adjustment based on how status is defined in your schema
-- If status is VARCHAR, this comment can be ignored

COMMENT ON TABLE deed_share_activity IS 'Activity log for deed sharing events (view, approve, reject, remind, etc.)';
COMMENT ON COLUMN deed_shares.viewed_at IS 'Timestamp of first view by recipient';
COMMENT ON COLUMN deed_shares.view_count IS 'Number of times the share link was accessed';


-- 2025-10-13: Add feedback columns to deed_shares for rejection comments
ALTER TABLE deed_shares
  ADD COLUMN IF NOT EXISTS feedback TEXT,
  ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS feedback_by VARCHAR(255);
-- Optional index to query recent feedback quickly
CREATE INDEX IF NOT EXISTS idx_deed_shares_feedback_at ON deed_shares (feedback_at DESC);

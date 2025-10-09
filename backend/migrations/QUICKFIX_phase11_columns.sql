-- EMERGENCY QUICKFIX: Add missing columns to deeds table
-- Run this in Render psql console: psql $DATABASE_URL

-- Add missing columns (safe to re-run)
ALTER TABLE deeds ADD COLUMN IF NOT EXISTS apn VARCHAR(50);
ALTER TABLE deeds ADD COLUMN IF NOT EXISTS county VARCHAR(100);
ALTER TABLE deeds ADD COLUMN IF NOT EXISTS owner_type VARCHAR(100);
ALTER TABLE deeds ADD COLUMN IF NOT EXISTS sales_price DECIMAL(15,2);
ALTER TABLE deeds ADD COLUMN IF NOT EXISTS vesting VARCHAR(255);
ALTER TABLE deeds ADD COLUMN IF NOT EXISTS pdf_url VARCHAR(500);
ALTER TABLE deeds ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE deeds ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_deeds_apn ON deeds(apn);
CREATE INDEX IF NOT EXISTS idx_deeds_county ON deeds(county);
CREATE INDEX IF NOT EXISTS idx_deeds_status ON deeds(status);

-- Verify (should show all columns including new ones)
\d deeds


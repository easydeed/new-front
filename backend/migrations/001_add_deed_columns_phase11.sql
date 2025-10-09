-- Phase 11: Add missing columns to deeds table
-- Date: October 9, 2025
-- Purpose: Fix "column does not exist" errors for Phase 11 wizard integration

-- Add columns if they don't exist (safe for re-running)
DO $$ 
BEGIN
    -- Add apn column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='deeds' AND column_name='apn') THEN
        ALTER TABLE deeds ADD COLUMN apn VARCHAR(50);
        RAISE NOTICE 'Added column: apn';
    END IF;

    -- Add county column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='deeds' AND column_name='county') THEN
        ALTER TABLE deeds ADD COLUMN county VARCHAR(100);
        RAISE NOTICE 'Added column: county';
    END IF;

    -- Add owner_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='deeds' AND column_name='owner_type') THEN
        ALTER TABLE deeds ADD COLUMN owner_type VARCHAR(100);
        RAISE NOTICE 'Added column: owner_type';
    END IF;

    -- Add sales_price column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='deeds' AND column_name='sales_price') THEN
        ALTER TABLE deeds ADD COLUMN sales_price DECIMAL(15,2);
        RAISE NOTICE 'Added column: sales_price';
    END IF;

    -- Add vesting column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='deeds' AND column_name='vesting') THEN
        ALTER TABLE deeds ADD COLUMN vesting VARCHAR(255);
        RAISE NOTICE 'Added column: vesting';
    END IF;

    -- Rename grantor_name to grantors if needed (for consistency)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='deeds' AND column_name='grantor_name')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='deeds' AND column_name='grantors') THEN
        ALTER TABLE deeds RENAME COLUMN grantor_name TO grantors;
        RAISE NOTICE 'Renamed column: grantor_name → grantors';
    END IF;

    -- Add grantors column if it doesn't exist at all
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='deeds' AND column_name='grantors') THEN
        ALTER TABLE deeds ADD COLUMN grantors TEXT;
        RAISE NOTICE 'Added column: grantors';
    END IF;

    -- Rename grantee_name to grantees if needed (for consistency)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='deeds' AND column_name='grantee_name')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='deeds' AND column_name='grantees') THEN
        ALTER TABLE deeds RENAME COLUMN grantee_name TO grantees;
        RAISE NOTICE 'Renamed column: grantee_name → grantees';
    END IF;

    -- Add grantees column if it doesn't exist at all
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='deeds' AND column_name='grantees') THEN
        ALTER TABLE deeds ADD COLUMN grantees TEXT;
        RAISE NOTICE 'Added column: grantees';
    END IF;

    -- Add pdf_url column (for storing generated PDF URLs)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='deeds' AND column_name='pdf_url') THEN
        ALTER TABLE deeds ADD COLUMN pdf_url VARCHAR(500);
        RAISE NOTICE 'Added column: pdf_url';
    END IF;

    -- Add metadata column (JSONB for flexible storage)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='deeds' AND column_name='metadata') THEN
        ALTER TABLE deeds ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added column: metadata';
    END IF;

    -- Add completed_at column (for tracking completion timestamp)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='deeds' AND column_name='completed_at') THEN
        ALTER TABLE deeds ADD COLUMN completed_at TIMESTAMP;
        RAISE NOTICE 'Added column: completed_at';
    END IF;
END $$;

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_deeds_apn ON deeds(apn);
CREATE INDEX IF NOT EXISTS idx_deeds_county ON deeds(county);
CREATE INDEX IF NOT EXISTS idx_deeds_status ON deeds(status);

-- Show final schema
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'deeds'
ORDER BY ordinal_position;


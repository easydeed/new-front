-- Migration: Add requested_by column to deeds table
-- Date: October 23, 2025
-- Purpose: Store "Requested By" field from Modern Wizard

-- Add the column
ALTER TABLE deeds ADD COLUMN IF NOT EXISTS requested_by VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN deeds.requested_by IS 'Name of person/company requesting the deed (e.g., escrow officer, title company rep)';

-- Verify the change
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'deeds' 
AND column_name = 'requested_by';


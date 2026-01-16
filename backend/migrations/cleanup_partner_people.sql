-- Migration: Cleanup orphaned partner_people table
-- Date: 2026-01-15
-- Purpose: Drop partner_people table which has wrong column types (TEXT vs UUID)

-- Drop the orphaned table (CASCADE handles any dependencies)
DROP TABLE IF EXISTS partner_people CASCADE;

-- Drop any orphaned indexes
DROP INDEX IF EXISTS idx_partner_people_partner;

-- Add a comment to the partners table for clarity
COMMENT ON TABLE partners IS 'Industry partners (title companies, lenders, realtors) - org-scoped with UUID primary keys';

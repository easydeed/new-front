-- Phase 15 v5: Add user-scoped partners tables
-- Purpose: Industry partners (title companies, real estate, lenders) with contact people
-- Date: 2025-10-16
-- NOTE: Currently user-scoped. When Teams feature is added, migrate to organization_id.

-- Partners (user scoped for now)
CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- title_company | real_estate | lender
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partners_user ON partners(user_id);
CREATE INDEX IF NOT EXISTS idx_partners_name ON partners(name);

-- Partner people (contacts under a partner company)
CREATE TABLE IF NOT EXISTS partner_people (
  id TEXT PRIMARY KEY,
  partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT, -- title_officer | realtor | loan_officer
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partner_people_partner ON partner_people(partner_id);


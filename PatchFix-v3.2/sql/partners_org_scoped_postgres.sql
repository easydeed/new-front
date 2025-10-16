
-- Partners (org scoped)
CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- title_company | real_estate | lender
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partners_org ON partners(organization_id);
CREATE INDEX IF NOT EXISTS idx_partners_name ON partners(name);

CREATE TABLE IF NOT EXISTS partner_people (
  id TEXT PRIMARY KEY,
  partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partner_people_partner ON partner_people(partner_id);

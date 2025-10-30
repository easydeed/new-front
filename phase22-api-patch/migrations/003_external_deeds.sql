-- 003_external_deeds.sql
CREATE TABLE IF NOT EXISTS external_deeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner TEXT NOT NULL,
    order_id TEXT NOT NULL,
    deed_type TEXT NOT NULL,
    property_address TEXT,
    main_deed_id TEXT,
    pdf_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'completed'
);
CREATE INDEX IF NOT EXISTS idx_external_deeds_partner ON external_deeds(partner);
CREATE INDEX IF NOT EXISTS idx_external_deeds_order ON external_deeds(order_id);

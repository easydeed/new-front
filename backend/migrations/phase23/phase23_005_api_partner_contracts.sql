CREATE TABLE IF NOT EXISTS api_partner_contracts (
    id SERIAL PRIMARY KEY,
    api_key_prefix TEXT UNIQUE NOT NULL,
    company VARCHAR(255) NOT NULL,
    pricing_model VARCHAR(20) NOT NULL,  -- flat, per_deed, per_request, hybrid
    monthly_flat_fee_cents INT DEFAULT 0,
    per_deed_price_cents INT DEFAULT 0,
    per_1000_requests_cents INT DEFAULT 0,
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    payment_terms VARCHAR(50) DEFAULT 'immediate',
    payment_method VARCHAR(50),
    monthly_request_limit INT DEFAULT -1,
    rate_limit_per_minute INT DEFAULT 120,
    status VARCHAR(20) DEFAULT 'active',
    contract_start_date DATE NOT NULL,
    contract_end_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

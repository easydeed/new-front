CREATE TABLE IF NOT EXISTS usage_events (
    id BIGSERIAL PRIMARY KEY,
    user_id INT,
    api_key_prefix TEXT,
    event_type VARCHAR(50) NOT NULL,
    resource_id INT,
    billable BOOLEAN DEFAULT FALSE,
    cost_units INT DEFAULT 1,
    unit_price_cents INT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

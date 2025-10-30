-- 002_api_usage.sql
CREATE TABLE IF NOT EXISTS api_usage (
    id BIGSERIAL PRIMARY KEY,
    api_key_prefix TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    status_code INT NOT NULL,
    request_id TEXT NOT NULL,
    latency_ms INT NOT NULL,
    cost_units INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_usage_prefix ON api_usage(api_key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_usage_time ON api_usage(created_at);

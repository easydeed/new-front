CREATE TABLE IF NOT EXISTS credits (
    id SERIAL PRIMARY KEY,
    user_id INT,
    invoice_id INT REFERENCES invoices(id),
    amount_cents INT NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    reason VARCHAR(50) NOT NULL,
    description TEXT,
    applied_to_invoice_id INT REFERENCES invoices(id),
    expires_at TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT now()
);

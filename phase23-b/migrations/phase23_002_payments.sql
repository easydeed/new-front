CREATE TABLE IF NOT EXISTS payment_history (
    id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES invoices(id),
    user_id INT,
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_charge_id VARCHAR(255),
    amount_cents INT NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) NOT NULL,
    payment_method VARCHAR(50),
    stripe_fee_cents INT DEFAULT 0,
    net_amount_cents INT NOT NULL,
    failure_code VARCHAR(50),
    failure_message TEXT,
    refunded_at TIMESTAMP,
    refund_reason TEXT,
    refund_amount_cents INT,
    created_at TIMESTAMPTZ DEFAULT now()
);

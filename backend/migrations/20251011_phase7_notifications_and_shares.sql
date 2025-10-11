-- 20251011_phase7_notifications_and_shares.sql
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  type VARCHAR(32) NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(16) NOT NULL DEFAULT 'info',
  payload JSONB,
  created_by_user_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

CREATE TABLE IF NOT EXISTS user_notifications (
  id SERIAL PRIMARY KEY,
  notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  delivered BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON user_notifications(user_id, read);

CREATE TABLE IF NOT EXISTS deed_shares (
  id SERIAL PRIMARY KEY,
  deed_id INTEGER NOT NULL,
  owner_user_id INTEGER NOT NULL,
  recipient_email TEXT NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  status VARCHAR(16) NOT NULL DEFAULT 'sent',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deed_shares_owner ON deed_shares(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_deed_shares_deed ON deed_shares(deed_id);

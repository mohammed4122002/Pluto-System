-- 3.6 Subscriptions
CREATE TABLE subscriptions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id     UUID REFERENCES clinics(id) ON DELETE CASCADE,
  plan          TEXT NOT NULL CHECK (plan IN ('monthly','quarterly','annual')),
  price_sar     NUMERIC(10,2) NOT NULL,
  starts_at     DATE NOT NULL,
  expires_at    DATE NOT NULL,
  status        TEXT DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  payment_note  TEXT,          -- manual payment note / receipt ref
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

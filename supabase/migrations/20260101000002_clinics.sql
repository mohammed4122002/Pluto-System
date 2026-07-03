-- 3.2 Clinics table
CREATE TABLE clinics (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_key    TEXT UNIQUE NOT NULL,   -- e.g. "clinic_001" used in n8n
  name          TEXT NOT NULL,
  doctor_name   TEXT NOT NULL,
  specialty     TEXT,
  city          TEXT,
  address       TEXT,
  phone         TEXT,
  logo_url      TEXT,
  status        TEXT NOT NULL DEFAULT 'trial'
                CHECK (status IN ('trial','active','suspended','expired')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

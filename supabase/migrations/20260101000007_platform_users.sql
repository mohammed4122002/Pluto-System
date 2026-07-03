-- 3.7 Platform users (dashboard accounts)
CREATE TABLE platform_users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id     UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id   UUID REFERENCES clinics(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('owner','manager','doctor','secretary')),
  name        TEXT,
  email       TEXT,
  avatar_url  TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
-- owner has clinic_id = NULL

-- Unified cross-clinic data model (owner project). The dashboard reads/writes
-- here directly for ALL clinics regardless of db_type, so Google Sheets
-- clinics stop depending on n8n for every page load. n8n workflows keep this
-- mirrored with each clinic's own source (Sheets today; more sources later):
--   Sync Import: source (Sheets) -> unified (periodic pull, AI column-mapping)
--   Sync Export: unified -> source, for rows edited in the dashboard
--
-- sync_status: 'synced' (matches source) | 'pending_out' (dashboard edited,
-- not yet pushed to source) | 'local_only' (created directly, no source row).

CREATE TABLE unified_appointments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id         UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  source            TEXT NOT NULL DEFAULT 'google_sheets',
  external_id       TEXT,
  patient_name      TEXT,
  patient_phone     TEXT,
  appointment_time  TIMESTAMPTZ,
  duration_minutes  INTEGER DEFAULT 30,
  status            TEXT DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  notes             TEXT,
  reminder_sent     BOOLEAN DEFAULT FALSE,
  rating_sent       BOOLEAN DEFAULT FALSE,
  service_id        UUID,
  employee_user_id  UUID,
  sync_status       TEXT NOT NULL DEFAULT 'synced'
                    CHECK (sync_status IN ('synced','pending_out','local_only')),
  content_hash      TEXT,
  deleted           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clinic_id, external_id)
);

CREATE INDEX unified_appointments_clinic_idx ON unified_appointments (clinic_id, appointment_time);
CREATE INDEX unified_appointments_pending_idx ON unified_appointments (sync_status) WHERE sync_status = 'pending_out';

CREATE TABLE unified_reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  source          TEXT NOT NULL DEFAULT 'google_sheets',
  external_id     TEXT,
  appointment_id  UUID,
  patient_phone   TEXT,
  stars           INTEGER CHECK (stars BETWEEN 1 AND 5),
  comment         TEXT,
  deleted         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clinic_id, external_id)
);

CREATE INDEX unified_reviews_clinic_idx ON unified_reviews (clinic_id, created_at DESC);

-- AI's learned column mapping per clinic+resource, so the mapper only calls
-- the model once per sheet shape instead of every 15-minute sync.
CREATE TABLE column_mappings (
  clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  resource        TEXT NOT NULL,
  mapping         JSONB NOT NULL,
  source_columns  JSONB,
  detected_by     TEXT DEFAULT 'ai',
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (clinic_id, resource)
);

CREATE TABLE ai_insights (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id     UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL DEFAULT 'daily_summary',
  period_start  DATE,
  period_end    DATE,
  summary_ar    TEXT,
  metrics       JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ai_insights_clinic_idx ON ai_insights (clinic_id, created_at DESC);

ALTER TABLE unified_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE column_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON unified_appointments FOR ALL USING (app_is_owner());
CREATE POLICY "clinic_staff_all" ON unified_appointments FOR ALL
  USING (clinic_id = app_clinic_id()) WITH CHECK (clinic_id = app_clinic_id());

CREATE POLICY "owner_all" ON unified_reviews FOR ALL USING (app_is_owner());
CREATE POLICY "clinic_staff_select" ON unified_reviews FOR SELECT
  USING (clinic_id = app_clinic_id());

CREATE POLICY "owner_all" ON column_mappings FOR ALL USING (app_is_owner());
CREATE POLICY "owner_all" ON ai_insights FOR ALL USING (app_is_owner());
CREATE POLICY "clinic_staff_select" ON ai_insights FOR SELECT
  USING (clinic_id = app_clinic_id());

ALTER PUBLICATION supabase_realtime ADD TABLE unified_appointments;

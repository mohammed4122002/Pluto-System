-- 3.22 Unified aggregation layer (OWNER project)
--
-- Owner-decision architecture change: instead of the owner project holding
-- only platform metadata while each clinic's appointments/patients/reviews
-- stay in that clinic's own DB, the owner now keeps a UNIFIED, aggregated
-- mirror of every clinic's data here — regardless of the clinic's backend
-- (google_sheets / supabase / sql_server).
--
-- The mirror is kept in TWO-WAY sync by the n8n workflows:
--   * "MediSync — Sync Import"  : clinic source -> unified_* (with AI column
--     normalization cached in column_mappings)
--   * "MediSync — Sync Export"  : unified_* (dashboard-originated edits) ->
--     clinic source (e.g. the Google Sheet)
--
-- Loop / conflict handling lives in the sync_import_* functions below, driven
-- by content_hash + origin + sync_status. Dashboard edits win over a
-- concurrent sheet edit until they have been pushed back out.

-- ---------------------------------------------------------------------------
-- Safe cast helpers (source rows are strings from Sheets and may be blank/odd)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION try_timestamptz(t TEXT) RETURNS TIMESTAMPTZ
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF t IS NULL OR btrim(t) = '' THEN RETURN NULL; END IF;
  RETURN btrim(t)::timestamptz;
EXCEPTION WHEN others THEN RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION try_bool(t TEXT) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF t IS NULL OR btrim(t) = '' THEN RETURN NULL; END IF;
  RETURN lower(btrim(t)) IN ('true','t','1','yes','y','on');
END; $$;

CREATE OR REPLACE FUNCTION try_int(t TEXT) RETURNS INTEGER
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF t IS NULL OR btrim(t) = '' THEN RETURN NULL; END IF;
  RETURN round(btrim(t)::numeric)::int;
EXCEPTION WHEN others THEN RETURN NULL;
END; $$;

-- ---------------------------------------------------------------------------
-- Unified tables
-- ---------------------------------------------------------------------------
CREATE TABLE unified_patients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  external_id       TEXT,                            -- id in the source system
  source            TEXT NOT NULL,                   -- db_type the row came from
  name              TEXT,
  phone             TEXT,
  notes             TEXT,
  raw               JSONB,                           -- original row as received
  content_hash      TEXT,                            -- md5 of canonical fields
  origin            TEXT NOT NULL DEFAULT 'sheet',   -- 'sheet' | 'dashboard'
  sync_status       TEXT NOT NULL DEFAULT 'synced',  -- 'synced' | 'pending_out'
  source_updated_at TIMESTAMPTZ,
  synced_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  deleted           BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (clinic_id, external_id)
);

CREATE TABLE unified_appointments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  external_id       TEXT,
  source            TEXT NOT NULL,
  patient_name      TEXT,
  patient_phone     TEXT,
  appointment_time  TIMESTAMPTZ,
  duration_minutes  INTEGER DEFAULT 30,
  status            TEXT DEFAULT 'scheduled',
  reminder_sent     BOOLEAN DEFAULT FALSE,
  rating_sent       BOOLEAN DEFAULT FALSE,
  notes             TEXT,
  raw               JSONB,
  content_hash      TEXT,
  origin            TEXT NOT NULL DEFAULT 'sheet',
  sync_status       TEXT NOT NULL DEFAULT 'synced',
  source_updated_at TIMESTAMPTZ,
  synced_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  deleted           BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (clinic_id, external_id)
);

CREATE TABLE unified_reviews (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id               UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  external_id             TEXT,
  source                  TEXT NOT NULL,
  appointment_external_id TEXT,
  patient_phone           TEXT,
  stars                   INTEGER,
  comment                 TEXT,
  raw                     JSONB,
  content_hash            TEXT,
  origin                  TEXT NOT NULL DEFAULT 'sheet',
  sync_status             TEXT NOT NULL DEFAULT 'synced',
  source_updated_at       TIMESTAMPTZ,
  synced_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  deleted                 BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (clinic_id, external_id)
);

CREATE INDEX idx_unified_patients_clinic     ON unified_patients (clinic_id);
CREATE INDEX idx_unified_appts_clinic        ON unified_appointments (clinic_id);
CREATE INDEX idx_unified_appts_pending       ON unified_appointments (clinic_id, sync_status);
CREATE INDEX idx_unified_appts_time          ON unified_appointments (clinic_id, appointment_time);
CREATE INDEX idx_unified_reviews_clinic      ON unified_reviews (clinic_id);

-- Per-clinic / per-resource sync bookkeeping (last run, counts, errors).
CREATE TABLE sync_state (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  resource      TEXT NOT NULL,                 -- 'appointments' | 'patients' | 'reviews'
  direction     TEXT NOT NULL DEFAULT 'import',-- 'import' | 'export'
  last_run_at   TIMESTAMPTZ,
  last_status   TEXT,
  last_error    TEXT,
  rows_seen     INTEGER,
  rows_upserted INTEGER,
  UNIQUE (clinic_id, resource, direction)
);

-- AI-detected column mapping, cached per clinic+resource so the LLM only runs
-- on first import or when the source header signature changes.
CREATE TABLE column_mappings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  resource       TEXT NOT NULL,
  source_columns TEXT[],                        -- header signature (drift detection)
  mapping        JSONB NOT NULL,                -- { canonical_field: source_column }
  detected_by    TEXT DEFAULT 'ai',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clinic_id, resource)
);

-- AI-generated insights for the owner (clinic_id NULL = platform-wide).
CREATE TABLE ai_insights (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     UUID REFERENCES clinics(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,                  -- 'daily_summary' | 'alerts' | ...
  period_start  DATE,
  period_end    DATE,
  summary_ar    TEXT,
  metrics       JSONB,
  generated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ai_insights_clinic ON ai_insights (clinic_id, generated_at DESC);

-- ---------------------------------------------------------------------------
-- Import (source -> unified) with conflict resolution
-- Returns one of: inserted | updated | unchanged | skipped_pending_out
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_import_appointment(
  p_clinic_id UUID,
  p_external_id TEXT,
  p_source TEXT,
  p_data JSONB,
  p_source_updated_at TIMESTAMPTZ DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE
  v_hash TEXT;
  v_existing unified_appointments%ROWTYPE;
BEGIN
  v_hash := md5(
    coalesce(p_data->>'patient_name','')     || '|' ||
    coalesce(p_data->>'patient_phone','')    || '|' ||
    coalesce(p_data->>'appointment_time','') || '|' ||
    coalesce(p_data->>'status','')           || '|' ||
    coalesce(p_data->>'notes','')
  );

  SELECT * INTO v_existing FROM unified_appointments
    WHERE clinic_id = p_clinic_id AND external_id = p_external_id;

  IF NOT FOUND THEN
    INSERT INTO unified_appointments(
      clinic_id, external_id, source, patient_name, patient_phone,
      appointment_time, duration_minutes, status, reminder_sent, rating_sent,
      notes, raw, content_hash, origin, sync_status, source_updated_at,
      synced_at, updated_at)
    VALUES (
      p_clinic_id, p_external_id, p_source, p_data->>'patient_name',
      p_data->>'patient_phone', try_timestamptz(p_data->>'appointment_time'),
      coalesce(try_int(p_data->>'duration_minutes'), 30),
      coalesce(nullif(p_data->>'status',''), 'scheduled'),
      coalesce(try_bool(p_data->>'reminder_sent'), false),
      coalesce(try_bool(p_data->>'rating_sent'), false),
      p_data->>'notes', p_data, v_hash, 'sheet', 'synced', p_source_updated_at,
      now(), now());
    RETURN 'inserted';
  END IF;

  IF v_existing.content_hash IS NOT DISTINCT FROM v_hash THEN
    UPDATE unified_appointments SET synced_at = now() WHERE id = v_existing.id;
    RETURN 'unchanged';
  END IF;

  -- Dashboard has an un-pushed edit -> dashboard wins; keep it pending_out so
  -- Sync Export overwrites the sheet with the dashboard's version.
  IF v_existing.sync_status = 'pending_out' THEN
    RETURN 'skipped_pending_out';
  END IF;

  UPDATE unified_appointments SET
    patient_name      = p_data->>'patient_name',
    patient_phone     = p_data->>'patient_phone',
    appointment_time  = try_timestamptz(p_data->>'appointment_time'),
    duration_minutes  = coalesce(try_int(p_data->>'duration_minutes'), duration_minutes),
    status            = coalesce(nullif(p_data->>'status',''), status),
    reminder_sent     = coalesce(try_bool(p_data->>'reminder_sent'), reminder_sent),
    rating_sent       = coalesce(try_bool(p_data->>'rating_sent'), rating_sent),
    notes             = p_data->>'notes',
    raw               = p_data,
    content_hash      = v_hash,
    origin            = 'sheet',
    sync_status       = 'synced',
    source_updated_at = p_source_updated_at,
    synced_at         = now(),
    updated_at        = now()
  WHERE id = v_existing.id;
  RETURN 'updated';
END; $$;

CREATE OR REPLACE FUNCTION sync_import_patient(
  p_clinic_id UUID, p_external_id TEXT, p_source TEXT, p_data JSONB,
  p_source_updated_at TIMESTAMPTZ DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE
  v_hash TEXT;
  v_existing unified_patients%ROWTYPE;
BEGIN
  v_hash := md5(coalesce(p_data->>'name','') || '|' ||
                coalesce(p_data->>'phone','') || '|' ||
                coalesce(p_data->>'notes',''));
  SELECT * INTO v_existing FROM unified_patients
    WHERE clinic_id = p_clinic_id AND external_id = p_external_id;
  IF NOT FOUND THEN
    INSERT INTO unified_patients(clinic_id, external_id, source, name, phone,
      notes, raw, content_hash, origin, sync_status, source_updated_at, synced_at, updated_at)
    VALUES (p_clinic_id, p_external_id, p_source, p_data->>'name', p_data->>'phone',
      p_data->>'notes', p_data, v_hash, 'sheet', 'synced', p_source_updated_at, now(), now());
    RETURN 'inserted';
  END IF;
  IF v_existing.content_hash IS NOT DISTINCT FROM v_hash THEN
    UPDATE unified_patients SET synced_at = now() WHERE id = v_existing.id;
    RETURN 'unchanged';
  END IF;
  IF v_existing.sync_status = 'pending_out' THEN RETURN 'skipped_pending_out'; END IF;
  UPDATE unified_patients SET
    name = p_data->>'name', phone = p_data->>'phone', notes = p_data->>'notes',
    raw = p_data, content_hash = v_hash, origin = 'sheet', sync_status = 'synced',
    source_updated_at = p_source_updated_at, synced_at = now(), updated_at = now()
  WHERE id = v_existing.id;
  RETURN 'updated';
END; $$;

CREATE OR REPLACE FUNCTION sync_import_review(
  p_clinic_id UUID, p_external_id TEXT, p_source TEXT, p_data JSONB,
  p_source_updated_at TIMESTAMPTZ DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE
  v_hash TEXT;
  v_existing unified_reviews%ROWTYPE;
BEGIN
  v_hash := md5(coalesce(p_data->>'stars','') || '|' ||
                coalesce(p_data->>'comment','') || '|' ||
                coalesce(p_data->>'patient_phone',''));
  SELECT * INTO v_existing FROM unified_reviews
    WHERE clinic_id = p_clinic_id AND external_id = p_external_id;
  IF NOT FOUND THEN
    INSERT INTO unified_reviews(clinic_id, external_id, source, appointment_external_id,
      patient_phone, stars, comment, raw, content_hash, origin, sync_status,
      source_updated_at, synced_at, updated_at)
    VALUES (p_clinic_id, p_external_id, p_source, p_data->>'appointment_id',
      p_data->>'patient_phone', try_int(p_data->>'stars'), p_data->>'comment',
      p_data, v_hash, 'sheet', 'synced', p_source_updated_at, now(), now());
    RETURN 'inserted';
  END IF;
  IF v_existing.content_hash IS NOT DISTINCT FROM v_hash THEN
    UPDATE unified_reviews SET synced_at = now() WHERE id = v_existing.id;
    RETURN 'unchanged';
  END IF;
  IF v_existing.sync_status = 'pending_out' THEN RETURN 'skipped_pending_out'; END IF;
  UPDATE unified_reviews SET
    appointment_external_id = p_data->>'appointment_id',
    patient_phone = p_data->>'patient_phone', stars = try_int(p_data->>'stars'),
    comment = p_data->>'comment', raw = p_data, content_hash = v_hash,
    origin = 'sheet', sync_status = 'synced', source_updated_at = p_source_updated_at,
    synced_at = now(), updated_at = now()
  WHERE id = v_existing.id;
  RETURN 'updated';
END; $$;

-- ---------------------------------------------------------------------------
-- Bulk import wrappers — the n8n Sync Import workflow sends a whole clinic's
-- normalized rows in one call. Each returns per-action counts.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_import_appointments_bulk(
  p_clinic_id uuid, p_source text, p_rows jsonb
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  r jsonb; res text; ins int:=0; upd int:=0; unch int:=0; skip int:=0; tot int:=0;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RETURN jsonb_build_object('inserted',0,'updated',0,'unchanged',0,'skipped',0,'total',0);
  END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    tot := tot + 1;
    IF coalesce(r->>'external_id','') = '' THEN skip := skip + 1; CONTINUE; END IF;
    res := sync_import_appointment(p_clinic_id, r->>'external_id', p_source, r, NULL);
    IF res = 'inserted' THEN ins := ins + 1;
    ELSIF res = 'updated' THEN upd := upd + 1;
    ELSIF res = 'unchanged' THEN unch := unch + 1;
    ELSE skip := skip + 1; END IF;
  END LOOP;
  RETURN jsonb_build_object('inserted',ins,'updated',upd,'unchanged',unch,'skipped',skip,'total',tot);
END; $$;

CREATE OR REPLACE FUNCTION sync_import_reviews_bulk(
  p_clinic_id uuid, p_source text, p_rows jsonb
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  r jsonb; res text; ins int:=0; upd int:=0; unch int:=0; skip int:=0; tot int:=0;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RETURN jsonb_build_object('inserted',0,'updated',0,'unchanged',0,'skipped',0,'total',0);
  END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    tot := tot + 1;
    IF coalesce(r->>'external_id','') = '' THEN skip := skip + 1; CONTINUE; END IF;
    res := sync_import_review(p_clinic_id, r->>'external_id', p_source, r, NULL);
    IF res = 'inserted' THEN ins := ins + 1;
    ELSIF res = 'updated' THEN upd := upd + 1;
    ELSIF res = 'unchanged' THEN unch := unch + 1;
    ELSE skip := skip + 1; END IF;
  END LOOP;
  RETURN jsonb_build_object('inserted',ins,'updated',upd,'unchanged',unch,'skipped',skip,'total',tot);
END; $$;

-- ---------------------------------------------------------------------------
-- Dashboard write (unified <- dashboard) : marks the row pending_out so the
-- Sync Export workflow pushes it back to the clinic's sheet. Handles insert
-- (p_id NULL) and update. Returns the row id.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION dashboard_write_appointment(
  p_clinic_id UUID,
  p_id UUID,
  p_data JSONB
) RETURNS UUID
LANGUAGE plpgsql AS $$
DECLARE
  v_hash TEXT;
  v_id UUID;
BEGIN
  v_hash := md5(
    coalesce(p_data->>'patient_name','')     || '|' ||
    coalesce(p_data->>'patient_phone','')    || '|' ||
    coalesce(p_data->>'appointment_time','') || '|' ||
    coalesce(p_data->>'status','')           || '|' ||
    coalesce(p_data->>'notes','')
  );

  IF p_id IS NULL THEN
    INSERT INTO unified_appointments(
      clinic_id, external_id, source, patient_name, patient_phone,
      appointment_time, duration_minutes, status, notes, raw, content_hash,
      origin, sync_status, updated_at)
    VALUES (
      p_clinic_id, NULL, 'dashboard', p_data->>'patient_name',
      p_data->>'patient_phone', try_timestamptz(p_data->>'appointment_time'),
      coalesce(try_int(p_data->>'duration_minutes'), 30),
      coalesce(nullif(p_data->>'status',''), 'scheduled'),
      p_data->>'notes', p_data, v_hash, 'dashboard', 'pending_out', now())
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  UPDATE unified_appointments SET
    patient_name     = coalesce(p_data->>'patient_name', patient_name),
    patient_phone    = coalesce(p_data->>'patient_phone', patient_phone),
    appointment_time = coalesce(try_timestamptz(p_data->>'appointment_time'), appointment_time),
    duration_minutes = coalesce(try_int(p_data->>'duration_minutes'), duration_minutes),
    status           = coalesce(nullif(p_data->>'status',''), status),
    notes            = coalesce(p_data->>'notes', notes),
    content_hash     = v_hash,
    origin           = 'dashboard',
    sync_status      = 'pending_out',
    updated_at       = now()
  WHERE id = p_id AND clinic_id = p_clinic_id
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- Called by Sync Export after a pending_out row has been written to the sheet.
-- Only clears the flag if the row has not changed again since (guards against
-- clobbering a dashboard edit that landed mid-export).
CREATE OR REPLACE FUNCTION sync_mark_exported(
  p_id UUID, p_external_id TEXT, p_content_hash TEXT
) RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE unified_appointments SET
    sync_status = 'synced',
    external_id = coalesce(external_id, p_external_id),
    synced_at   = now()
  WHERE id = p_id AND content_hash IS NOT DISTINCT FROM p_content_hash;
END; $$;

-- ---------------------------------------------------------------------------
-- Row Level Security (mirror the existing owner_all / clinic_staff_select
-- pattern; writes happen server-side via the service role which bypasses RLS)
-- ---------------------------------------------------------------------------
ALTER TABLE unified_patients     ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_reviews      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_state           ENABLE ROW LEVEL SECURITY;
ALTER TABLE column_mappings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON unified_patients FOR ALL USING (app_is_owner());
CREATE POLICY "clinic_staff_select" ON unified_patients FOR SELECT USING (clinic_id = app_clinic_id());

CREATE POLICY "owner_all" ON unified_appointments FOR ALL USING (app_is_owner());
CREATE POLICY "clinic_staff_select" ON unified_appointments FOR SELECT USING (clinic_id = app_clinic_id());

CREATE POLICY "owner_all" ON unified_reviews FOR ALL USING (app_is_owner());
CREATE POLICY "clinic_staff_select" ON unified_reviews FOR SELECT USING (clinic_id = app_clinic_id());

CREATE POLICY "owner_all" ON sync_state FOR ALL USING (app_is_owner());
CREATE POLICY "clinic_staff_select" ON sync_state FOR SELECT USING (clinic_id = app_clinic_id());

CREATE POLICY "owner_all" ON column_mappings FOR ALL USING (app_is_owner());
CREATE POLICY "clinic_staff_select" ON column_mappings FOR SELECT USING (clinic_id = app_clinic_id());

CREATE POLICY "owner_all" ON ai_insights FOR ALL USING (app_is_owner());
CREATE POLICY "clinic_staff_select" ON ai_insights FOR SELECT
  USING (clinic_id = app_clinic_id() OR clinic_id IS NULL);

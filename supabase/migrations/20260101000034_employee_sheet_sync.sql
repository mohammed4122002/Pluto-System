-- Employees managed from a clinic's Google Sheet (owner decision, 2026-07-18):
-- for db_type='google_sheets' clinics, staff/doctors are edited in the
-- sheet's "Employees" tab, not the dashboard. Until now nothing read that
-- tab — the dashboard's Employees page and the AI receptionist's "Get
-- Clinic Team" tool both only ever read platform_users, so a populated
-- sheet had zero visible effect. This adds a one-way sync path
-- (Sheet -> platform_users), mirroring the sync_import_appointment /
-- sync_import_review pattern in 20260101000022_unified_aggregation.sql.
--
-- Sheet-synced rows are identified by external_id (the sheet row's own
-- "id" column) and never carry a login (auth_id stays NULL) — they are
-- display/scheduling records, not accounts. Dashboard-created login
-- accounts (external_id NULL) are untouched by this sync. Because the
-- sheet is the declared source of truth for these rows, each sync run
-- overwrites them outright — there is no "dashboard wins" conflict rule
-- here (unlike unified_appointments), since the dashboard has no
-- reachable edit path for a row that has an external_id.

ALTER TABLE platform_users
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS title       TEXT,  -- free-text job title/specialty from the sheet (role stays the fixed owner/manager/doctor/secretary enum)
  ADD COLUMN IF NOT EXISTS phone       TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_users_clinic_external
  ON platform_users (clinic_id, external_id)
  WHERE external_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Safe cast helpers for sheet strings (time / working-days list)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION try_time(t TEXT) RETURNS TIME
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF t IS NULL OR btrim(t) = '' THEN RETURN NULL; END IF;
  RETURN btrim(t)::time;
EXCEPTION WHEN others THEN RETURN NULL;
END; $$;

-- Accepts a comma-separated list of day names (English or Arabic, full or
-- abbreviated) or numeric 0-6 tokens and returns the INTEGER[] format
-- platform_users.working_days already uses elsewhere (0=Sunday..6=Saturday).
CREATE OR REPLACE FUNCTION try_working_days(t TEXT) RETURNS INTEGER[]
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  parts  TEXT[];
  p      TEXT;
  d      INTEGER;
  result INTEGER[] := '{}';
BEGIN
  IF t IS NULL OR btrim(t) = '' THEN RETURN NULL; END IF;
  parts := string_to_array(t, ',');
  FOREACH p IN ARRAY parts LOOP
    p := lower(btrim(p));
    d := CASE p
      WHEN 'sunday' THEN 0 WHEN 'sun' THEN 0 WHEN 'الأحد' THEN 0 WHEN 'احد' THEN 0
      WHEN 'monday' THEN 1 WHEN 'mon' THEN 1 WHEN 'الاثنين' THEN 1 WHEN 'الإثنين' THEN 1
      WHEN 'tuesday' THEN 2 WHEN 'tue' THEN 2 WHEN 'الثلاثاء' THEN 2 WHEN 'ثلاثاء' THEN 2
      WHEN 'wednesday' THEN 3 WHEN 'wed' THEN 3 WHEN 'الأربعاء' THEN 3 WHEN 'اربعاء' THEN 3
      WHEN 'thursday' THEN 4 WHEN 'thu' THEN 4 WHEN 'الخميس' THEN 4
      WHEN 'friday' THEN 5 WHEN 'fri' THEN 5 WHEN 'الجمعة' THEN 5 WHEN 'جمعة' THEN 5
      WHEN 'saturday' THEN 6 WHEN 'sat' THEN 6 WHEN 'السبت' THEN 6
      ELSE NULL
    END;
    IF d IS NULL AND p ~ '^[0-6]$' THEN d := p::int; END IF;
    IF d IS NOT NULL AND NOT (d = ANY(result)) THEN result := array_append(result, d); END IF;
  END LOOP;
  IF array_length(result, 1) IS NULL THEN RETURN NULL; END IF;
  RETURN result;
END; $$;

-- ---------------------------------------------------------------------------
-- Import one sheet row -> platform_users. Returns 'inserted' | 'updated' | 'skipped'.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_import_employee(
  p_clinic_id UUID,
  p_external_id TEXT,
  p_data JSONB
) RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE
  v_existing_id UUID;
  v_role        TEXT;
BEGIN
  IF p_external_id IS NULL OR btrim(p_external_id) = '' THEN
    RETURN 'skipped';
  END IF;
  IF coalesce(p_data->>'name', '') = '' THEN
    RETURN 'skipped';
  END IF;

  -- The sheet's "role" column is a free-text job title/specialty, not the
  -- strict login-role enum. These rows never log in, so 'doctor' is the
  -- correct enum value for every sheet-synced row (it is also what makes
  -- them show up in the "Get Clinic Team" AI tool and the schedule UI).
  v_role := 'doctor';

  SELECT id INTO v_existing_id FROM platform_users
    WHERE clinic_id = p_clinic_id AND external_id = p_external_id;

  IF NOT FOUND THEN
    INSERT INTO platform_users(
      clinic_id, external_id, role, name, title, email, phone,
      is_active, work_start, work_end, working_days, created_at)
    VALUES (
      p_clinic_id, p_external_id, v_role, p_data->>'name', nullif(p_data->>'role', ''),
      nullif(p_data->>'email', ''), nullif(p_data->>'phone', ''),
      coalesce(try_bool(p_data->>'active'), true),
      try_time(p_data->>'work_start'), try_time(p_data->>'work_end'),
      try_working_days(p_data->>'working_days'), now());
    RETURN 'inserted';
  END IF;

  UPDATE platform_users SET
    name         = p_data->>'name',
    title        = nullif(p_data->>'role', ''),
    email        = nullif(p_data->>'email', ''),
    phone        = nullif(p_data->>'phone', ''),
    is_active    = coalesce(try_bool(p_data->>'active'), is_active),
    work_start   = try_time(p_data->>'work_start'),
    work_end     = try_time(p_data->>'work_end'),
    working_days = try_working_days(p_data->>'working_days')
  WHERE id = v_existing_id;
  RETURN 'updated';
END; $$;

CREATE OR REPLACE FUNCTION sync_import_employees_bulk(
  p_clinic_id UUID, p_rows JSONB
) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  r JSONB; res TEXT; ins INT:=0; upd INT:=0; skip INT:=0; tot INT:=0;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RETURN jsonb_build_object('inserted',0,'updated',0,'skipped',0,'total',0);
  END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    tot := tot + 1;
    res := sync_import_employee(p_clinic_id, r->>'id', r);
    IF res = 'inserted' THEN ins := ins + 1;
    ELSIF res = 'updated' THEN upd := upd + 1;
    ELSE skip := skip + 1; END IF;
  END LOOP;
  RETURN jsonb_build_object('inserted',ins,'updated',upd,'skipped',skip,'total',tot);
END; $$;

REVOKE EXECUTE ON FUNCTION sync_import_employee(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sync_import_employees_bulk(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION sync_import_employee(UUID, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION sync_import_employees_bulk(UUID, JSONB) TO service_role;

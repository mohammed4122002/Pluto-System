-- 3.4 Clinic database configuration
CREATE TABLE clinic_db_config (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id       UUID REFERENCES clinics(id) ON DELETE CASCADE,
  db_type         TEXT NOT NULL CHECK (db_type IN ('supabase','sql_server','google_sheets')),
  -- Supabase
  sb_project_url  TEXT,
  sb_anon_key     TEXT,
  sb_service_key  TEXT,
  -- SQL Server
  mssql_host      TEXT,
  mssql_port      INTEGER DEFAULT 1433,
  mssql_database  TEXT,
  mssql_schema    TEXT DEFAULT 'dbo',
  mssql_username  TEXT,
  mssql_password  TEXT,
  mssql_table_appointments TEXT DEFAULT 'Appointments',
  mssql_table_patients     TEXT DEFAULT 'Patients',
  mssql_table_reviews      TEXT DEFAULT 'Reviews',
  -- Google Sheets
  gs_spreadsheet_id TEXT,
  gs_oauth_token    TEXT,
  gs_refresh_token  TEXT,
  -- Status
  last_tested_at  TIMESTAMPTZ,
  test_passed     BOOLEAN,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

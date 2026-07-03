-- 15. Appointment Schema (inside each Clinic's DB)
-- This is the schema to create when setting up a new Supabase clinic project
-- (db_type = 'supabase'). For SQL Server and Google Sheets, the clinic has
-- existing tables — n8n adapts to them using the configured table names in
-- clinic_db_config (mssql_table_appointments, mssql_table_patients,
-- mssql_table_reviews, gs_spreadsheet_id).
--
-- Run this in the CLINIC's Supabase project (not the owner's project).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE patients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  phone       TEXT,             -- WhatsApp number (with country code: 9665XXXXXXXX)
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE appointments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id        UUID REFERENCES patients(id),
  patient_name      TEXT,           -- denormalized for easy query
  patient_phone     TEXT,
  appointment_time  TIMESTAMPTZ NOT NULL,
  duration_minutes  INTEGER DEFAULT 30,
  status            TEXT DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  reminder_sent     BOOLEAN DEFAULT FALSE,
  reminder_sent_at  TIMESTAMPTZ,
  rating_sent       BOOLEAN DEFAULT FALSE,
  rating_sent_at    TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id  UUID REFERENCES appointments(id),
  patient_phone   TEXT,
  stars           INTEGER CHECK (stars BETWEEN 1 AND 5),
  comment         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

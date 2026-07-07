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

-- Services this clinic offers (owner decision: services live in the clinic's
-- OWN DB, not the owner project). Managed from the clinic dashboard.
CREATE TABLE services (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  description       TEXT,
  duration_minutes  INTEGER DEFAULT 30,
  price             NUMERIC(10,2),
  active            BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Which employees perform each service (many-to-many). employee_user_id is a
-- soft cross-database reference to platform_users.id in the OWNER project —
-- the employee IS a login account there, so no FK is possible/desired here.
CREATE TABLE service_employees (
  service_id        UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  employee_user_id  UUID NOT NULL,
  PRIMARY KEY (service_id, employee_user_id)
);

-- Manual employee absences (manager-entered). Excludes that employee from
-- availability on the given day. employee_user_id -> owner platform_users.id.
CREATE TABLE employee_absences (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_user_id  UUID NOT NULL,
  absence_date      DATE NOT NULL,
  reason            TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Link appointments to the chosen service + the employee performing it. Both
-- nullable so pre-existing appointments (and quick walk-ins) still validate.
-- employee_user_id -> owner platform_users.id (soft ref).
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS service_id        UUID REFERENCES services(id),
  ADD COLUMN IF NOT EXISTS employee_user_id  UUID;

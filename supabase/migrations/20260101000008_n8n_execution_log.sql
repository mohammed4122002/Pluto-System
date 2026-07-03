-- 3.8 n8n execution log (audit)
CREATE TABLE n8n_execution_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id    UUID REFERENCES clinics(id),
  workflow     TEXT,           -- 'reminder' | 'rating' | 'booking' | 'webhook'
  status       TEXT,           -- 'success' | 'error'
  error_msg    TEXT,
  payload      JSONB,
  executed_at  TIMESTAMPTZ DEFAULT NOW()
);

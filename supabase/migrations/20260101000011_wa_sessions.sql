-- 4.6 Conversation State Table (in Owner Supabase)
CREATE TABLE wa_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id       UUID REFERENCES clinics(id),
  patient_phone   TEXT NOT NULL,
  state           TEXT DEFAULT 'idle',
  -- states: idle | awaiting_rating | awaiting_comment
  context_data    JSONB,   -- appointment_id, etc.
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX ON wa_sessions(clinic_id, patient_phone);

-- n8n accesses this table with the service key (bypasses RLS);
-- dashboard users have no business reading raw session state.
ALTER TABLE wa_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON wa_sessions FOR ALL
  USING (app_is_owner());

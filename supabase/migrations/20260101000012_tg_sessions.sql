-- Telegram conversation state + phone-to-chat_id linking (mirrors wa_sessions,
-- section 4.6). Telegram has no phone-addressed send API like WhatsApp Cloud
-- API — a patient must message the clinic's bot once and share their contact
-- so we can map patient_phone -> tg_chat_id for outbound reminders/ratings.
CREATE TABLE tg_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id       UUID REFERENCES clinics(id),
  tg_chat_id      TEXT NOT NULL,
  patient_phone   TEXT,
  state           TEXT DEFAULT 'idle',
  -- states: idle | awaiting_rating | awaiting_comment
  context_data    JSONB,   -- appointment_id, review_id, etc.
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- resolves incoming webhook updates (we always have chat_id)
CREATE UNIQUE INDEX ON tg_sessions(clinic_id, tg_chat_id);
-- resolves outbound sends from cron workflows (looked up by patient_phone)
CREATE UNIQUE INDEX tg_sessions_clinic_phone_idx
  ON tg_sessions(clinic_id, patient_phone) WHERE patient_phone IS NOT NULL;

-- n8n accesses this table with the service key (bypasses RLS);
-- dashboard users have no business reading raw session state.
ALTER TABLE tg_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON tg_sessions FOR ALL
  USING (app_is_owner());

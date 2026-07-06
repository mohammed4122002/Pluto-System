-- Live inbox: unified patient conversations across WhatsApp + Telegram,
-- with AI/human takeover. Distinct from wa_sessions/tg_sessions (which drive
-- the rating state machine) — this is the human-facing message log + control.
--
-- Writes come from two places, both privileged, so RLS only needs read rules:
--   • n8n (owner service-role key) logs messages + upserts conversations.
--   • Next.js server actions use the admin (service-role) client after a
--     requireClinicRole() check to toggle mode / send staff replies.
-- Clinic staff read their own clinic's rows in the dashboard.

CREATE TABLE conversations (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id            UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  channel              TEXT NOT NULL CHECK (channel IN ('telegram','whatsapp')),
  chat_ref             TEXT NOT NULL,          -- tg_chat_id or WhatsApp phone
  patient_phone        TEXT,
  patient_name         TEXT,
  mode                 TEXT NOT NULL DEFAULT 'ai' CHECK (mode IN ('ai','human')),
  needs_attention      BOOLEAN NOT NULL DEFAULT FALSE,
  last_message_at      TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT,
  last_sender          TEXT,                   -- patient | ai | staff
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clinic_id, channel, chat_ref)
);

CREATE TABLE conversation_messages (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  clinic_id        UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  direction        TEXT NOT NULL CHECK (direction IN ('in','out')),
  sender           TEXT NOT NULL CHECK (sender IN ('patient','ai','staff')),
  body             TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX conversations_clinic_recent_idx
  ON conversations (clinic_id, last_message_at DESC);
CREATE INDEX conversation_messages_thread_idx
  ON conversation_messages (conversation_id, created_at);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON conversations FOR ALL
  USING (app_is_owner());
CREATE POLICY "clinic_staff_select" ON conversations FOR SELECT
  USING (clinic_id = app_clinic_id());

CREATE POLICY "owner_all" ON conversation_messages FOR ALL
  USING (app_is_owner());
CREATE POLICY "clinic_staff_select" ON conversation_messages FOR SELECT
  USING (clinic_id = app_clinic_id());

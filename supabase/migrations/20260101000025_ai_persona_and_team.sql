-- Professionalize the AI receptionist:
--
-- 1. clinics.ai_persona_gender — lets each clinic pick whether its AI
--    receptionist speaks as a female ('female', default) or male ('male')
--    employee. n8n reads it from clinics_config and adapts the persona
--    name + Arabic grammatical gender in the agent prompt, so the bot gives
--    a consistent, human impression per clinic.
-- 2. Exposed through clinics_config (appended at the end — a view's columns
--    can only be added at the tail without dropping it).
-- 3. Column-level UPDATE grant so a manager can set it from settings without
--    being able to escalate other owner-only columns.
--
-- The clinic "team" (doctors and their services/schedules) that the AI
-- presents when a clinic has more than one practitioner is stored inside
-- clinics.ai_info_form (jsonb, `team` array) and rendered into ai_info_text
-- by assembleAiInfo() in the app — no schema change needed for it, it rides
-- the existing ai_info_text column the agent already reads.

ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS ai_persona_gender TEXT NOT NULL DEFAULT 'female'
  CHECK (ai_persona_gender IN ('female', 'male'));

GRANT UPDATE (ai_persona_gender) ON clinics TO authenticated;

-- Extend clinics_config with the new column (append at the end).
CREATE OR REPLACE VIEW clinics_config AS
SELECT
  c.id               AS clinic_id,
  c.clinic_key,
  c.name             AS clinic_name,
  c.doctor_name,
  c.address,
  c.status           AS clinic_status,
  -- WhatsApp
  ch.wa_phone_id,
  ch.wa_access_token,
  ch.wa_verify_token,
  -- DB
  db.db_type,
  db.sb_project_url,
  db.sb_service_key,
  db.mssql_host,
  db.mssql_port,
  db.mssql_database,
  db.mssql_schema,
  db.mssql_username,
  db.mssql_password,
  db.mssql_table_appointments,
  db.mssql_table_patients,
  db.mssql_table_reviews,
  db.gs_spreadsheet_id,
  db.gs_oauth_token,
  -- Automation
  a.reminder_enabled,
  a.reminder_hours_before,
  a.reminder_message_ar,
  a.rating_enabled,
  a.rating_delay_hours,
  a.rating_message_ar,
  a.working_hours_start,
  a.working_hours_end,
  tg.tg_bot_token,
  tg.is_enabled      AS tg_enabled,
  c.specialty,
  c.city,
  c.phone            AS clinic_phone,
  c.ai_info_text,
  c.ai_persona_gender
FROM clinics c
LEFT JOIN clinic_channels ch ON ch.clinic_id = c.id AND ch.channel = 'whatsapp'
LEFT JOIN clinic_channels tg ON tg.clinic_id = c.id AND tg.channel = 'telegram'
LEFT JOIN clinic_db_config db ON db.clinic_id = c.id
LEFT JOIN clinic_automation a ON a.clinic_id = c.id
WHERE c.status IN ('trial', 'active');

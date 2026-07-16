-- WhatsApp can be delivered via Meta Cloud API (default) or Twilio. Twilio is
-- much easier to onboard (sandbox in minutes, non-expiring SID+token, no
-- business verification), so each clinic picks its provider per channel.
--
-- twilio_whatsapp_from is the clinic's Twilio WhatsApp sender in E.164 form
-- (e.g. +14155238886); n8n adds the "whatsapp:" prefix when sending and
-- matches inbound Twilio webhooks against it.
ALTER TABLE clinic_channels
  ADD COLUMN IF NOT EXISTS wa_provider TEXT NOT NULL DEFAULT 'meta'
    CHECK (wa_provider IN ('meta', 'twilio')),
  ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT,
  ADD COLUMN IF NOT EXISTS twilio_auth_token TEXT,
  ADD COLUMN IF NOT EXISTS twilio_whatsapp_from TEXT;

-- Expose the provider + Twilio credentials to n8n (append at the end).
CREATE OR REPLACE VIEW clinics_config AS
SELECT
  c.id               AS clinic_id,
  c.clinic_key,
  c.name             AS clinic_name,
  c.doctor_name,
  c.address,
  c.status           AS clinic_status,
  ch.wa_phone_id,
  ch.wa_access_token,
  ch.wa_verify_token,
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
  c.ai_persona_gender,
  ch.wa_provider,
  ch.twilio_account_sid,
  ch.twilio_auth_token,
  ch.twilio_whatsapp_from
FROM clinics c
LEFT JOIN clinic_channels ch ON ch.clinic_id = c.id AND ch.channel = 'whatsapp'
LEFT JOIN clinic_channels tg ON tg.clinic_id = c.id AND tg.channel = 'telegram'
LEFT JOIN clinic_db_config db ON db.clinic_id = c.id
LEFT JOIN clinic_automation a ON a.clinic_id = c.id
WHERE c.status IN ('trial', 'active');

-- Payments module (owner decision — extends the original MVP scope).
-- Manual-transfer model: the clinic configures payment methods + a single
-- default deposit; the patient transfers and (later) uploads proof; staff
-- confirm or reject from the dashboard.

-- 1) Payment methods per clinic (Vodafone Cash / InstaPay / Visa transfer /
--    bank / cash / other).
CREATE TABLE IF NOT EXISTS clinic_payment_methods (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id    UUID REFERENCES clinics(id) ON DELETE CASCADE,
  name_ar      TEXT NOT NULL,
  name_en      TEXT,
  type         TEXT NOT NULL DEFAULT 'wallet'
               CHECK (type IN ('vodafone_cash','instapay','visa','bank','cash','other')),
  account_ref  TEXT,            -- phone number / account / IBAN shown to the patient
  instructions TEXT,            -- optional "how to pay" note
  is_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  show_in_bot  BOOLEAN NOT NULL DEFAULT TRUE,
  is_default   BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_methods_clinic ON clinic_payment_methods(clinic_id);

ALTER TABLE clinic_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON clinic_payment_methods FOR ALL USING (app_is_owner());
CREATE POLICY "clinic_staff_select" ON clinic_payment_methods FOR SELECT
  USING (clinic_id = app_clinic_id());
CREATE POLICY "clinic_manager_write" ON clinic_payment_methods FOR ALL
  USING (clinic_id = app_clinic_id() AND app_is_clinic_manager())
  WITH CHECK (clinic_id = app_clinic_id() AND app_is_clinic_manager());

-- 2) Single default deposit per clinic (owner chose "one default deposit").
ALTER TABLE clinic_automation
  ADD COLUMN IF NOT EXISTS deposit_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deposit_amount  NUMERIC(10,2) NOT NULL DEFAULT 0;

-- 3) Payment state on each booking. Kept OUT of sync_import_appointment's
--    content_hash/UPDATE set, so the 15-min sheet sync never clobbers it.
ALTER TABLE unified_appointments
  ADD COLUMN IF NOT EXISTS payment_status    TEXT NOT NULL DEFAULT 'none'
    CHECK (payment_status IN ('none','pending','paid','rejected','refunded')),
  ADD COLUMN IF NOT EXISTS deposit_amount    NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS payment_method    TEXT,
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_note      TEXT,
  ADD COLUMN IF NOT EXISTS payment_updated_at TIMESTAMPTZ;

-- 4) Expose deposit + bot-visible payment methods through clinics_config for
--    the AI receptionist (later phase). security_invoker is baked into the
--    definition here so future CREATE OR REPLACE calls can't silently revert
--    it to a SECURITY DEFINER view (which previously leaked secrets).
CREATE OR REPLACE VIEW clinics_config
WITH (security_invoker = on) AS
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
  ch.twilio_whatsapp_from,
  a.deposit_enabled,
  a.deposit_amount,
  (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'name_ar', pm.name_ar, 'name_en', pm.name_en, 'type', pm.type,
          'account_ref', pm.account_ref, 'instructions', pm.instructions
        ) ORDER BY pm.sort_order, pm.created_at
      ) FILTER (WHERE pm.is_enabled AND pm.show_in_bot),
      '[]'::jsonb)
    FROM clinic_payment_methods pm WHERE pm.clinic_id = c.id
  ) AS payment_methods
FROM clinics c
LEFT JOIN clinic_channels ch ON ch.clinic_id = c.id AND ch.channel = 'whatsapp'
LEFT JOIN clinic_channels tg ON tg.clinic_id = c.id AND tg.channel = 'telegram'
LEFT JOIN clinic_db_config db ON db.clinic_id = c.id
LEFT JOIN clinic_automation a ON a.clinic_id = c.id
WHERE c.status IN ('trial', 'active');

REVOKE ALL ON public.clinics_config FROM anon, authenticated;

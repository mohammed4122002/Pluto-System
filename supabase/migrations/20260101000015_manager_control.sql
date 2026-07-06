-- Clinic managers get real control over their own clinic:
--
-- 1. clinics.ai_info_text — free text the AI receptionist reads to answer
--    patient questions (services, prices, insurance, doctors...). Exposed
--    through clinics_config so n8n can inject it into the agent prompt.
-- 2. UPDATE RLS policies for managers on clinics + clinic_automation.
--    Staff previously had SELECT only, so the manager settings form
--    "saved" 0 rows silently (PostgREST reports no error on RLS-filtered
--    updates).
-- 3. Column-level UPDATE grant on clinics so a manager cannot escalate
--    (status/clinic_key stay owner-only; owner APIs use the service role,
--    which has its own full grants and is unaffected).

ALTER TABLE clinics ADD COLUMN IF NOT EXISTS ai_info_text TEXT;

CREATE OR REPLACE FUNCTION app_is_clinic_manager()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_users
    WHERE auth_id = auth.uid() AND role = 'manager' AND is_active
  );
$$;

CREATE POLICY "clinic_manager_update" ON clinics FOR UPDATE
  USING (id = app_clinic_id() AND app_is_clinic_manager())
  WITH CHECK (id = app_clinic_id() AND app_is_clinic_manager());

CREATE POLICY "clinic_manager_update" ON clinic_automation FOR UPDATE
  USING (clinic_id = app_clinic_id() AND app_is_clinic_manager())
  WITH CHECK (clinic_id = app_clinic_id() AND app_is_clinic_manager());

REVOKE UPDATE ON clinics FROM authenticated;
GRANT UPDATE (name, doctor_name, specialty, city, address, phone, logo_url, notes, ai_info_text)
  ON clinics TO authenticated;

-- Extend clinics_config with the fields the AI receptionist needs
-- (columns may only be appended at the end of an existing view).
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
  c.ai_info_text
FROM clinics c
LEFT JOIN clinic_channels ch ON ch.clinic_id = c.id AND ch.channel = 'whatsapp'
LEFT JOIN clinic_channels tg ON tg.clinic_id = c.id AND tg.channel = 'telegram'
LEFT JOIN clinic_db_config db ON db.clinic_id = c.id
LEFT JOIN clinic_automation a ON a.clinic_id = c.id
WHERE c.status IN ('trial', 'active');

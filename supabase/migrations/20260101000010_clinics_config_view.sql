-- 3.10 Clinics_Config VIEW (used by n8n)
-- n8n reads this view to get everything it needs in one query
CREATE VIEW clinics_config AS
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
  a.working_hours_end
FROM clinics c
LEFT JOIN clinic_channels ch ON ch.clinic_id = c.id AND ch.channel = 'whatsapp'
LEFT JOIN clinic_db_config db ON db.clinic_id = c.id
LEFT JOIN clinic_automation a ON a.clinic_id = c.id
WHERE c.status IN ('trial', 'active');

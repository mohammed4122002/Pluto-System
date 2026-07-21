-- Clinic contact + social links (public directory + bot context).
--   * country: free text (city already exists on clinics).
--   * instagram_url / facebook_url: clinic social profiles.
--   * phone already exists as clinics.phone (exposed to the bot as
--     clinic_phone) — reused, no duplicate phone_number column.
-- A functional index on lower(city) speeds the public directory's city filter
-- and disambiguates same-named clinics across cities.

alter table public.clinics
  add column if not exists country text,
  add column if not exists instagram_url text,
  add column if not exists facebook_url text;

create index if not exists clinics_city_idx on public.clinics (lower(city));

-- Expose the new fields to the bot via clinics_config (n8n "Find Clinic").
-- Rebuilds the whole view; keep security_invoker + service_role-only lock
-- from 20260101000028_secure_clinics_config.sql.
create or replace view clinics_config as
select
  c.id               as clinic_id,
  c.clinic_key,
  c.name             as clinic_name,
  c.doctor_name,
  c.address,
  c.status           as clinic_status,
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
  tg.is_enabled      as tg_enabled,
  c.specialty,
  c.city,
  c.country,
  c.phone            as clinic_phone,
  c.instagram_url,
  c.facebook_url,
  c.ai_info_text,
  c.ai_persona_gender,
  ch.wa_provider,
  ch.twilio_account_sid,
  ch.twilio_auth_token,
  ch.twilio_whatsapp_from
from clinics c
left join clinic_channels ch on ch.clinic_id = c.id and ch.channel = 'whatsapp'
left join clinic_channels tg on tg.clinic_id = c.id and tg.channel = 'telegram'
left join clinic_db_config db on db.clinic_id = c.id
left join clinic_automation a on a.clinic_id = c.id
where c.status in ('trial', 'active');

alter view public.clinics_config set (security_invoker = true);
revoke all on public.clinics_config from anon, authenticated;

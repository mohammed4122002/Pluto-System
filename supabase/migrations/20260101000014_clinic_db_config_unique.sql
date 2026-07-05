-- clinic_db_config had no unique constraint on clinic_id, so PostgREST's
-- embed (db_config:clinic_db_config(*)) returned an array instead of a
-- single object -- every consumer that read db_config.db_type as a scalar
-- (getClinicWithDbConfig, admin clinic detail page) silently saw undefined,
-- which made getClinicAppointments treat every Supabase-backed clinic as
-- non-Supabase and always return null. Each clinic has exactly one db
-- config by design (same as clinic_automation, which already has this).
ALTER TABLE clinic_db_config ADD CONSTRAINT clinic_db_config_clinic_id_key UNIQUE (clinic_id);

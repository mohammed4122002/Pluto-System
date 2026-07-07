-- Per-employee schedule on the login account.
--
-- Owner decision: an "employee" IS a login account (platform_users), not a
-- separate record — so scheduling attributes live here, next to the account
-- they describe. The services/absences that link TO an employee live in the
-- clinic's own DB (see supabase/clinic-schema.sql) and reference this row's
-- id as a soft cross-database ref.
--
--   working_days: ISO-ish day indices the employee works, 0=Sunday .. 6=Saturday.
--   work_start / work_end: that employee's daily shift window (clinic-local time).
--
-- Edited by the clinic manager through the staff admin API (service role), so
-- no extra column GRANT/RLS is needed here — platform_users stays owner-only
-- and manager-only at the API layer.

ALTER TABLE platform_users
  ADD COLUMN IF NOT EXISTS work_start   TIME,
  ADD COLUMN IF NOT EXISTS work_end     TIME,
  ADD COLUMN IF NOT EXISTS working_days INTEGER[];

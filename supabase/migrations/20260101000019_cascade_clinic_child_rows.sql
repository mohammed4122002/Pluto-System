-- Deleting a clinic was blocked by NO ACTION FKs on its log/session rows
-- (which accumulate during normal operation). Cascade them so removing a
-- clinic cleanly removes its execution log + WhatsApp/Telegram sessions.
ALTER TABLE n8n_execution_log DROP CONSTRAINT n8n_execution_log_clinic_id_fkey;
ALTER TABLE n8n_execution_log
  ADD CONSTRAINT n8n_execution_log_clinic_id_fkey
  FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE wa_sessions DROP CONSTRAINT wa_sessions_clinic_id_fkey;
ALTER TABLE wa_sessions
  ADD CONSTRAINT wa_sessions_clinic_id_fkey
  FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE tg_sessions DROP CONSTRAINT tg_sessions_clinic_id_fkey;
ALTER TABLE tg_sessions
  ADD CONSTRAINT tg_sessions_clinic_id_fkey
  FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

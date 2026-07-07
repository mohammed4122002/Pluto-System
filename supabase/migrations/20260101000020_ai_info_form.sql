-- Structured backing for the AI-info builder modal. ai_info_text (read by
-- n8n via clinics_config) stays the assembled, AI-readable string; this
-- jsonb keeps the structured fields so the modal can repopulate for editing.
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS ai_info_form JSONB;
GRANT UPDATE (ai_info_form) ON clinics TO authenticated;

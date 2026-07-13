-- clinic_metrics(): the AI Insights n8n workflow calls this RPC, but the
-- unified-aggregation migration (20260101000022) didn't define it. Scoped to
-- the caller's own clinic (or the owner) — without this check any
-- authenticated user could read any clinic's metrics.
CREATE OR REPLACE FUNCTION clinic_metrics(p_clinic_id UUID)
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (app_is_owner() OR p_clinic_id = app_clinic_id()) THEN
    RAISE EXCEPTION 'not authorized for this clinic';
  END IF;

  RETURN (
    SELECT json_build_object(
      'total_appointments_30d', (SELECT count(*) FROM unified_appointments WHERE clinic_id = p_clinic_id AND appointment_time >= now() - interval '30 days' AND appointment_time < now() AND NOT deleted),
      'completed_30d', (SELECT count(*) FROM unified_appointments WHERE clinic_id = p_clinic_id AND status = 'completed' AND appointment_time >= now() - interval '30 days' AND NOT deleted),
      'cancelled_30d', (SELECT count(*) FROM unified_appointments WHERE clinic_id = p_clinic_id AND status = 'cancelled' AND appointment_time >= now() - interval '30 days' AND NOT deleted),
      'no_show_30d', (SELECT count(*) FROM unified_appointments WHERE clinic_id = p_clinic_id AND status = 'no_show' AND appointment_time >= now() - interval '30 days' AND NOT deleted),
      'upcoming_count', (SELECT count(*) FROM unified_appointments WHERE clinic_id = p_clinic_id AND status = 'scheduled' AND appointment_time >= now() AND NOT deleted),
      'reviews_30d', (SELECT count(*) FROM unified_reviews WHERE clinic_id = p_clinic_id AND created_at >= now() - interval '30 days' AND NOT deleted),
      'avg_rating_30d', (SELECT round(avg(stars)::numeric,2) FROM unified_reviews WHERE clinic_id = p_clinic_id AND created_at >= now() - interval '30 days' AND NOT deleted)
    )
  );
END;
$$;

-- These write RPCs take a bare clinic_id/row id with no ownership check and
-- are meant to be called only by n8n (sync_import_*, sync_mark_exported) or
-- Next.js server actions (dashboard_write_appointment,
-- dashboard_mirror_appointment) using the service role key, which bypasses
-- RLS but NOT function-level GRANTs — Postgres grants EXECUTE on new
-- functions to PUBLIC by default, so without this they're callable by any
-- anon/authenticated caller with an arbitrary clinic_id.
REVOKE EXECUTE ON FUNCTION sync_import_appointment(UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sync_import_patient(UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sync_import_review(UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sync_import_appointments_bulk(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sync_import_reviews_bulk(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION dashboard_write_appointment(UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sync_mark_exported(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION dashboard_mirror_appointment(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION sync_import_appointment(UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION sync_import_patient(UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION sync_import_review(UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION sync_import_appointments_bulk(UUID, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION sync_import_reviews_bulk(UUID, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION dashboard_write_appointment(UUID, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION sync_mark_exported(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION dashboard_mirror_appointment(UUID, TEXT, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION clinic_metrics(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION clinic_metrics(UUID) TO authenticated, service_role;

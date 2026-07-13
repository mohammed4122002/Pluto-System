-- RPCs backing the n8n sync workflows (Sync Import/Export, AI Insights).
-- Access is locked to service_role only (n8n's key) except clinic_metrics,
-- which the dashboard also calls and is scoped to the caller's own clinic.

CREATE OR REPLACE FUNCTION safe_timestamptz(v TEXT) RETURNS TIMESTAMPTZ
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF v IS NULL OR v = '' THEN RETURN NULL; END IF;
  RETURN v::timestamptz;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION safe_int(v TEXT) RETURNS INTEGER
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF v IS NULL OR v = '' THEN RETURN NULL; END IF;
  RETURN round(v::numeric)::int;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION safe_bool(v TEXT) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(coalesce(v,'')) IN ('true','1','yes','on');
$$;

-- Imports rows from a clinic's sheet into the unified table. Conflict rule
-- (last-write-wins, dashboard-priority): skip a row if the local copy has an
-- unexported dashboard edit (sync_status='pending_out'), or if nothing about
-- the incoming row actually changed (content_hash match).
CREATE OR REPLACE FUNCTION sync_import_appointments_bulk(p_clinic_id UUID, p_source TEXT, p_rows JSONB)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  row_data JSONB;
  v_hash TEXT;
  v_count INTEGER := 0;
BEGIN
  FOR row_data IN SELECT * FROM jsonb_array_elements(coalesce(p_rows, '[]'::jsonb))
  LOOP
    IF row_data->>'external_id' IS NULL OR row_data->>'external_id' = '' THEN CONTINUE; END IF;

    v_hash := md5(
      coalesce(row_data->>'patient_name','') || '|' ||
      coalesce(row_data->>'patient_phone','') || '|' ||
      coalesce(row_data->>'appointment_time','') || '|' ||
      coalesce(row_data->>'status','') || '|' ||
      coalesce(row_data->>'notes','') || '|' ||
      coalesce(row_data->>'duration_minutes','')
    );

    INSERT INTO unified_appointments (
      clinic_id, source, external_id, patient_name, patient_phone,
      appointment_time, status, notes, duration_minutes,
      reminder_sent, rating_sent, sync_status, content_hash, updated_at
    ) VALUES (
      p_clinic_id, p_source, row_data->>'external_id',
      row_data->>'patient_name', row_data->>'patient_phone',
      safe_timestamptz(row_data->>'appointment_time'),
      coalesce(row_data->>'status','scheduled'),
      row_data->>'notes',
      coalesce(safe_int(row_data->>'duration_minutes'), 30),
      safe_bool(row_data->>'reminder_sent'),
      safe_bool(row_data->>'rating_sent'),
      'synced', v_hash, now()
    )
    ON CONFLICT (clinic_id, external_id) DO UPDATE SET
      patient_name = EXCLUDED.patient_name,
      patient_phone = EXCLUDED.patient_phone,
      appointment_time = EXCLUDED.appointment_time,
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      duration_minutes = EXCLUDED.duration_minutes,
      reminder_sent = EXCLUDED.reminder_sent,
      rating_sent = EXCLUDED.rating_sent,
      sync_status = 'synced',
      content_hash = EXCLUDED.content_hash,
      updated_at = now()
    WHERE unified_appointments.sync_status <> 'pending_out'
      AND unified_appointments.content_hash IS DISTINCT FROM EXCLUDED.content_hash;

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION sync_import_reviews_bulk(p_clinic_id UUID, p_source TEXT, p_rows JSONB)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  row_data JSONB;
  v_appt_id UUID;
  v_count INTEGER := 0;
BEGIN
  FOR row_data IN SELECT * FROM jsonb_array_elements(coalesce(p_rows, '[]'::jsonb))
  LOOP
    IF row_data->>'external_id' IS NULL OR row_data->>'external_id' = '' THEN CONTINUE; END IF;

    v_appt_id := NULL;
    IF row_data->>'appointment_id' IS NOT NULL THEN
      SELECT id INTO v_appt_id FROM unified_appointments
        WHERE clinic_id = p_clinic_id AND external_id = row_data->>'appointment_id'
        LIMIT 1;
    END IF;

    INSERT INTO unified_reviews (
      clinic_id, source, external_id, appointment_id, patient_phone, stars, comment, updated_at
    ) VALUES (
      p_clinic_id, p_source, row_data->>'external_id', v_appt_id,
      row_data->>'patient_phone', safe_int(row_data->>'stars'),
      row_data->>'comment', now()
    )
    ON CONFLICT (clinic_id, external_id) DO UPDATE SET
      appointment_id = EXCLUDED.appointment_id,
      patient_phone = EXCLUDED.patient_phone,
      stars = EXCLUDED.stars,
      comment = EXCLUDED.comment,
      updated_at = now();

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Called by Sync Export after a successful push to the sheet: clears the
-- pending flag and records the exported content hash so the next import pass
-- treats this state as already-synced (no spurious re-import diff).
CREATE OR REPLACE FUNCTION sync_mark_exported(p_id UUID, p_external_id TEXT, p_content_hash TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE unified_appointments
  SET sync_status = 'synced',
      external_id = p_external_id,
      content_hash = coalesce(p_content_hash, content_hash),
      updated_at = now()
  WHERE id = p_id;
END;
$$;

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

REVOKE EXECUTE ON FUNCTION sync_import_appointments_bulk(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sync_import_reviews_bulk(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sync_mark_exported(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION clinic_metrics(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION sync_import_appointments_bulk(UUID, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION sync_import_reviews_bulk(UUID, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION sync_mark_exported(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION clinic_metrics(UUID) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION app_is_owner() FROM anon;
REVOKE EXECUTE ON FUNCTION app_clinic_id() FROM anon;
REVOKE EXECUTE ON FUNCTION app_is_clinic_manager() FROM anon;

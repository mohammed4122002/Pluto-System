-- Payments phase 2: the bot marks a patient's latest unpaid booking as
-- "pending review" when they submit a transfer proof. Matches by the last 9
-- phone digits (tolerant of country-code differences). service_role only.
CREATE OR REPLACE FUNCTION record_payment_pending(
  p_clinic_id uuid,
  p_phone     text,
  p_proof_url text DEFAULT NULL,
  p_method    text DEFAULT NULL,
  p_amount    numeric DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_digits text;
BEGIN
  v_digits := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);
  SELECT id INTO v_id FROM unified_appointments
   WHERE clinic_id = p_clinic_id AND deleted = false
     AND payment_status IN ('none', 'rejected')
     AND (v_digits = '' OR regexp_replace(coalesce(patient_phone, ''), '\D', '', 'g') LIKE '%' || v_digits)
   ORDER BY created_at DESC LIMIT 1;
  IF v_id IS NULL THEN RETURN 'not_found'; END IF;
  UPDATE unified_appointments SET
    payment_status     = 'pending',
    payment_proof_url  = coalesce(p_proof_url, payment_proof_url),
    payment_method     = coalesce(p_method, payment_method),
    deposit_amount     = coalesce(p_amount, deposit_amount),
    payment_note       = 'أرسل المريض إثبات التحويل عبر البوت',
    payment_updated_at = now()
   WHERE id = v_id;
  RETURN 'ok';
END; $$;

REVOKE ALL ON FUNCTION record_payment_pending(uuid, text, text, text, numeric)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_payment_pending(uuid, text, text, text, numeric)
  TO service_role;

-- Staff alerts, phase 2: notify clinic staff on Telegram when a patient
-- submits a deposit-payment proof (payment_status flips to 'pending'), the
-- same way new bookings are alerted. A dedicated flag keeps the payment
-- alert independent of the booking alert (staff_alerted_at) so both fire
-- exactly once. Backfill existing pending rows so only future proofs alert.
ALTER TABLE unified_appointments
  ADD COLUMN IF NOT EXISTS payment_alerted_at TIMESTAMPTZ;

UPDATE unified_appointments
   SET payment_alerted_at = NOW()
 WHERE payment_alerted_at IS NULL
   AND payment_status = 'pending';

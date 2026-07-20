-- Deposit-payment deadline: bot bookings for deposit-enabled clinics must be
-- paid within clinic_automation.deposit_deadline_hours or they are cancelled
-- automatically, with a reminder message one hour before the deadline.
-- payment_deadline_tick() is run by the n8n "Payment Deadline" cron; patient
-- messages go through notify_queue (delivered by the Payment Review Notify
-- worker), so this whole feature is DB-driven and immune to network issues
-- between Vercel and n8n.

alter table public.clinic_automation
  add column if not exists deposit_deadline_hours int not null default 3;

alter table public.unified_appointments
  add column if not exists deposit_due_at timestamptz,
  add column if not exists payment_reminder_sent_at timestamptz;

alter table public.notify_queue drop constraint if exists notify_queue_decision_check;
alter table public.notify_queue
  add constraint notify_queue_decision_check
  check (decision in ('paid', 'rejected', 'deposit_reminder', 'deposit_cancelled'));

create or replace function public.payment_deadline_tick()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_stamped int := 0;
  v_reminded int := 0;
  v_cancelled int := 0;
begin
  -- 1) Stamp a deadline on unpaid bot bookings (deposit_amount is only set by
  --    the AI booking flow) that don't have one yet. Pre-existing rows get at
  --    least one hour of grace from now so the feature's rollout never
  --    cancels anything without a reminder first.
  with stamped as (
    update unified_appointments ua
    set deposit_due_at = greatest(
      ua.created_at + make_interval(hours => coalesce(a.deposit_deadline_hours, 3)),
      now() + interval '1 hour'
    )
    from clinic_automation a
    where a.clinic_id = ua.clinic_id
      and a.deposit_enabled
      and ua.deposit_due_at is null
      and ua.deposit_amount is not null
      and ua.payment_status in ('none', 'rejected')
      and ua.status = 'scheduled'
      and ua.deleted = false
    returning ua.id
  )
  select count(*) into v_stamped from stamped;

  -- 2) One reminder inside the final hour before the deadline.
  with due as (
    update unified_appointments ua
    set payment_reminder_sent_at = now()
    where ua.deposit_due_at is not null
      and ua.payment_reminder_sent_at is null
      and ua.payment_status in ('none', 'rejected')
      and ua.status = 'scheduled'
      and ua.deleted = false
      and now() >= ua.deposit_due_at - interval '1 hour'
      and now() < ua.deposit_due_at
    returning ua.id, ua.clinic_id
  ), queued as (
    insert into notify_queue (clinic_id, appointment_id, decision)
    select clinic_id, id, 'deposit_reminder' from due
    returning id
  )
  select count(*) into v_reminded from queued;

  -- 3) Cancel past-deadline unpaid bookings and queue the patient notice.
  --    sync_status='pending_out' lets Sync Export push the cancellation back
  --    to the clinic's sheet.
  with cx as (
    update unified_appointments ua
    set status = 'cancelled',
        sync_status = 'pending_out',
        payment_note = trim(both ' | ' from coalesce(ua.payment_note, '') || ' | أُلغي تلقائياً لعدم دفع المقدّم خلال المهلة'),
        updated_at = now()
    where ua.deposit_due_at is not null
      and ua.deposit_due_at <= now()
      and ua.payment_status in ('none', 'rejected')
      and ua.status = 'scheduled'
      and ua.deleted = false
    returning ua.id, ua.clinic_id
  ), queued as (
    insert into notify_queue (clinic_id, appointment_id, decision)
    select clinic_id, id, 'deposit_cancelled' from cx
    returning id
  )
  select count(*) into v_cancelled from queued;

  return jsonb_build_object(
    'stamped', v_stamped,
    'reminded', v_reminded,
    'cancelled', v_cancelled
  );
end;
$$;

revoke execute on function public.payment_deadline_tick() from public, anon, authenticated;

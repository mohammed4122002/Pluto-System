-- Subscription lifecycle automation (P2.1):
--   * 7-day and 1-day expiry warnings to clinic staff + platform owner
--     (Telegram DM via the hourly n8n "Subscription Lifecycle" cron).
--   * Auto-suspend the clinic when its last active subscription expires
--     (bot replies politely and stops; reminder/rating crons already filter
--     on clinic_status).
--   * Auto-reactivate as soon as a valid subscription exists again
--     (also done instantly by the renewals API; the tick is the guarantee).

alter table public.subscriptions
  add column if not exists expiry_alert_7d_at timestamptz,
  add column if not exists expiry_alert_1d_at timestamptz;

alter table public.clinics
  add column if not exists suspended_reason text;

create or replace function public.subscription_lifecycle_tick()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_alerts jsonb := '[]'::jsonb;
  v_step jsonb;
begin
  -- 1) Expire past-due subscriptions; suspend clinics with no remaining cover.
  with expired as (
    update subscriptions s
    set status = 'expired'
    where s.status = 'active'
      and s.expires_at < current_date
    returning s.clinic_id, s.expires_at, s.plan
  ), susp as (
    update clinics c
    set status = 'suspended', suspended_reason = 'subscription_expired'
    from (select distinct clinic_id from expired) e
    where c.id = e.clinic_id
      and c.status in ('trial', 'active')
      and not exists (
        select 1 from subscriptions s2
        where s2.clinic_id = c.id
          and s2.status = 'active'
          and s2.expires_at >= current_date
      )
    returning c.id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'kind', 'expired', 'clinic_id', s.id
  )), '[]'::jsonb) into v_step from susp s;
  v_alerts := v_alerts || v_step;

  -- 2) Reactivate suspended-for-expiry clinics that now have valid cover.
  with react as (
    update clinics c
    set status = 'active', suspended_reason = null
    where c.status = 'suspended'
      and c.suspended_reason = 'subscription_expired'
      and exists (
        select 1 from subscriptions s
        where s.clinic_id = c.id
          and s.status = 'active'
          and s.expires_at >= current_date
      )
    returning c.id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'kind', 'renewed', 'clinic_id', r.id
  )), '[]'::jsonb) into v_step from react r;
  v_alerts := v_alerts || v_step;

  -- 3) 7-day warning — once, and only on the clinic's furthest-out active sub.
  with warn as (
    update subscriptions s
    set expiry_alert_7d_at = now()
    where s.status = 'active'
      and s.expiry_alert_7d_at is null
      and s.expires_at >= current_date
      and s.expires_at <= current_date + 7
      and not exists (
        select 1 from subscriptions s2
        where s2.clinic_id = s.clinic_id
          and s2.status = 'active'
          and s2.expires_at > s.expires_at
      )
    returning s.clinic_id, s.expires_at
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'kind', '7d', 'clinic_id', w.clinic_id, 'expires_at', w.expires_at
  )), '[]'::jsonb) into v_step from warn w;
  v_alerts := v_alerts || v_step;

  -- 4) 1-day warning — same rules, tighter window.
  with warn as (
    update subscriptions s
    set expiry_alert_1d_at = now()
    where s.status = 'active'
      and s.expiry_alert_1d_at is null
      and s.expires_at >= current_date
      and s.expires_at <= current_date + 1
      and not exists (
        select 1 from subscriptions s2
        where s2.clinic_id = s.clinic_id
          and s2.status = 'active'
          and s2.expires_at > s.expires_at
      )
    returning s.clinic_id, s.expires_at
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'kind', '1d', 'clinic_id', w.clinic_id, 'expires_at', w.expires_at
  )), '[]'::jsonb) into v_step from warn w;
  v_alerts := v_alerts || v_step;

  -- Enrich alerts with clinic name, a Telegram bot token to send with
  -- (the clinic's own bot, else any enabled bot so the owner still hears),
  -- and the recipient chats: clinic staff + platform owner(s).
  return (
    select coalesce(jsonb_agg(
      a || jsonb_build_object(
        'clinic_name', (select name from clinics where id = (a->>'clinic_id')::uuid),
        'bot_token', coalesce(
          (select cc.tg_bot_token from clinic_channels cc
           where cc.clinic_id = (a->>'clinic_id')::uuid
             and cc.channel = 'telegram' and cc.is_enabled
             and cc.tg_bot_token is not null
           limit 1),
          (select cc.tg_bot_token from clinic_channels cc
           where cc.channel = 'telegram' and cc.is_enabled
             and cc.tg_bot_token is not null
           limit 1)
        ),
        'chats', (
          select coalesce(jsonb_agg(distinct pu.notify_chat_id), '[]'::jsonb)
          from platform_users pu
          where pu.notify_chat_id is not null
            and (pu.clinic_id = (a->>'clinic_id')::uuid or pu.clinic_id is null)
        )
      )
    ), '[]'::jsonb)
    from jsonb_array_elements(v_alerts) a
  );
end;
$$;

revoke execute on function public.subscription_lifecycle_tick() from public, anon, authenticated;

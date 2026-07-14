-- Production hardening (QA pass, 2026-07-14)
-- Addresses Supabase security + performance advisors without altering access semantics.
--
-- 1. Pin search_path on the 11 functions the linter flagged as mutable
--    (matches the existing `search_path=public` convention on the app_* helpers,
--    which reference public tables unqualified — '' would break them).
-- 2. Add covering indexes for the 5 clinic_id foreign keys.
-- 3. Fix the auth_rls_initplan re-evaluation on platform_users.self_select.
--
-- NOT changed (documented as accepted risk): the SECURITY DEFINER helpers
-- app_is_owner()/app_clinic_id()/app_is_clinic_manager() stay EXECUTE-able by
-- anon, because every RLS policy is `TO public` and calls them — revoking the
-- grant would turn unauthenticated queries into "permission denied" errors
-- during the pre-login/auth flow. The helpers only ever return the CALLER's own
-- identity, so direct REST calls leak nothing cross-tenant.

-- 1. search_path -----------------------------------------------------------
alter function public.try_timestamptz(text)                         set search_path = public;
alter function public.try_bool(text)                                set search_path = public;
alter function public.try_int(text)                                 set search_path = public;
alter function public.sync_import_appointment(uuid, text, text, jsonb, timestamptz)  set search_path = public;
alter function public.sync_import_patient(uuid, text, text, jsonb, timestamptz)      set search_path = public;
alter function public.sync_import_review(uuid, text, text, jsonb, timestamptz)       set search_path = public;
alter function public.sync_import_appointments_bulk(uuid, text, jsonb)               set search_path = public;
alter function public.sync_import_reviews_bulk(uuid, text, jsonb)                    set search_path = public;
alter function public.dashboard_write_appointment(uuid, uuid, jsonb)                 set search_path = public;
alter function public.sync_mark_exported(uuid, text, text)                           set search_path = public;
alter function public.dashboard_mirror_appointment(uuid, text, jsonb)               set search_path = public;

-- 2. Covering indexes for clinic_id foreign keys ---------------------------
create index if not exists idx_clinic_channels_clinic       on public.clinic_channels(clinic_id);
create index if not exists idx_conversation_messages_clinic on public.conversation_messages(clinic_id);
create index if not exists idx_n8n_execution_log_clinic     on public.n8n_execution_log(clinic_id);
create index if not exists idx_platform_users_clinic        on public.platform_users(clinic_id);
create index if not exists idx_subscriptions_clinic         on public.subscriptions(clinic_id);

-- 3. RLS init-plan: evaluate auth.uid() once per query, not per row --------
alter policy self_select on public.platform_users
  using (auth_id = (select auth.uid()));

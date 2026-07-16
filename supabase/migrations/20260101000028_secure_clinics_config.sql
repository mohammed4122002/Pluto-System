-- SECURITY (critical): clinics_config exposes every clinic's channel + DB
-- secrets (wa_access_token, twilio_auth_token, sb_service_key, mssql_password,
-- tg_bot_token, gs_oauth_token). Supabase's default privileges had granted
-- SELECT on the view to anon + authenticated, and because it is a
-- SECURITY DEFINER view it bypasses the underlying tables' RLS — so anyone
-- holding the public anon key could dump ALL clinics' credentials via
-- /rest/v1/clinics_config.
--
-- Only n8n (service_role) and the Next.js admin client (service_role) ever
-- read this view, so lock it to service_role. security_invoker = true makes
-- the view additionally respect the querying role's RLS as defense in depth
-- (service_role has BYPASSRLS, so n8n/admin reads are unaffected).
ALTER VIEW public.clinics_config SET (security_invoker = true);
REVOKE ALL ON public.clinics_config FROM anon, authenticated;

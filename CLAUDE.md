# MediSync AI — Project Context

Multi-tenant SaaS: clinic owners get a dashboard + a WhatsApp/Telegram bot
that automates:

1. **Appointment reminder** — sent X hours before the appointment.
2. **Post-visit rating** — stars 1–5 + optional comment.
3. **AI receptionist** — a conversational agent (see below) that answers
   patient questions and can book/cancel appointments via chat. Scope
   expanded mid-project (explicit owner decision) from the original
   "reminders + ratings only" MVP — see "AI receptionist" section below.

One n8n workflow per channel (owned by the platform, not per-clinic) serves
every clinic: it reads `clinic_key`/`wa_phone_id` from the incoming
request/cron tick, looks up that clinic's config from the `clinics_config`
view in the **owner's** Supabase project, then acts using that clinic's own
credentials (WhatsApp/Telegram token, and its own DB — Supabase, SQL Server,
or Google Sheets).

Do not build: payments, multi-doctor/multi-branch, white-label, SMS/email,
analytics/AI insights. Messenger/Instagram: wire the UI toggle and persist
to DB only — n8n doesn't send on those channels yet. WhatsApp and Telegram
both fully work (reminders, ratings, and the AI receptionist below).

## Infrastructure accounts (changed 2026-07-13 — don't assume the old ones)

The owner's Supabase project and n8n account were both migrated to fresh
accounts. Never hardcode a project ref/host in code — always go through env
vars — but when working live in Supabase MCP / n8n MCP, use these:

- **Owner Supabase project:** `ylvowifrvhkgtvxllghg` (org `plutosystems`).
  The previous project (`yihumcfjgvelcozbiqib`) is no longer accessible from
  this environment.
- **n8n:** self-hosted on Hostinger, `https://n8n-quc4.srv1825882.hstgr.cloud`
  (previously n8n Cloud, which hit its free-tier execution cap repeatedly —
  self-hosting removes that ceiling). Credentials in that instance: "MediSync
  Owner Supabase" (Supabase API), "MediSync Google Sheets" (OAuth2), "MediSync
  OpenAI".
- The Google Cloud project behind the Google Sheets OAuth credential must
  have the Sheets API enabled (`console.developers.google.com/apis/api/
  sheets.googleapis.com`) — a fresh Google Cloud project does not enable it
  by default, and every Sheets-reading node fails until it's turned on.
- **n8n Workflow SDK gotcha:** `update_workflow`'s `setNodeParameter` `path`
  is relative to the node's `parameters` object — use `path: "/url"`, not
  `path: "/parameters/url"`. The latter silently creates a dead nested
  `parameters.parameters.url` instead of overwriting the real field, so the
  node keeps using its old value with no error at edit time.

## Two databases, don't confuse them

- **Owner's Supabase project** (`lib/supabase/{client,server,admin}.ts`) —
  platform data: `clinics`, `clinic_channels`, `clinic_db_config`,
  `clinic_automation`, `subscriptions`, `platform_users`,
  `n8n_execution_log`, `wa_sessions`, and the `clinics_config` view. Also
  now holds the **unified sync tables** (see below) that mirror Sheets-clinic
  appointments/reviews so the dashboard never has to call n8n on page load.
  Migrations: `supabase/migrations/*.sql`, run in filename order.
- **Each clinic's own DB** (`lib/db-adapters/*`) — `patients`,
  `appointments`, `reviews`. Only reachable directly from Next.js when
  `db_type = 'supabase'` (`supabase/clinic-schema.sql`, one clinic
  project per clinic). SQL Server and Google Sheets clinics are read only
  by the n8n workflow — `lib/db-adapters/mssql.ts` and `sheets.ts` just
  validate config, they don't open a live connection.

## Unified sync (owner project — Google Sheets clinics only, so far)

Built directly in n8n (not by hand in this repo, but schema tracked in
`supabase/migrations/20260101000022/23_unified_sync_*.sql`) to stop the
dashboard depending on live n8n round-trips for Sheets clinics:

- `unified_appointments` / `unified_reviews` — owner-project mirror of a
  Sheets clinic's Appointments/Reviews tabs. `sync_status`: `synced` |
  `pending_out` (dashboard edited, not yet pushed back) | `local_only`.
  `content_hash` + `external_id` (the sheet row's `id`) drive dedup/conflict
  resolution — last-write-wins, but an import never clobbers a row still
  `pending_out`.
- `column_mappings` — AI-detected (GPT) mapping from a clinic's actual sheet
  headers to the canonical field names, cached per clinic+resource so the
  model runs once per sheet shape, not every sync tick.
- `ai_insights` — daily GPT-generated Arabic summary + alerts +
  recommendations per clinic, from the `clinic_metrics()` RPC.
- n8n workflows: **Sync Import** (15 min, Sheets → unified, AI column
  mapping), **Sync Import Reviews** (15 min), **Sync Export** (5 min,
  unified → Sheets for `pending_out` rows), **AI Insights** (daily 06:00).
- RPCs are `SECURITY DEFINER` and locked to `service_role` only
  (`sync_import_appointments_bulk`, `sync_import_reviews_bulk`,
  `sync_mark_exported`) except `clinic_metrics`, which `authenticated` can
  also call — but only for their own `clinic_id` (checked inside the
  function against `app_is_owner()`/`app_clinic_id()`).
- **Not yet wired into the Next.js dashboard reads/writes** — `lib/
  clinic-data.ts` still reads Sheets clinics via the n8n Data Read API for
  appointments/reviews. Switching those reads (and appointment writes) to
  the unified tables is the next step to fully remove the n8n dependency
  from normal dashboard use.

## Roles

`owner` (the platform operator, `clinic_id = NULL` in `platform_users`) →
`/admin/*`. `manager` / `doctor` / `secretary` → `/clinic/[clinicId]/*`,
gated to their own `clinic_id`. Enforced in `src/proxy.ts` (route-level)
**and** re-checked server-side in every `admin/layout.tsx`,
`clinic/[clinicId]/layout.tsx`, and `/api/*` mutation — see
`lib/auth/require-owner.ts`. Don't rely on proxy alone for anything that
touches data.

## Security checklist (keep true as you extend this)

- `SUPABASE_SERVICE_ROLE_KEY` only in server code (`lib/supabase/admin.ts`),
  never `NEXT_PUBLIC_*`.
- `wa_access_token`, `mssql_password`, `sb_service_key` — encrypt at rest
  in production (Supabase Vault); plaintext columns today are MVP-only.
- Every owner-only API route calls `requireOwner()` before touching data.
- WhatsApp webhook must verify `hub.verify_token` before processing.
- n8n webhook path includes a UUID (`wa_verify_token`) — never guessable.
- RLS is enabled on every owner-project table (`supabase/migrations/*_rls.sql`).
- Rate-limit WhatsApp sends: max 1 reminder per `appointment_id`.

## RTL & localization

`<html lang="ar" dir="rtl">` is set once in `src/app/layout.tsx` — don't
re-set it per page. Use logical Tailwind utilities (`ms-*`/`me-*`/`ps-*`/
`pe-*`/`start-*`/`end-*`), not `ml-*`/`mr-*`/`left-*`/`right-*`. Numbers
and raw values (phone numbers, IDs, dates) get `dir="ltr"` on their own
span/cell so digits don't reverse. All user-facing copy is Arabic; DB
columns, logs, and code identifiers stay English. Dates: `new
Intl.DateTimeFormat('ar-SA', {...})`. Currency: `149 ر.س` (number, then
unit).

## Pricing (`lib/pricing.ts`, hardcoded — don't move to DB without a reason)

| Plan | ر.س/شهر | الإجمالي | ملاحظة |
|---|---|---|---|
| monthly | 149 | 149 | — |
| quarterly | 119 | 357 | badge "الأوفر" |
| annual | 99 | 1188 | — |

## Implementation status

- **Phase 1 (Foundation)** — done: Next.js scaffold, deps, hand-built
  shadcn-style `components/ui/*`, all owner-project migrations, clinic
  schema SQL, `types/index.ts`, Supabase client helpers, `proxy.ts`,
  `lib/pricing.ts`, RTL root layout, login page + Supabase Auth.
- **Phase 2 (Owner dashboard shell)** — done: `AdminSidebar`,
  `/admin` overview (KPIs/alerts/activity — currently empty-state until
  clinics exist), `/admin/clinics` table against live Supabase.
- **Phase 3 (Add Clinic Wizard)** — done: all 5 steps
  (`components/admin/AddClinicWizard/*`), wired to
  `/api/clinics`, `/api/clinic-channels`, `/api/clinic-db(+/test)`,
  `/api/clinic-automation`, `/api/subscriptions`. Untested against a real
  Supabase/n8n/Meta project — do that before calling this phase closed.
- **Phase 4 (Clinic dashboard)** — done: `ClinicSidebar`, today view
  (role-aware: secretary/doctor/manager), appointments list + add form
  (Supabase clinics only), reminders log, ratings (chart + distribution +
  table), reports, settings. Needs real appointment data to verify.
- **Phase 5 (n8n integration)** — **not started**. This is built inside
  n8n.cloud's own editor, not in this repo — section 4 below is the spec
  for those 2 workflows. `/admin/n8n` UI + `/api/n8n/status` exist and
  expect `N8N_BASE_URL`/`N8N_API_KEY` to be set once a workflow exists.
- **Phase 6 (SQL Server / Sheets, polish)** — **not started**. Wizard UI
  and DB adapters have stubs (`lib/db-adapters/mssql.ts`, `sheets.ts`)
  that validate config only; n8n does the actual querying per clinic.

## Deviations from the literal spec (intentional — see README.md)

- `middleware.ts` → `src/proxy.ts` (Next.js 16 renamed the convention).
- `@supabase/auth-helpers-nextjs` → `@supabase/ssr` (the former doesn't
  support Next 16's async `cookies()`).
- shadcn components are hand-written, not CLI-generated (`ui.shadcn.com`
  wasn't reachable when this was scaffolded) — `components.json` is
  in place so the CLI works normally once you have network access.

## n8n workflow spec (to build in n8n.cloud, not in this repo)

**Workflow 1 — WhatsApp webhook** (`POST /webhook/[uuid]/whatsapp`, one
URL shared by all clinics): extract `metadata.phone_number_id` from the
Meta payload → `SELECT * FROM clinics_config WHERE wa_phone_id = ...` →
if clinic active, branch on `wa_sessions.state`
(`idle`/`awaiting_rating`/`awaiting_comment`) → reply via that clinic's
`wa_access_token` → log to `n8n_execution_log`.

**Workflow 2 — Reminder cron** (every 5 min): loop
`clinics_config WHERE reminder_enabled AND clinic_status IN ('trial','active')`
→ per clinic, query its own DB (branch on `db_type`) for appointments in
the `[now + reminder_hours, now + reminder_hours + 5min)` window with
`reminder_sent = false` → send WhatsApp using the clinic's
`reminder_message_ar` template (variables: `{اسم_المريض}` `{اسم_الطبيب}`
`{الوقت_المتبقي}` `{وقت_الموعد}` `{عنوان_العيادة}`) → mark
`reminder_sent = true` → log.

**Workflow 3 — Rating cron** (every 15 min): same clinic loop, but for
appointments where `end_time < now - rating_delay_hours`,
`status = 'completed'`, `rating_sent = false` → send rating request →
mark `rating_sent = true` → log.

Message templates to pre-approve in Meta: `reminder_appointment`
(vars: patient_name, doctor_name, time_remaining, appointment_time,
address), `rating_request` (var: doctor_name), `rating_thanks` (no vars).

**Interactive reminders (Telegram):** the reminder cron attaches an inline
keyboard (`✅ تأكيد الحضور` / `❌ إلغاء الموعد`, `callback_data` =
`confirm:<appt_id>` / `cancel:<appt_id>`) to Telegram reminders. The
Telegram webhook branches on `body.callback_query` before the normal
message flow: `cancel` calls the Data Write API to set
`status='cancelled'`, both actions `answerCallbackQuery` with a popup. (WA
interactive buttons need approved Meta templates — not wired yet.)

## Dashboard data access for non-Supabase clinics (n8n Data APIs)

Next.js can read/write a Supabase clinic's DB directly, but only n8n holds
the Google credential, so Google Sheets clinics go through two static,
secret-gated n8n webhooks (secret in `MEDISYNC_N8N_READ_SECRET`, default
in `lib/db-adapters/sheets.ts`):
- **Data Read API** (`/data-read`, POST `{clinic_id, resource, secret}`) —
  returns Appointments/Reviews rows. `getClinicAppointments` /
  `getClinicReviews` use it for `db_type='google_sheets'`.
- **Data Write API** (`/data-write`, POST `{clinic_id, op, ...}`) —
  `op='update_status'` (cancel/complete/no-show) or `op='insert'` (add
  appointment). The appointment status actions + add-appointment form route
  Sheets clinics here. Partial detail-edit is still Supabase-only.
- **Services Write API** (`/services-write`, POST `{clinic_id, resource,
  op, ...}`) — separate isolated workflow (never touches the appointment
  write path) for the services module below. `resource='services'|
  'absences'`, `op='insert'|'update'|'delete'`. Sheets-only; Supabase
  clinics write services/absences directly from Next.js. `writeSheetsData`
  in `lib/db-adapters/sheets.ts` calls it.

## Services + employees module (clinic DB — owner decision)

Services and their staff assignments live in **each clinic's own DB**, not
the owner project (`lib/clinic-services.ts`). The "employee" IS a login
account (`platform_users`, owner project) — its per-employee schedule
(`work_start`/`work_end`/`working_days`) lives on that row; the
service↔employee link and absences live in the clinic DB and reference the
`platform_users.id` as a **soft cross-database ref** (no FK).

- **Supabase clinics** (`supabase/clinic-schema.sql`): normalized tables
  `services`, `service_employees` (many-to-many), `employee_absences`;
  appointments gain `service_id` + `employee_user_id`. Read/written
  directly by Next.js — no n8n.
- **Google Sheets clinics**: tabs `Services` + `Absences` (created once via
  Sheets API — tabs need a real header row or the append maps nothing).
  To keep every write an append/update-by-id: `employee_ids` is a
  comma-separated column on the `Services` row (no mapping tab), and delete
  is **soft** (a `deleted` column filtered out on read). Reads go through
  the Data Read API (`resource='services'|'absences'`); writes through the
  Services Write API.

Dashboard: sidebar **الخدمات** (services CRUD + employee tags) and
**الموظفون** (per-employee schedule, service badges, manual absences,
patient/appointment counts), both manager-gated. The doctor/secretary
"اليوم" page shows an **employee self-panel**: their services, absences,
patient count, and their patients' upcoming appointments (appointments
whose `employee_user_id` = their login id).

## AI receptionist (n8n, built in n8n.cloud — not in this repo)

Replaces the old static "idle state" greeting in both the WhatsApp and
Telegram webhook workflows. An `AI Agent` node (OpenAI Chat Model + Simple
Memory keyed per clinic+patient) handles any free-text message that isn't
part of the rating flow, with three tools (each a separate n8n sub-workflow
called via "Call n8n Workflow Tool", internally branching on `db_type` the
same way the reminder/rating crons do):

- **Get Appointments** — looks up the patient's own upcoming appointments
  by phone.
- **Book Appointment** — validates the requested time against
  `clinic_automation.working_hours_start/end`, checks for a conflicting
  slot, then inserts. Refuses (and tells the patient why) if out of hours
  or already booked.
- **Cancel Appointment** — finds and cancels a matching upcoming
  appointment for that patient.

System prompt boundaries (keep true as you extend this):
- Acts as the clinic's real receptionist — natural tone, not a form.
- Knows only this clinic's static info (name, doctor, specialty, address,
  phone, working hours) plus what the tools return — never other clinics'
  data.
- **Never gives medical advice** — anything beyond scheduling/clinic-info
  gets deferred to "تواصل مع العيادة مباشرة".
- Can create/cancel real appointments (write access) — this is the one
  place patient-facing chat writes to clinic data, so the conflict/working-
  hours checks in the tool sub-workflows are the actual safety net, not the
  prompt.

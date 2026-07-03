# MediSync AI

Multi-tenant SaaS that lets clinic owners automate patient communication via
WhatsApp. MVP has two features: automated appointment reminders and
post-visit rating collection, each clinic run through a single shared n8n
workflow. Full product spec: see `CLAUDE.md`.

## Stack

Next.js 16 (App Router) + TypeScript · Tailwind CSS v4 · Supabase (Auth +
Postgres, owner project) · n8n.cloud (automation) · Meta WhatsApp Business
API.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase/n8n/WhatsApp credentials
```

Run the owner-project migrations in order (`supabase/migrations/*.sql`) via
the Supabase SQL editor or `supabase db push`. For a new clinic that stores
its appointments in its own Supabase project, also run
`supabase/clinic-schema.sql` against that clinic's project.

Seed one `platform_users` row with `role='owner'` and `auth_id` pointing at
your Supabase Auth user before logging in — `/admin` is gated to that role.

```bash
npm run dev
```

## Status

Phase 1 (Foundation) is complete and Phases 2–4 are scaffolded end-to-end:
owner dashboard shell, the 5-step add-clinic wizard, and the role-aware
clinic dashboard (today view, appointments, reminders log, ratings,
reports, settings) all render against live Supabase queries with empty
states where no data exists yet. Phase 5 (building the actual n8n
workflows in n8n.cloud) and Phase 6 (SQL Server / Google Sheets wiring,
polish) are not started — see section 11 of `CLAUDE.md` for the full
phase breakdown.

## Deviations from the original spec

The spec was written against Next.js 14; this repo scaffolded on the
current `create-next-app` (Next.js 16), so a few things differ on purpose:

- **`middleware.ts` → `src/proxy.ts`** — Next 16 renamed the convention.
  Route-protection logic is unchanged, just the file/export name.
- **`@supabase/auth-helpers-nextjs` → `@supabase/ssr`** — the former is
  deprecated and does not support the async `cookies()`/`params` APIs
  Next 16 requires. `lib/supabase/{client,server,admin}.ts` use `@supabase/ssr`.
- **shadcn/ui components are hand-written**, not CLI-generated —
  `ui.shadcn.com` is not reachable from this sandbox's network policy.
  `components.json` is in place so `npx shadcn@latest add <component>`
  works normally once you have outbound access; existing files under
  `src/components/ui/` follow the same conventions (CVA variants,
  `data-slot` attributes, Radix primitives) so the CLI can safely
  overwrite or extend them later.

## Project layout

See `CLAUDE.md` section 5 for the intended full tree. Notable deltas from
a bare `create-next-app`: `src/lib/supabase/*` (owner-project clients),
`src/lib/db-adapters/*` (per-clinic DB access, Supabase only in MVP —
SQL Server/Sheets are read by n8n directly), `src/lib/whatsapp/meta.ts`,
`src/lib/n8n/api.ts`, `supabase/migrations/*.sql`, `supabase/clinic-schema.sql`.

-- Queue of patient notifications the dashboard asks n8n to deliver.
-- Written by Next.js (admin client) when staff confirms/rejects a deposit
-- payment; consumed by the n8n "Payment Review Notify" workflow, which is
-- triggered both by a webhook poke (instant when reachable) and an
-- every-minute poll (the guarantee — direct Vercel→n8n HTTP has proven
-- unreliable in production). A row is claimed by setting sent_at before
-- sending, so the two triggers can race without double-delivering.
create table if not exists public.notify_queue (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  appointment_id uuid not null,
  decision text not null check (decision in ('paid', 'rejected')),
  note text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  result jsonb
);

create index if not exists notify_queue_unsent_idx
  on public.notify_queue (created_at)
  where sent_at is null;

-- service_role only: RLS on with no policies.
alter table public.notify_queue enable row level security;

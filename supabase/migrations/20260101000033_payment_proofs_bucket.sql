-- Public storage bucket for patient payment-transfer proof images the bot
-- receives (e.g. a Vodafone Cash / InstaPay receipt screenshot on Telegram).
-- Public so the clinic dashboard's payment-review screen can render the image
-- directly by URL. Uploads happen from n8n with the service role (RLS bypassed);
-- reads are public because the bucket is public. The stable public URL replaces
-- the temporary, token-bearing Telegram file URL that was previously stored.
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do update set public = true;

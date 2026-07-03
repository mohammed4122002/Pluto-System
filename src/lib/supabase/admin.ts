import "server-only";

import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. Never import from a Client Component.
export const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

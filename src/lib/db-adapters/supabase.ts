import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { ClinicDbConfig } from "@/types";

// Connects to a *clinic's own* Supabase project (db_type = 'supabase'),
// as opposed to lib/supabase/* which talks to the owner's project.
export function createClinicSupabaseClient(dbConfig: ClinicDbConfig) {
  if (!dbConfig.sb_project_url || !dbConfig.sb_service_key) {
    throw new Error("Clinic Supabase config is incomplete");
  }

  return createClient(dbConfig.sb_project_url, dbConfig.sb_service_key, {
    auth: { persistSession: false },
  });
}

export async function testClinicSupabaseConnection(dbConfig: ClinicDbConfig) {
  const client = createClinicSupabaseClient(dbConfig);
  const { error } = await client.from("appointments").select("id").limit(1);
  return { ok: !error, error: error?.message };
}

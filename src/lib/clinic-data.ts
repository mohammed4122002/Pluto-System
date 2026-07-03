import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createClinicSupabaseClient } from "@/lib/db-adapters/supabase";
import type { Appointment, Clinic, ClinicDbConfig, Review } from "@/types";

export async function getClinicWithDbConfig(clinicId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clinics")
    .select("*, db_config:clinic_db_config(*)")
    .eq("id", clinicId)
    .single();

  return data as (Clinic & { db_config: ClinicDbConfig | null }) | null;
}

// Only db_type='supabase' clinics are queryable directly from Next.js in
// MVP — SQL Server / Google Sheets clinics are read by the n8n workflow
// only (spec section 5). Returns null when direct access isn't possible.
export async function getClinicAppointments(
  dbConfig: ClinicDbConfig | null,
  options: { from?: Date; to?: Date } = {}
): Promise<Appointment[] | null> {
  if (!dbConfig || dbConfig.db_type !== "supabase") return null;

  try {
    const client = createClinicSupabaseClient(dbConfig);
    let query = client.from("appointments").select("*").order("appointment_time");

    if (options.from) query = query.gte("appointment_time", options.from.toISOString());
    if (options.to) query = query.lte("appointment_time", options.to.toISOString());

    const { data, error } = await query;
    if (error) return null;
    return data as Appointment[];
  } catch {
    return null;
  }
}

export async function getClinicReviews(
  dbConfig: ClinicDbConfig | null
): Promise<Review[] | null> {
  if (!dbConfig || dbConfig.db_type !== "supabase") return null;

  try {
    const client = createClinicSupabaseClient(dbConfig);
    const { data, error } = await client
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return null;
    return data as Review[];
  } catch {
    return null;
  }
}

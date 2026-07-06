import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createClinicSupabaseClient } from "@/lib/db-adapters/supabase";
import { readSheetsResource } from "@/lib/db-adapters/sheets";
import type { Appointment, Clinic, ClinicDbConfig, Review } from "@/types";

export interface DerivedPatient {
  key: string;
  name: string;
  phone: string;
  total: number;
  completed: number;
  cancelled: number;
  no_show: number;
  last_visit: string | null;
  next_upcoming: string | null;
}

// A patient list derived from the appointment history — works the same for
// Supabase and Google Sheets clinics (both flow through getClinicAppointments)
// without requiring a separate Patients table/tab. Grouped by phone, falling
// back to name when a phone isn't recorded.
export function derivePatients(appointments: Appointment[]): DerivedPatient[] {
  const now = Date.now();
  const map = new Map<string, DerivedPatient>();

  for (const a of appointments) {
    const phone = (a.patient_phone ?? "").trim();
    const name = (a.patient_name ?? "").trim();
    const key = phone || name;
    if (!key) continue;

    let p = map.get(key);
    if (!p) {
      p = {
        key,
        name: name || "—",
        phone,
        total: 0,
        completed: 0,
        cancelled: 0,
        no_show: 0,
        last_visit: null,
        next_upcoming: null,
      };
      map.set(key, p);
    }
    if (!p.name || p.name === "—") p.name = name || p.name;
    if (!p.phone) p.phone = phone;

    p.total += 1;
    if (a.status === "completed") p.completed += 1;
    else if (a.status === "cancelled") p.cancelled += 1;
    else if (a.status === "no_show") p.no_show += 1;

    const t = a.appointment_time ? new Date(a.appointment_time).getTime() : NaN;
    if (!Number.isNaN(t)) {
      if (t <= now && (!p.last_visit || t > new Date(p.last_visit).getTime())) {
        p.last_visit = a.appointment_time;
      }
      if (
        t > now &&
        a.status === "scheduled" &&
        (!p.next_upcoming || t < new Date(p.next_upcoming).getTime())
      ) {
        p.next_upcoming = a.appointment_time;
      }
    }
  }

  return [...map.values()].sort((a, b) => {
    const at = a.next_upcoming ?? a.last_visit ?? "";
    const bt = b.next_upcoming ?? b.last_visit ?? "";
    return bt.localeCompare(at);
  });
}

function truthy(v: unknown) {
  return v === true || v === "TRUE" || v === "true" || v === 1 || v === "1";
}

function normalizeSheetAppointment(r: Record<string, unknown>): Appointment {
  return {
    id: String(r.id ?? r.row_number ?? ""),
    patient_name: r.patient_name ? String(r.patient_name) : "",
    patient_phone: r.patient_phone ? String(r.patient_phone) : "",
    appointment_time: String(r.appointment_time ?? ""),
    duration_minutes: Number(r.duration_minutes) || 30,
    status: (String(r.status ?? "scheduled") as Appointment["status"]),
    reminder_sent: truthy(r.reminder_sent),
    reminder_sent_at: r.reminder_sent_at ? String(r.reminder_sent_at) : undefined,
    rating_sent: truthy(r.rating_sent),
    rating_sent_at: r.rating_sent_at ? String(r.rating_sent_at) : undefined,
    notes: r.notes ? String(r.notes) : undefined,
    created_at: String(r.created_at ?? ""),
  };
}

function normalizeSheetReview(r: Record<string, unknown>): Review {
  return {
    id: String(r.id ?? r.row_number ?? ""),
    appointment_id: r.appointment_id ? String(r.appointment_id) : undefined,
    patient_phone: r.patient_phone ? String(r.patient_phone) : undefined,
    stars: Number(r.stars) || 0,
    comment: r.comment ? String(r.comment) : undefined,
    created_at: String(r.created_at ?? ""),
  };
}

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
  if (!dbConfig) return null;

  if (dbConfig.db_type === "google_sheets") {
    const rows = await readSheetsResource(dbConfig.clinic_id, "appointments");
    if (!rows) return null;
    let appts = rows.map(normalizeSheetAppointment).filter((a) => a.appointment_time);
    if (options.from) appts = appts.filter((a) => new Date(a.appointment_time) >= options.from!);
    if (options.to) appts = appts.filter((a) => new Date(a.appointment_time) <= options.to!);
    return appts.sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
  }

  if (dbConfig.db_type !== "supabase") return null;

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
  if (!dbConfig) return null;

  if (dbConfig.db_type === "google_sheets") {
    const rows = await readSheetsResource(dbConfig.clinic_id, "reviews");
    if (!rows) return null;
    return rows
      .map(normalizeSheetReview)
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  }

  if (dbConfig.db_type !== "supabase") return null;

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

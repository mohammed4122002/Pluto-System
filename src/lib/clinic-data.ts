import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
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
    service_id: r.service_id ? String(r.service_id) : null,
    employee_user_id: r.employee_user_id ? String(r.employee_user_id) : null,
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

// ── Unified owner-side aggregation (the single source the dashboard reads) ──
// Every clinic's data — whatever its backend — is mirrored into the owner
// project's unified_* tables by the n8n Sync Import workflow (+ instant
// mirror-on-write from server actions). Reading here means the dashboard
// shows one aggregated view regardless of db_type. `id` is exposed as the
// source row's id (external_id) so existing write paths keep matching.
type UnifiedAppointmentRow = {
  id: string;
  external_id: string | null;
  patient_name: string | null;
  patient_phone: string | null;
  appointment_time: string | null;
  duration_minutes: number | null;
  status: string | null;
  reminder_sent: boolean | null;
  rating_sent: boolean | null;
  notes: string | null;
  created_at: string | null;
  raw: Record<string, unknown> | null;
};

function mapUnifiedAppointment(u: UnifiedAppointmentRow): Appointment {
  const raw = u.raw ?? {};
  return {
    id: String(u.external_id ?? u.id),
    patient_name: u.patient_name ?? "",
    patient_phone: u.patient_phone ?? "",
    appointment_time: u.appointment_time ?? "",
    duration_minutes: Number(u.duration_minutes) || 30,
    status: (u.status ?? "scheduled") as Appointment["status"],
    reminder_sent: u.reminder_sent === true,
    reminder_sent_at: raw.reminder_sent_at ? String(raw.reminder_sent_at) : undefined,
    rating_sent: u.rating_sent === true,
    rating_sent_at: raw.rating_sent_at ? String(raw.rating_sent_at) : undefined,
    notes: u.notes ?? undefined,
    service_id: raw.service_id ? String(raw.service_id) : null,
    employee_user_id: raw.employee_user_id ? String(raw.employee_user_id) : null,
    created_at: String(raw.created_at ?? u.created_at ?? ""),
  };
}

async function getUnifiedAppointments(
  clinicId: string,
  options: { from?: Date; to?: Date } = {}
): Promise<Appointment[] | null> {
  try {
    const admin = getAdminSupabase();
    let query = admin
      .from("unified_appointments")
      .select(
        "id,external_id,patient_name,patient_phone,appointment_time,duration_minutes,status,reminder_sent,rating_sent,notes,created_at,raw"
      )
      .eq("clinic_id", clinicId)
      .eq("deleted", false)
      .order("appointment_time", { ascending: true });

    if (options.from) query = query.gte("appointment_time", options.from.toISOString());
    if (options.to) query = query.lte("appointment_time", options.to.toISOString());

    const { data, error } = await query;
    if (error || !data) return null;
    return (data as UnifiedAppointmentRow[]).map(mapUnifiedAppointment);
  } catch {
    return null;
  }
}

async function getUnifiedReviews(clinicId: string): Promise<Review[] | null> {
  try {
    const admin = getAdminSupabase();
    const { data, error } = await admin
      .from("unified_reviews")
      .select("id,external_id,appointment_external_id,patient_phone,stars,comment,created_at,raw")
      .eq("clinic_id", clinicId)
      .eq("deleted", false)
      .order("created_at", { ascending: false });
    if (error || !data) return null;
    return (data as Array<Record<string, unknown>>).map((u) => ({
      id: String(u.external_id ?? u.id),
      appointment_id: u.appointment_external_id ? String(u.appointment_external_id) : undefined,
      patient_phone: u.patient_phone ? String(u.patient_phone) : undefined,
      stars: Number(u.stars) || 0,
      comment: u.comment ? String(u.comment) : undefined,
      created_at: String(
        (u.raw as Record<string, unknown> | null)?.created_at ?? u.created_at ?? ""
      ),
    }));
  } catch {
    return null;
  }
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

  // Prefer the unified owner DB (aggregates every clinic, any backend). Falls
  // back to the legacy per-type read while a clinic hasn't been imported yet.
  const unified = await getUnifiedAppointments(dbConfig.clinic_id, options);
  if (unified && unified.length > 0) return unified;

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

  const unified = await getUnifiedReviews(dbConfig.clinic_id);
  if (unified && unified.length > 0) return unified;

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

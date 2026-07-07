import "server-only";

import { createClinicSupabaseClient } from "@/lib/db-adapters/supabase";
import { readSheetsResource, writeSheetsData } from "@/lib/db-adapters/sheets";
import type { ClinicDbConfig, EmployeeAbsence, Service } from "@/types";

// Services, their employee assignments, and employee absences all live in the
// CLINIC's own DB (owner decision). This module reads/writes them for both
// db_type='supabase' (direct) and db_type='google_sheets' (via the n8n Data
// API). employee ids stored here are soft refs to owner platform_users.id.

function truthy(v: unknown) {
  return v === true || v === "TRUE" || v === "true" || v === 1 || v === "1";
}

// Sheets stores service→employee assignment as a comma-separated id column.
function parseEmployeeIds(v: unknown): string[] {
  if (!v) return [];
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeService(r: Record<string, unknown>): Omit<Service, "employee_ids"> {
  return {
    id: String(r.id ?? r.row_number ?? ""),
    name: String(r.name ?? ""),
    description: r.description ? String(r.description) : null,
    duration_minutes: Number(r.duration_minutes) || 30,
    price: r.price !== undefined && r.price !== null && r.price !== "" ? Number(r.price) : null,
    active: r.active === undefined ? true : truthy(r.active),
    created_at: String(r.created_at ?? ""),
  };
}

// ---- Services ------------------------------------------------------------

export async function getServices(dbConfig: ClinicDbConfig | null): Promise<Service[] | null> {
  if (!dbConfig) return null;

  if (dbConfig.db_type === "google_sheets") {
    // On Sheets the employee assignment is a comma-separated column on the
    // Services row itself (not a separate mapping tab), and deletes are soft
    // (a `deleted` flag) so every write stays an append/update-by-id.
    const svcRows = await readSheetsResource(dbConfig.clinic_id, "services");
    if (!svcRows) return null;
    return svcRows
      .filter((r) => !truthy(r.deleted))
      .map((r) => ({
        ...normalizeService(r),
        employee_ids: parseEmployeeIds(r.employee_ids),
      }))
      .filter((s) => s.name)
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }

  if (dbConfig.db_type !== "supabase") return null;

  try {
    const client = createClinicSupabaseClient(dbConfig);
    const [{ data: services, error }, { data: links }] = await Promise.all([
      client.from("services").select("*").order("created_at", { ascending: false }),
      client.from("service_employees").select("*"),
    ]);
    if (error) return null;
    const map = new Map<string, string[]>();
    for (const l of (links as { service_id: string; employee_user_id: string }[]) ?? []) {
      map.set(l.service_id, [...(map.get(l.service_id) ?? []), l.employee_user_id]);
    }
    return ((services as Record<string, unknown>[]) ?? []).map((r) => ({
      ...normalizeService(r),
      employee_ids: map.get(String(r.id)) ?? [],
    }));
  } catch {
    return null;
  }
}

export interface ServiceInput {
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  active: boolean;
  employee_ids: string[];
}

export async function createService(dbConfig: ClinicDbConfig, input: ServiceInput) {
  if (dbConfig.db_type === "supabase") {
    const client = createClinicSupabaseClient(dbConfig);
    const { data, error } = await client
      .from("services")
      .insert({
        name: input.name,
        description: input.description,
        duration_minutes: input.duration_minutes,
        price: input.price,
        active: input.active,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await syncServiceEmployees(dbConfig, String(data.id), input.employee_ids);
    return;
  }
  if (dbConfig.db_type === "google_sheets") {
    await writeSheetsData({
      clinicId: dbConfig.clinic_id,
      resource: "services",
      op: "insert",
      fields: {
        name: input.name,
        description: input.description ?? "",
        duration_minutes: input.duration_minutes,
        price: input.price ?? "",
        active: input.active,
        employee_ids: input.employee_ids.join(","),
      },
    });
    return;
  }
  throw new Error("نوع قاعدة بيانات العيادة لا يدعم إدارة الخدمات بعد");
}

export async function updateService(
  dbConfig: ClinicDbConfig,
  id: string,
  input: ServiceInput
) {
  if (dbConfig.db_type === "supabase") {
    const client = createClinicSupabaseClient(dbConfig);
    const { error } = await client
      .from("services")
      .update({
        name: input.name,
        description: input.description,
        duration_minutes: input.duration_minutes,
        price: input.price,
        active: input.active,
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await syncServiceEmployees(dbConfig, id, input.employee_ids);
    return;
  }
  if (dbConfig.db_type === "google_sheets") {
    await writeSheetsData({
      clinicId: dbConfig.clinic_id,
      resource: "services",
      op: "update",
      id,
      fields: {
        name: input.name,
        description: input.description ?? "",
        duration_minutes: input.duration_minutes,
        price: input.price ?? "",
        active: input.active,
        employee_ids: input.employee_ids.join(","),
      },
    });
    return;
  }
  throw new Error("نوع قاعدة بيانات العيادة لا يدعم إدارة الخدمات بعد");
}

export async function deleteService(dbConfig: ClinicDbConfig, id: string) {
  if (dbConfig.db_type === "supabase") {
    const client = createClinicSupabaseClient(dbConfig);
    // service_employees rows cascade on the FK.
    const { error } = await client.from("services").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  if (dbConfig.db_type === "google_sheets") {
    await writeSheetsData({
      clinicId: dbConfig.clinic_id,
      resource: "services",
      op: "delete",
      id,
    });
    return;
  }
  throw new Error("نوع قاعدة بيانات العيادة لا يدعم إدارة الخدمات بعد");
}

// Reconcile the service_employees rows for a Supabase clinic to exactly match
// the desired set (delete all, re-insert). Sheets clinics handle this inside
// the n8n endpoint from the employee_ids field on the service write.
async function syncServiceEmployees(
  dbConfig: ClinicDbConfig,
  serviceId: string,
  employeeIds: string[]
) {
  const client = createClinicSupabaseClient(dbConfig);
  await client.from("service_employees").delete().eq("service_id", serviceId);
  const unique = [...new Set(employeeIds.filter(Boolean))];
  if (unique.length) {
    const { error } = await client
      .from("service_employees")
      .insert(unique.map((employee_user_id) => ({ service_id: serviceId, employee_user_id })));
    if (error) throw new Error(error.message);
  }
}

// ---- Absences ------------------------------------------------------------

function normalizeAbsence(r: Record<string, unknown>): EmployeeAbsence {
  return {
    id: String(r.id ?? r.row_number ?? ""),
    employee_user_id: String(r.employee_user_id ?? ""),
    absence_date: String(r.absence_date ?? ""),
    reason: r.reason ? String(r.reason) : null,
    created_at: String(r.created_at ?? ""),
  };
}

export async function getAbsences(
  dbConfig: ClinicDbConfig | null
): Promise<EmployeeAbsence[] | null> {
  if (!dbConfig) return null;

  if (dbConfig.db_type === "google_sheets") {
    const rows = await readSheetsResource(dbConfig.clinic_id, "absences");
    if (!rows) return null;
    return rows
      .map(normalizeAbsence)
      .filter((a) => a.employee_user_id && a.absence_date)
      .sort((a, b) => b.absence_date.localeCompare(a.absence_date));
  }

  if (dbConfig.db_type !== "supabase") return null;

  try {
    const client = createClinicSupabaseClient(dbConfig);
    const { data, error } = await client
      .from("employee_absences")
      .select("*")
      .order("absence_date", { ascending: false });
    if (error) return null;
    return ((data as Record<string, unknown>[]) ?? []).map(normalizeAbsence);
  } catch {
    return null;
  }
}

export async function addAbsence(
  dbConfig: ClinicDbConfig,
  input: { employee_user_id: string; absence_date: string; reason: string | null }
) {
  if (dbConfig.db_type === "supabase") {
    const client = createClinicSupabaseClient(dbConfig);
    const { error } = await client.from("employee_absences").insert({
      employee_user_id: input.employee_user_id,
      absence_date: input.absence_date,
      reason: input.reason,
    });
    if (error) throw new Error(error.message);
    return;
  }
  if (dbConfig.db_type === "google_sheets") {
    await writeSheetsData({
      clinicId: dbConfig.clinic_id,
      resource: "absences",
      op: "insert",
      fields: {
        employee_user_id: input.employee_user_id,
        absence_date: input.absence_date,
        reason: input.reason ?? "",
      },
    });
    return;
  }
  throw new Error("نوع قاعدة بيانات العيادة لا يدعم تسجيل الغياب بعد");
}

export async function deleteAbsence(dbConfig: ClinicDbConfig, id: string) {
  if (dbConfig.db_type === "supabase") {
    const client = createClinicSupabaseClient(dbConfig);
    const { error } = await client.from("employee_absences").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  if (dbConfig.db_type === "google_sheets") {
    await writeSheetsData({
      clinicId: dbConfig.clinic_id,
      resource: "absences",
      op: "delete",
      id,
    });
    return;
  }
  throw new Error("نوع قاعدة بيانات العيادة لا يدعم تسجيل الغياب بعد");
}

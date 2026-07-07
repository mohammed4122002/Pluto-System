import "server-only";

import type { ClinicDbConfig } from "@/types";

// Google Sheets clinics are read by n8n directly (spec section 5), using a
// single platform Google account shared across all clinics (each clinic just
// shares its sheet with that account) — there is no per-clinic OAuth token.
// The real "can we actually read this sheet" check has to happen from n8n,
// since only n8n holds the Google credential; this calls a small always-on
// n8n endpoint that tries to read the clinic's Appointments tab.
const N8N_WEBHOOK_BASE =
  process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL ?? "https://admin12121.app.n8n.cloud/webhook";

// Shared secret gating the n8n data-read endpoint. Server-only; set
// MEDISYNC_N8N_READ_SECRET in the deploy env to override the default.
const N8N_READ_SECRET =
  process.env.MEDISYNC_N8N_READ_SECRET ?? "msync_read_7f3a9c21b8e64d05a1";

// n8n's hosted gateway answers with HTTP 200 + an HTML error page when the
// account hits its execution limit — a bare `res.ok` check would treat that
// as success and report a false "saved". Require an actual `{ ok: true }`
// JSON body before treating a write as persisted.
async function assertN8nWriteOk(res: Response) {
  const text = await res.text();
  let json: { ok?: boolean } | null = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  if (!res.ok || !json || json.ok !== true) {
    if (/execution limit|max_executions|upgrading your plan/i.test(text)) {
      throw new Error(
        "تعذّر الحفظ — خدمة الأتمتة (n8n) تجاوزت حد التنفيذ المسموح. لم يتم الحفظ فعلياً؛ يرجى ترقية خطة n8n أو المحاولة لاحقاً."
      );
    }
    throw new Error("تعذّر حفظ التغيير في جدول العيادة");
  }
}

// Google Sheets clinics can't be read directly from Next.js (only n8n holds
// the Google credential), so the dashboard reads their data through a small
// always-on n8n endpoint that returns the requested tab's rows as JSON.
export type SheetsResource =
  | "appointments"
  | "patients"
  | "reviews"
  | "services"
  | "service_employees"
  | "absences";

export async function readSheetsResource(
  clinicId: string,
  resource: SheetsResource
): Promise<Record<string, unknown>[] | null> {
  try {
    const res = await fetch(
      `${N8N_WEBHOOK_BASE}/8f4b2c1e-6a9d-4f3b-b2a7-1c5e9d0a3f76/data-read`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinic_id: clinicId, resource, secret: N8N_READ_SECRET }),
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return null;
  }
}

// Writes back to a Sheets clinic through the n8n data-write endpoint (only
// n8n can write the sheet). Supports 'update_status' (cancel/complete/no-show)
// and 'insert' (add appointment). Throws on failure so the caller can toast.
export async function writeSheetsAppointment(payload: {
  clinicId: string;
  op: "update_status" | "insert" | "update_details";
  id?: string;
  status?: string;
  patient_name?: string;
  patient_phone?: string;
  appointment_time?: string;
  notes?: string;
  service_id?: string | null;
  employee_user_id?: string | null;
}) {
  const res = await fetch(
    `${N8N_WEBHOOK_BASE}/8f4b2c1e-6a9d-4f3b-b2a7-1c5e9d0a3f76/data-write`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clinic_id: payload.clinicId,
        resource: "appointments",
        op: payload.op,
        id: payload.id,
        status: payload.status,
        patient_name: payload.patient_name,
        patient_phone: payload.patient_phone,
        appointment_time: payload.appointment_time,
        notes: payload.notes,
        service_id: payload.service_id ?? "",
        employee_user_id: payload.employee_user_id ?? "",
        secret: N8N_READ_SECRET,
      }),
      cache: "no-store",
    }
  );
  await assertN8nWriteOk(res);
}

// Generic write for the services/employees resources (services,
// service_employees, absences). op is one of insert/update/delete;
// `fields` carries the row payload, `id`/`match` identify the target row.
// The n8n data-write endpoint branches on resource+op the same way it does
// for appointments.
export async function writeSheetsData(payload: {
  clinicId: string;
  resource: SheetsResource;
  op: "insert" | "update" | "delete";
  id?: string;
  match?: Record<string, string>;
  fields?: Record<string, unknown>;
}) {
  const res = await fetch(
    `${N8N_WEBHOOK_BASE}/8f4b2c1e-6a9d-4f3b-b2a7-1c5e9d0a3f76/services-write`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clinic_id: payload.clinicId,
        resource: payload.resource,
        op: payload.op,
        id: payload.id,
        match: payload.match,
        fields: payload.fields,
        secret: N8N_READ_SECRET,
      }),
      cache: "no-store",
    }
  );
  await assertN8nWriteOk(res);
}

export async function testSheetsConnectionConfig(dbConfig: ClinicDbConfig) {
  if (!dbConfig.gs_spreadsheet_id) {
    return { ok: false, error: "لم يتم إدخال رابط جدول بيانات صالح" };
  }

  try {
    const res = await fetch(
      `${N8N_WEBHOOK_BASE}/8f4b2c1e-6a9d-4f3b-b2a7-1c5e9d0a3f76/verify-google-sheet`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheet_id: dbConfig.gs_spreadsheet_id }),
      }
    );
    const data = await res.json();
    return data as { ok: boolean; error?: string };
  } catch {
    return { ok: false, error: "تعذّر الوصول إلى خدمة التحقق" };
  }
}

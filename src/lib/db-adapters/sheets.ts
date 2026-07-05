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

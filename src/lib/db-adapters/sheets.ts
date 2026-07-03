import "server-only";

import type { ClinicDbConfig } from "@/types";

// Google Sheets clinics are read by n8n directly (spec section 5). This
// adapter only checks that a spreadsheet has been linked via OAuth so the
// wizard can surface a meaningful "Test Connection" result.
export async function testSheetsConnectionConfig(dbConfig: ClinicDbConfig) {
  if (!dbConfig.gs_spreadsheet_id) {
    return { ok: false, error: "No spreadsheet linked" };
  }
  if (!dbConfig.gs_oauth_token) {
    return { ok: false, error: "Google account not connected" };
  }
  return { ok: true };
}

import "server-only";

import type { ClinicDbConfig } from "@/types";

// SQL Server clinics are only queried from within the n8n workflow in MVP
// (spec section 5). This adapter only validates that config is present so
// the dashboard's "Test Connection" button can give useful feedback; it
// does not open a TDS connection from Next.js.
export async function testMssqlConnectionConfig(dbConfig: ClinicDbConfig) {
  const missing = (
    ["mssql_host", "mssql_database", "mssql_username", "mssql_password"] as const
  ).filter((key) => !dbConfig[key]);

  if (missing.length > 0) {
    return { ok: false, error: `Missing fields: ${missing.join(", ")}` };
  }

  return { ok: true };
}

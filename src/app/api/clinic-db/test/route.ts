import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/auth/require-owner";
import { testClinicSupabaseConnection } from "@/lib/db-adapters/supabase";
import { testMssqlConnectionConfig } from "@/lib/db-adapters/mssql";
import { testSheetsConnectionConfig } from "@/lib/db-adapters/sheets";
import type { ClinicDbConfig } from "@/types";

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const dbConfig = (await request.json()) as ClinicDbConfig;

  try {
    const result =
      dbConfig.db_type === "supabase"
        ? await testClinicSupabaseConnection(dbConfig)
        : dbConfig.db_type === "sql_server"
          ? await testMssqlConnectionConfig(dbConfig)
          : await testSheetsConnectionConfig(dbConfig);

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}

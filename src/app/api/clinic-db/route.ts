import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/auth/require-owner";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { triggerEmployeeSync, triggerSheetTabNormalize } from "@/lib/n8n/webhooks";

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const body = await request.json();
  const { clinic_id, ...dbConfig } = body as {
    clinic_id: string;
    [key: string]: unknown;
  };

  if (!clinic_id || !dbConfig.db_type) {
    return NextResponse.json(
      { error: "clinic_id and db_type are required" },
      { status: 400 }
    );
  }

  const { data, error } = await getAdminSupabase()
    .from("clinic_db_config")
    .insert({ clinic_id, ...dbConfig })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Best-effort: a Sheets clinic's employees would otherwise sit empty on
  // the dashboard and in the AI bot until the next 15-minute cron run.
  // Awaited (not fire-and-forget) — a serverless function can be frozen
  // before an un-awaited request completes once the response is sent.
  if (dbConfig.db_type === "google_sheets" && dbConfig.gs_spreadsheet_id) {
    // Normalize tab names first (الحجوزات → Appointments …) so the employee
    // sync and all later syncs find the canonical tabs on their first run.
    await triggerSheetTabNormalize();
    await triggerEmployeeSync();
  }

  return NextResponse.json({ db_config: data }, { status: 201 });
}

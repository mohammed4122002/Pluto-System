import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/auth/require-owner";
import { listWorkflows, listExecutions } from "@/lib/n8n/api";

export async function GET() {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const [workflows, executions] = await Promise.all([
      listWorkflows(),
      listExecutions(),
    ]);
    return NextResponse.json({ workflows, executions });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "n8n unavailable" },
      { status: 502 }
    );
  }
}

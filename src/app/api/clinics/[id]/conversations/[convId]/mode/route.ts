import { NextResponse } from "next/server";

import { requireClinicMemberOrOwner } from "@/lib/auth/require-clinic-access";
import { getAdminSupabase } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string; convId: string }> };

// Toggle who is answering this conversation: the AI receptionist or a human.
// Taking over (human) or handing back (ai) both clear needs_attention.
export async function POST(request: Request, { params }: RouteContext) {
  const { id: clinicId, convId } = await params;
  const auth = await requireClinicMemberOrOwner(clinicId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const body = await request.json();
  const mode = body.mode === "human" ? "human" : "ai";

  const { error } = await getAdminSupabase()
    .from("conversations")
    .update({ mode, needs_attention: false })
    .eq("id", convId)
    .eq("clinic_id", clinicId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mode });
}

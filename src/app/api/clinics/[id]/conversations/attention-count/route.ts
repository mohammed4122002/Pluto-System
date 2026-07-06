import { NextResponse } from "next/server";

import { requireClinicMember } from "@/lib/auth/require-clinic-access";
import { getAdminSupabase } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

// Lightweight count of conversations flagged for a human, polled by the
// sidebar so staff see escalations from any page without opening the inbox.
export async function GET(_request: Request, { params }: RouteContext) {
  const { id: clinicId } = await params;
  const auth = await requireClinicMember(clinicId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { count, error } = await getAdminSupabase()
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId)
    .eq("needs_attention", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}

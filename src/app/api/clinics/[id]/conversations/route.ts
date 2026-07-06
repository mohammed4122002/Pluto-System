import { NextResponse } from "next/server";

import { requireClinicMember } from "@/lib/auth/require-clinic-access";
import { getAdminSupabase } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

// Conversation list for the inbox. Polled by the client, so it stays light.
export async function GET(_request: Request, { params }: RouteContext) {
  const { id: clinicId } = await params;
  const auth = await requireClinicMember(clinicId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { data, error } = await getAdminSupabase()
    .from("conversations")
    .select(
      "id, channel, chat_ref, patient_phone, patient_name, mode, needs_attention, last_message_at, last_message_preview, last_sender"
    )
    .eq("clinic_id", clinicId)
    .order("last_message_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversations: data ?? [] });
}

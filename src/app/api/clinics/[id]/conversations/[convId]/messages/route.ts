import { NextResponse } from "next/server";

import { requireClinicMember } from "@/lib/auth/require-clinic-access";
import { getAdminSupabase } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string; convId: string }> };

// Full message thread for one conversation. Polled while a thread is open.
export async function GET(_request: Request, { params }: RouteContext) {
  const { id: clinicId, convId } = await params;
  const auth = await requireClinicMember(clinicId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const admin = getAdminSupabase();

  const { data: conversation } = await admin
    .from("conversations")
    .select("id, clinic_id, mode, needs_attention, patient_name, patient_phone, channel")
    .eq("id", convId)
    .eq("clinic_id", clinicId)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: "المحادثة غير موجودة" }, { status: 404 });
  }

  const { data: messages, error } = await admin
    .from("conversation_messages")
    .select("id, direction, sender, body, created_at")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversation, messages: messages ?? [] });
}

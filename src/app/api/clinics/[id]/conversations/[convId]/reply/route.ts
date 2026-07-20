import { NextResponse } from "next/server";

import { requireClinicMember } from "@/lib/auth/require-clinic-access";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { sendClinicMessage } from "@/lib/messaging/send";

type RouteContext = { params: Promise<{ id: string; convId: string }> };

// A staff member sends a reply to the patient. Sending implies taking over,
// so the conversation flips to human mode and clears needs_attention.
export async function POST(request: Request, { params }: RouteContext) {
  const { id: clinicId, convId } = await params;
  const auth = await requireClinicMember(clinicId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const body = await request.json();
  const text = String(body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "الرسالة فارغة" }, { status: 400 });
  }

  const admin = getAdminSupabase();

  const { data: conversation } = await admin
    .from("conversations")
    .select("id, channel, chat_ref")
    .eq("id", convId)
    .eq("clinic_id", clinicId)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: "المحادثة غير موجودة" }, { status: 404 });
  }

  // Clinic's own channel credentials (service-role read of the config view).
  const { data: config } = await admin
    .from("clinics_config")
    .select(
      "tg_bot_token, wa_provider, wa_phone_id, wa_access_token, twilio_account_sid, twilio_auth_token, twilio_whatsapp_from"
    )
    .eq("clinic_id", clinicId)
    .single();

  try {
    await sendClinicMessage(
      {
        channel: conversation.channel as "telegram" | "whatsapp",
        chat_ref: conversation.chat_ref,
        tg_bot_token: config?.tg_bot_token ?? null,
        wa_provider: config?.wa_provider ?? null,
        wa_phone_id: config?.wa_phone_id ?? null,
        wa_access_token: config?.wa_access_token ?? null,
        twilio_account_sid: config?.twilio_account_sid ?? null,
        twilio_auth_token: config?.twilio_auth_token ?? null,
        twilio_whatsapp_from: config?.twilio_whatsapp_from ?? null,
      },
      text
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "فشل الإرسال" },
      { status: 502 }
    );
  }

  await admin.from("conversation_messages").insert({
    conversation_id: convId,
    clinic_id: clinicId,
    direction: "out",
    sender: "staff",
    body: text,
  });

  await admin
    .from("conversations")
    .update({
      mode: "human",
      needs_attention: false,
      last_message_at: new Date().toISOString(),
      last_message_preview: text.slice(0, 140),
      last_sender: "staff",
    })
    .eq("id", convId);

  return NextResponse.json({ ok: true });
}

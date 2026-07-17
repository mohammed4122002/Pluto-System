import { NextResponse } from "next/server";

import { requireClinicMember } from "@/lib/auth/require-clinic-access";
import { getAdminSupabase } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ clinicId: string }> };

// Sends a test alert to the signed-in staff member's linked Telegram chat via
// the clinic's bot, so they can confirm they'll actually receive alerts.
export async function POST(_request: Request, { params }: RouteContext) {
  const { clinicId } = await params;
  const auth = await requireClinicMember(clinicId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  const admin = getAdminSupabase();

  const { data: me } = await admin
    .from("platform_users")
    .select("notify_chat_id")
    .eq("auth_id", auth.user.id)
    .eq("clinic_id", clinicId)
    .single();

  if (!me?.notify_chat_id) {
    return NextResponse.json(
      { error: "لم تربط حسابك بعد — أرسل رمز الربط لبوت العيادة أولاً" },
      { status: 400 }
    );
  }

  const { data: cfg } = await admin
    .from("clinics_config")
    .select("tg_bot_token")
    .eq("clinic_id", clinicId)
    .single();

  if (!cfg?.tg_bot_token) {
    return NextResponse.json(
      { error: "لا يوجد بوت تيليجرام مُعدّ لهذه العيادة" },
      { status: 400 }
    );
  }

  const res = await fetch(
    `https://api.telegram.org/bot${cfg.tg_bot_token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: me.notify_chat_id,
        text: "🔔 تنبيه تجريبي من MediSync — التنبيهات تعمل بنجاح ✅",
      }),
    }
  );
  const data = await res.json();
  if (!res.ok || !data.ok) {
    return NextResponse.json(
      { error: data?.description ?? "تعذّر إرسال التنبيه" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}

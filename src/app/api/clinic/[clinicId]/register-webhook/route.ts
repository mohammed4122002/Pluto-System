import { NextResponse } from "next/server";

import { requireClinicManagerOrOwner } from "@/lib/auth/require-clinic-access";
import { getAdminSupabase } from "@/lib/supabase/admin";
import {
  registerTelegramWebhook,
  getTelegramWebhookInfo,
} from "@/lib/telegram/bot-api";

type RouteContext = { params: Promise<{ clinicId: string }> };

// One-click "reconnect the bot": re-point the clinic's Telegram bot at the
// shared n8n webhook. This is the self-service fix for a bot that stays silent
// after a clinic is created — auto-registration on clinic creation is
// best-effort and can fail quietly (env not set at the time, transient network,
// n8n host moved). Manager-gated; runs server-side where the env + network are
// available.
export async function POST(_request: Request, { params }: RouteContext) {
  const { clinicId } = await params;
  const auth = await requireClinicManagerOrOwner(clinicId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { data: ch } = await getAdminSupabase()
    .from("clinic_channels")
    .select("tg_bot_token")
    .eq("clinic_id", clinicId)
    .eq("channel", "telegram")
    .maybeSingle();

  if (!ch?.tg_bot_token) {
    return NextResponse.json(
      { error: "لا يوجد بوت تيليجرام مُعدّ لهذه العيادة" },
      { status: 400 }
    );
  }

  try {
    await registerTelegramWebhook(ch.tg_bot_token);
    const webhook = await getTelegramWebhookInfo(ch.tg_bot_token);
    return NextResponse.json({ ok: true, webhook });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "تعذّر ربط البوت" },
      { status: 500 }
    );
  }
}

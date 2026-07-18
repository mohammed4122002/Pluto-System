import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { requireClinicManagerOrOwner } from "@/lib/auth/require-clinic-access";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { registerTelegramWebhook } from "@/lib/telegram/bot-api";
import { subscribeWhatsAppWabaToApp } from "@/lib/whatsapp/meta";

type RouteContext = { params: Promise<{ clinicId: string }> };

// Self-service channel setup for an EXISTING clinic. The Add Clinic Wizard
// only ever inserts clinic_channels once, at creation (POST /api/clinic-
// channels, owner-only) — there was no way to add/fix a bot token or Twilio
// credentials afterward without a direct DB edit. This upserts by
// (clinic_id, channel) — there's no DB unique constraint on that pair, so we
// select-then-insert/update instead of relying on ON CONFLICT — and, like the
// wizard, registers the Telegram webhook / subscribes the WhatsApp WABA
// automatically so saving is enough to make the bot respond.
export async function POST(request: Request, { params }: RouteContext) {
  const { clinicId } = await params;
  const auth = await requireClinicManagerOrOwner(clinicId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const body = await request.json();
  const { channel } = body as { channel: "telegram" | "whatsapp" };
  if (channel !== "telegram" && channel !== "whatsapp") {
    return NextResponse.json({ error: "قناة غير مدعومة" }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data: existing } = await admin
    .from("clinic_channels")
    .select("id, wa_verify_token")
    .eq("clinic_id", clinicId)
    .eq("channel", channel)
    .maybeSingle();

  let row: Record<string, unknown>;
  if (channel === "telegram") {
    const tg_bot_token = String(body.tg_bot_token ?? "").trim();
    if (!tg_bot_token) {
      return NextResponse.json({ error: "أدخل Bot Token" }, { status: 400 });
    }
    row = { clinic_id: clinicId, channel, is_enabled: true, tg_bot_token };
  } else {
    const wa_provider = body.wa_provider === "twilio" ? "twilio" : "meta";
    if (wa_provider === "twilio") {
      const twilio_account_sid = String(body.twilio_account_sid ?? "").trim();
      const twilio_auth_token = String(body.twilio_auth_token ?? "").trim();
      const twilio_whatsapp_from = String(body.twilio_whatsapp_from ?? "").trim();
      if (!twilio_account_sid || !twilio_auth_token || !twilio_whatsapp_from) {
        return NextResponse.json(
          { error: "أدخل Account SID و Auth Token ورقم واتساب Twilio" },
          { status: 400 }
        );
      }
      row = {
        clinic_id: clinicId,
        channel,
        is_enabled: true,
        wa_provider,
        twilio_account_sid,
        twilio_auth_token,
        twilio_whatsapp_from,
      };
    } else {
      const wa_phone_id = String(body.wa_phone_id ?? "").trim();
      const wa_access_token = String(body.wa_access_token ?? "").trim();
      if (!wa_phone_id || !wa_access_token) {
        return NextResponse.json(
          { error: "أدخل Phone Number ID و Access Token" },
          { status: 400 }
        );
      }
      row = {
        clinic_id: clinicId,
        channel,
        is_enabled: true,
        wa_provider,
        wa_phone_number: String(body.wa_phone_number ?? "").trim() || null,
        wa_phone_id,
        wa_waba_id: String(body.wa_waba_id ?? "").trim() || null,
        wa_access_token,
        wa_verify_token: existing?.wa_verify_token ?? randomUUID(),
      };
    }
  }

  const { error } = existing
    ? await admin.from("clinic_channels").update(row).eq("id", existing.id)
    : await admin.from("clinic_channels").insert(row);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Best-effort auto-connect, same as the wizard: a saved token is inert
  // until the provider knows where to deliver updates.
  const warnings: string[] = [];
  if (channel === "telegram") {
    try {
      await registerTelegramWebhook(row.tg_bot_token as string);
    } catch (e) {
      warnings.push(e instanceof Error ? e.message : "فشل تسجيل webhook تيليجرام");
    }
  } else if (row.wa_provider === "meta" && row.wa_waba_id && row.wa_access_token) {
    try {
      await subscribeWhatsAppWabaToApp({
        wabaId: row.wa_waba_id as string,
        accessToken: row.wa_access_token as string,
      });
    } catch (e) {
      warnings.push(e instanceof Error ? e.message : "فشل ربط رقم واتساب بالتطبيق");
    }
  }

  return NextResponse.json({ ok: true, ...(warnings.length ? { warnings } : {}) });
}

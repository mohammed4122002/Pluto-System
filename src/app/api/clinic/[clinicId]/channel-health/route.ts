import { NextResponse } from "next/server";

import { requireClinicManagerOrOwner } from "@/lib/auth/require-clinic-access";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { verifyWhatsAppCredentials } from "@/lib/whatsapp/meta";
import { verifyTwilioCredentials } from "@/lib/whatsapp/twilio";
import { getTelegramBotInfo } from "@/lib/telegram/bot-api";

type RouteContext = { params: Promise<{ clinicId: string }> };

function msg(e: unknown) {
  return e instanceof Error ? e.message : "فشل التحقق";
}

// Live health check for a clinic's messaging channels, callable by the
// clinic manager (not just the platform owner). Verifies each channel's
// credentials against its provider WITHOUT sending a message, so the clinic
// can see at a glance whether its bot token is valid or expired — the exact
// failure mode that silently breaks reminders/ratings.
export async function POST(_request: Request, { params }: RouteContext) {
  const { clinicId } = await params;
  const auth = await requireClinicManagerOrOwner(clinicId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { data: channels } = await getAdminSupabase()
    .from("clinic_channels")
    .select(
      "channel, is_enabled, tg_bot_token, wa_provider, wa_phone_id, wa_access_token, twilio_account_sid, twilio_auth_token"
    )
    .eq("clinic_id", clinicId);

  const results: {
    channel: string;
    provider?: string;
    ok: boolean;
    label?: string;
    error?: string;
  }[] = [];

  for (const ch of channels ?? []) {
    if (ch.channel === "telegram") {
      if (!ch.tg_bot_token) continue;
      try {
        const bot = await getTelegramBotInfo(ch.tg_bot_token);
        results.push({ channel: "telegram", ok: true, label: `@${bot.username}` });
      } catch (e) {
        results.push({ channel: "telegram", ok: false, error: msg(e) });
      }
    } else if (ch.channel === "whatsapp") {
      const provider = ch.wa_provider === "twilio" ? "twilio" : "meta";
      try {
        if (provider === "twilio") {
          if (!ch.twilio_account_sid || !ch.twilio_auth_token) continue;
          const info = await verifyTwilioCredentials({
            accountSid: ch.twilio_account_sid,
            authToken: ch.twilio_auth_token,
          });
          results.push({
            channel: "whatsapp",
            provider,
            ok: true,
            label: info.friendly_name ?? "Twilio",
          });
        } else {
          if (!ch.wa_phone_id || !ch.wa_access_token) continue;
          const info = await verifyWhatsAppCredentials({
            phoneId: ch.wa_phone_id,
            accessToken: ch.wa_access_token,
          });
          results.push({
            channel: "whatsapp",
            provider,
            ok: true,
            label: info.display_phone_number ?? info.verified_name ?? "WhatsApp",
          });
        }
      } catch (e) {
        results.push({ channel: "whatsapp", provider, ok: false, error: msg(e) });
      }
    }
  }

  return NextResponse.json({ results, checkedAt: new Date().toISOString() });
}

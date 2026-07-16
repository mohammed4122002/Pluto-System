import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { requireOwner } from "@/lib/auth/require-owner";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { registerTelegramWebhook } from "@/lib/telegram/bot-api";
import { subscribeWhatsAppWabaToApp } from "@/lib/whatsapp/meta";

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const body = await request.json();
  const { clinic_id, channels } = body as {
    clinic_id: string;
    channels: Record<string, unknown>[];
  };

  if (!clinic_id || !Array.isArray(channels) || channels.length === 0) {
    return NextResponse.json(
      { error: "clinic_id and at least one channel are required" },
      { status: 400 }
    );
  }

  const rows = channels.map((channel) => ({
    ...channel,
    clinic_id,
    wa_verify_token:
      channel.channel === "whatsapp"
        ? (channel.wa_verify_token as string | undefined) ?? randomUUID()
        : channel.wa_verify_token,
  }));

  const { data, error } = await getAdminSupabase()
    .from("clinic_channels")
    .insert(rows)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Register the n8n webhook for every Telegram bot we just saved, otherwise
  // Telegram has nowhere to deliver updates and the bot stays silent. Best
  // effort — a registration failure must not roll back the saved channels, but
  // we report it so the owner can retry.
  const webhookWarnings: string[] = [];
  for (const channel of channels) {
    if (channel.channel === "telegram" && channel.tg_bot_token) {
      try {
        await registerTelegramWebhook(channel.tg_bot_token as string);
      } catch (e) {
        webhookWarnings.push(
          e instanceof Error ? e.message : "فشل تسجيل webhook تيليجرام"
        );
      }
    }

    // WhatsApp: auto-link the clinic's WABA to the app so Meta delivers its
    // message webhooks — the per-clinic step the owner would otherwise do by
    // hand in the Meta dashboard. Needs the WABA id + a token carrying
    // whatsapp_business_management. Non-blocking, like the Telegram case.
    if (
      channel.channel === "whatsapp" &&
      channel.wa_waba_id &&
      channel.wa_access_token
    ) {
      try {
        await subscribeWhatsAppWabaToApp({
          wabaId: channel.wa_waba_id as string,
          accessToken: channel.wa_access_token as string,
        });
      } catch (e) {
        webhookWarnings.push(
          e instanceof Error ? e.message : "فشل ربط رقم واتساب بالتطبيق"
        );
      }
    }
  }

  return NextResponse.json(
    { channels: data, ...(webhookWarnings.length ? { webhookWarnings } : {}) },
    { status: 201 }
  );
}

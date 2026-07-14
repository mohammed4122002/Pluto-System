import "server-only";

export async function getTelegramBotInfo(botToken: string) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
  const data = await res.json();

  if (!res.ok || !data.ok) {
    throw new Error(data?.description ?? "فشل التحقق من رمز البوت");
  }

  return data.result as { id: number; username: string; first_name: string };
}

// The shared n8n Telegram webhook path (STATIC — no path parameter). The
// per-clinic bot token is passed as a `?token=` query param, NOT a path
// segment: this n8n instance only registers webhook routes with static paths,
// so a `/telegram/:bot_token` style route silently fails to register (the bot
// then looks "dead" — Telegram delivers, n8n 404s). Override via env if the
// n8n workflow path ever changes.
const TG_WEBHOOK_PATH =
  process.env.TELEGRAM_N8N_WEBHOOK_PATH ??
  "8f4b2c1e-6a9d-4f3b-b2a7-1c5e9d0a3f76/telegram";

/**
 * Point a clinic's Telegram bot at the shared n8n webhook so incoming messages
 * (and the reminder confirm/cancel callback buttons) actually reach n8n.
 * Without this, a saved bot token is inert — Telegram has nowhere to deliver
 * updates and the bot appears silent. Best-effort: throws on failure so the
 * caller can surface it, but callers treat it as non-blocking.
 */
export async function registerTelegramWebhook(botToken: string) {
  const base = process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL is not configured");
  }

  const webhookUrl = `${base.replace(/\/$/, "")}/webhook/${TG_WEBHOOK_PATH}?token=${encodeURIComponent(botToken)}`;

  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: true,
      }),
    }
  );
  const data = await res.json();

  if (!res.ok || !data.ok) {
    throw new Error(data?.description ?? "فشل تسجيل webhook تيليجرام");
  }

  return data;
}

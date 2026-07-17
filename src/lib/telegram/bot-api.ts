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
 * The exact URL a clinic's Telegram bot must be pointed at so Telegram delivers
 * updates to the shared n8n webhook. Single source of truth for both
 * registering the webhook and checking whether it is already registered.
 */
export function telegramWebhookUrl(botToken: string) {
  const base = process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL is not configured");
  }
  return `${base.replace(/\/$/, "")}/webhook/${TG_WEBHOOK_PATH}?token=${encodeURIComponent(botToken)}`;
}

/**
 * Read the webhook Telegram currently has on file for this bot. This is the
 * missing half of a health check: a bot token can be perfectly valid while no
 * webhook is registered (or it points at a stale URL), and the bot then looks
 * "dead" because Telegram has nowhere to deliver updates. `registered` = a URL
 * is set at all; `matches` = it points at THIS deployment's n8n webhook.
 */
export async function getTelegramWebhookInfo(botToken: string) {
  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/getWebhookInfo`
  );
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data?.description ?? "فشل قراءة حالة webhook تيليجرام");
  }
  const info = data.result as {
    url?: string;
    pending_update_count?: number;
    last_error_message?: string;
  };
  const currentUrl = info.url ?? "";
  let expected = "";
  try {
    expected = telegramWebhookUrl(botToken);
  } catch {
    expected = "";
  }
  return {
    registered: Boolean(currentUrl),
    // Compare on path only — the token query string is identical by
    // construction, and Telegram echoes the full URL back.
    matches: Boolean(expected) && currentUrl === expected,
    url: currentUrl,
    pendingUpdates: info.pending_update_count ?? 0,
    lastError: info.last_error_message ?? null,
  };
}

/**
 * Point a clinic's Telegram bot at the shared n8n webhook so incoming messages
 * (and the reminder confirm/cancel callback buttons) actually reach n8n.
 * Without this, a saved bot token is inert — Telegram has nowhere to deliver
 * updates and the bot appears silent. Best-effort: throws on failure so the
 * caller can surface it, but callers treat it as non-blocking.
 */
export async function registerTelegramWebhook(botToken: string) {
  const webhookUrl = telegramWebhookUrl(botToken);

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

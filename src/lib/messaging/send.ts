import "server-only";

// Sends a staff message out through the clinic's own channel. Runs on the
// deployed server (Vercel), which has open egress to Telegram/Meta — the
// clinic's own token is used so the patient sees it from the clinic's bot.
type ClinicChannelConfig = {
  channel: "telegram" | "whatsapp";
  chat_ref: string;
  tg_bot_token: string | null;
  wa_phone_id: string | null;
  wa_access_token: string | null;
};

export async function sendClinicMessage(cfg: ClinicChannelConfig, text: string) {
  if (cfg.channel === "telegram") {
    if (!cfg.tg_bot_token) throw new Error("العيادة لا تملك بوت تيليجرام مفعّل");
    const res = await fetch(
      `https://api.telegram.org/bot${cfg.tg_bot_token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: cfg.chat_ref, text }),
      }
    );
    const json = await res.json();
    if (!res.ok || !json.ok) {
      throw new Error(json.description ?? "فشل إرسال الرسالة عبر تيليجرام");
    }
    return;
  }

  // whatsapp
  if (!cfg.wa_phone_id || !cfg.wa_access_token) {
    throw new Error("العيادة لا تملك واتساب مفعّل");
  }
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${cfg.wa_phone_id}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.wa_access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: cfg.chat_ref,
        type: "text",
        text: { body: text },
      }),
    }
  );
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error?.message ?? "فشل إرسال الرسالة عبر واتساب");
  }
}

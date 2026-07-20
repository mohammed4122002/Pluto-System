import "server-only";

// Sends a staff message out through the clinic's own channel. Runs on the
// deployed server (Vercel), which has open egress to Telegram/Meta/Twilio —
// the clinic's own token is used so the patient sees it from the clinic's bot.
type ClinicChannelConfig = {
  channel: "telegram" | "whatsapp";
  chat_ref: string;
  tg_bot_token: string | null;
  wa_provider?: string | null;
  wa_phone_id: string | null;
  wa_access_token: string | null;
  twilio_account_sid?: string | null;
  twilio_auth_token?: string | null;
  twilio_whatsapp_from?: string | null;
};

const digits = (s: string | null | undefined) => String(s ?? "").replace(/\D/g, "");

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

  // whatsapp via Twilio
  if (cfg.wa_provider === "twilio") {
    if (!cfg.twilio_account_sid || !cfg.twilio_auth_token) {
      throw new Error("العيادة لا تملك واتساب (Twilio) مفعّل");
    }
    const from = cfg.twilio_whatsapp_from ?? "";
    const fromN = from.startsWith("whatsapp:") ? from : `whatsapp:+${digits(from)}`;
    const auth = Buffer.from(
      `${cfg.twilio_account_sid}:${cfg.twilio_auth_token}`
    ).toString("base64");
    const params = new URLSearchParams({
      From: fromN,
      To: `whatsapp:+${digits(cfg.chat_ref)}`,
      Body: text,
    });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${cfg.twilio_account_sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(
        (json as { message?: string })?.message ?? "فشل إرسال الرسالة عبر واتساب (Twilio)"
      );
    }
    return;
  }

  // whatsapp via Meta Cloud API
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
        to: digits(cfg.chat_ref),
        type: "text",
        text: { body: text },
      }),
    }
  );
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(
      (json as { error?: { message?: string } })?.error?.message ??
        "فشل إرسال الرسالة عبر واتساب"
    );
  }
}

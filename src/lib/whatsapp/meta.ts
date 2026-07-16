import "server-only";

const META_GRAPH_URL =
  process.env.META_GRAPH_URL ?? "https://graph.facebook.com/v19.0";

export interface SendWhatsAppMessageParams {
  phoneId: string;
  accessToken: string;
  to: string;
  body: string;
}

export async function sendWhatsAppTextMessage({
  phoneId,
  accessToken,
  to,
  body,
}: SendWhatsAppMessageParams) {
  const res = await fetch(`${META_GRAPH_URL}/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error?.message ?? "WhatsApp API request failed");
  }

  return data;
}

export interface SubscribeWhatsAppParams {
  wabaId: string;
  accessToken: string;
}

/**
 * Link a clinic's WhatsApp Business Account (WABA) to the app the access
 * token belongs to, so Meta delivers that WABA's message webhooks to the
 * app's configured callback URL. This is the WhatsApp equivalent of
 * Telegram's setWebhook that we CAN automate with just the clinic's own
 * token — the callback URL + verify token themselves are a one-time,
 * app-level setup in the Meta dashboard (shared by every clinic on the same
 * app), not something set per clinic. Requires the token to carry the
 * whatsapp_business_management permission. Best-effort: throws on failure so
 * the caller can surface it, but callers treat it as non-blocking.
 */
export async function subscribeWhatsAppWabaToApp({
  wabaId,
  accessToken,
}: SubscribeWhatsAppParams) {
  const res = await fetch(`${META_GRAPH_URL}/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await res.json();

  if (!res.ok || data?.success === false) {
    throw new Error(data?.error?.message ?? "تعذّر ربط رقم واتساب بالتطبيق");
  }

  return data;
}

export interface VerifyWhatsAppParams {
  phoneId: string;
  accessToken: string;
}

/**
 * Validate a clinic's WhatsApp credentials without sending a message. Reads
 * the phone number's own metadata from the Graph API — this exercises both
 * the Phone Number ID and the access token, and (unlike sending a text)
 * needs no recipient, no 24-hour session window, and no approved template.
 * That makes it a reliable "test connection" that reflects whether the
 * credentials are actually usable.
 */
export async function verifyWhatsAppCredentials({
  phoneId,
  accessToken,
}: VerifyWhatsAppParams) {
  const res = await fetch(
    `${META_GRAPH_URL}/${phoneId}?fields=verified_name,display_phone_number,quality_rating`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error?.message ?? "تعذّر التحقق من بيانات واتساب");
  }

  return data as {
    verified_name?: string;
    display_phone_number?: string;
    quality_rating?: string;
    id?: string;
  };
}

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

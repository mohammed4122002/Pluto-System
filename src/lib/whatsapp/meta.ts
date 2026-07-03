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

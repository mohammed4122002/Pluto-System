import "server-only";

// Twilio is an alternative WhatsApp provider to Meta Cloud API. It is far
// easier to onboard (sandbox works immediately, credentials don't expire, no
// business verification), so clinics can choose it per channel. Auth is HTTP
// Basic with the Account SID as username and the Auth Token as password.

const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";

function basicAuth(accountSid: string, authToken: string) {
  return "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
}

// Twilio WhatsApp addresses are prefixed with "whatsapp:" and use E.164.
function toWhatsAppAddress(raw: string) {
  const trimmed = raw.trim();
  if (trimmed.startsWith("whatsapp:")) return trimmed;
  const digits = trimmed.replace(/[^\d+]/g, "");
  const e164 = digits.startsWith("+") ? digits : `+${digits}`;
  return `whatsapp:${e164}`;
}

export interface SendTwilioWhatsAppParams {
  accountSid: string;
  authToken: string;
  from: string; // clinic's Twilio WhatsApp sender (E.164 or whatsapp:+...)
  to: string; // recipient (E.164 or whatsapp:+...)
  body: string;
}

export async function sendTwilioWhatsAppMessage({
  accountSid,
  authToken,
  from,
  to,
  body,
}: SendTwilioWhatsAppParams) {
  const params = new URLSearchParams({
    From: toWhatsAppAddress(from),
    To: toWhatsAppAddress(to),
    Body: body,
  });

  const res = await fetch(`${TWILIO_API_BASE}/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(accountSid, authToken),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message ?? "فشل إرسال رسالة Twilio");
  }

  return data;
}

export interface VerifyTwilioParams {
  accountSid: string;
  authToken: string;
}

/**
 * Validate Twilio credentials without sending a message by fetching the
 * account resource. Confirms the Account SID + Auth Token are correct and
 * the account is usable — the Twilio equivalent of Meta's credential check.
 */
export async function verifyTwilioCredentials({
  accountSid,
  authToken,
}: VerifyTwilioParams) {
  const res = await fetch(`${TWILIO_API_BASE}/Accounts/${accountSid}.json`, {
    headers: { Authorization: basicAuth(accountSid, authToken) },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message ?? "تعذّر التحقق من بيانات Twilio");
  }

  return data as { friendly_name?: string; status?: string; sid?: string };
}

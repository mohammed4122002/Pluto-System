import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/auth/require-owner";
import {
  sendWhatsAppTextMessage,
  verifyWhatsAppCredentials,
} from "@/lib/whatsapp/meta";
import {
  sendTwilioWhatsAppMessage,
  verifyTwilioCredentials,
} from "@/lib/whatsapp/twilio";

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const body = (await request.json()) as {
    provider?: "meta" | "twilio";
    // Meta
    wa_phone_id?: string;
    wa_access_token?: string;
    // Twilio
    twilio_account_sid?: string;
    twilio_auth_token?: string;
    twilio_whatsapp_from?: string;
    // Optional live-message recipient
    to?: string;
  };

  const provider = body.provider === "twilio" ? "twilio" : "meta";
  const recipient = (body.to ?? "").replace(/[^\d+]/g, "");

  try {
    if (provider === "twilio") {
      if (!body.twilio_account_sid || !body.twilio_auth_token) {
        return NextResponse.json(
          { error: "Twilio Account SID و Auth Token مطلوبان" },
          { status: 400 }
        );
      }

      const info = await verifyTwilioCredentials({
        accountSid: body.twilio_account_sid,
        authToken: body.twilio_auth_token,
      });

      let messageSent = false;
      let messageNote: string | undefined;
      if (recipient && body.twilio_whatsapp_from) {
        try {
          await sendTwilioWhatsAppMessage({
            accountSid: body.twilio_account_sid,
            authToken: body.twilio_auth_token,
            from: body.twilio_whatsapp_from,
            to: recipient,
            body: "رسالة اختبار من MediSync AI ✅",
          });
          messageSent = true;
        } catch (err) {
          messageNote =
            err instanceof Error ? err.message : "تعذّر إرسال رسالة الاختبار";
        }
      }

      return NextResponse.json({
        ok: true,
        provider,
        verified_name: info.friendly_name ?? null,
        account_status: info.status ?? null,
        messageSent,
        ...(messageNote ? { messageNote } : {}),
      });
    }

    // provider === "meta"
    if (!body.wa_phone_id || !body.wa_access_token) {
      return NextResponse.json(
        { error: "wa_phone_id and wa_access_token are required" },
        { status: 400 }
      );
    }

    const info = await verifyWhatsAppCredentials({
      phoneId: body.wa_phone_id,
      accessToken: body.wa_access_token,
    });

    let messageSent = false;
    let messageNote: string | undefined;
    if (recipient) {
      try {
        await sendWhatsAppTextMessage({
          phoneId: body.wa_phone_id,
          accessToken: body.wa_access_token,
          to: recipient,
          body: "رسالة اختبار من MediSync AI ✅",
        });
        messageSent = true;
      } catch (err) {
        messageNote =
          err instanceof Error ? err.message : "تعذّر إرسال رسالة الاختبار";
      }
    }

    return NextResponse.json({
      ok: true,
      provider,
      verified_name: info.verified_name ?? null,
      display_phone_number: info.display_phone_number ?? null,
      quality_rating: info.quality_rating ?? null,
      messageSent,
      ...(messageNote ? { messageNote } : {}),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}

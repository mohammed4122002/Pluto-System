import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/auth/require-owner";
import {
  sendWhatsAppTextMessage,
  verifyWhatsAppCredentials,
} from "@/lib/whatsapp/meta";

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { wa_phone_id, wa_access_token, to } = (await request.json()) as {
    wa_phone_id: string;
    wa_access_token: string;
    to?: string;
  };

  if (!wa_phone_id || !wa_access_token) {
    return NextResponse.json(
      { error: "wa_phone_id and wa_access_token are required" },
      { status: 400 }
    );
  }

  try {
    // Always verify the credentials against Meta first. This confirms the
    // Phone Number ID + access token are valid without needing a recipient,
    // a 24h session window, or an approved template.
    const info = await verifyWhatsAppCredentials({
      phoneId: wa_phone_id,
      accessToken: wa_access_token,
    });

    // If the owner also provided a recipient number, try a live text send as
    // a bonus. This only succeeds inside a 24h customer-service window (or
    // Meta test numbers); a failure here does not fail the whole test — the
    // credentials are still valid — so we surface it as a soft note.
    let messageSent = false;
    let messageNote: string | undefined;
    const recipient = (to ?? "").replace(/[^\d]/g, "");
    if (recipient) {
      try {
        await sendWhatsAppTextMessage({
          phoneId: wa_phone_id,
          accessToken: wa_access_token,
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

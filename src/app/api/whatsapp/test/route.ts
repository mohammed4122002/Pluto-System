import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/auth/require-owner";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp/meta";

const TEST_NUMBER = process.env.WHATSAPP_TEST_NUMBER;

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { wa_phone_id, wa_access_token } = (await request.json()) as {
    wa_phone_id: string;
    wa_access_token: string;
  };

  if (!wa_phone_id || !wa_access_token) {
    return NextResponse.json(
      { error: "wa_phone_id and wa_access_token are required" },
      { status: 400 }
    );
  }

  if (!TEST_NUMBER) {
    return NextResponse.json(
      { error: "WHATSAPP_TEST_NUMBER is not configured" },
      { status: 500 }
    );
  }

  try {
    await sendWhatsAppTextMessage({
      phoneId: wa_phone_id,
      accessToken: wa_access_token,
      to: TEST_NUMBER,
      body: "رسالة اختبار من MediSync AI ✅",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}

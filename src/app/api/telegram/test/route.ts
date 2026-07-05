import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/auth/require-owner";
import { getTelegramBotInfo } from "@/lib/telegram/bot-api";

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.message, debug: "debug" in auth ? auth.debug : undefined },
      { status: auth.status }
    );
  }

  const { bot_token } = (await request.json()) as { bot_token: string };

  if (!bot_token) {
    return NextResponse.json({ error: "bot_token مطلوب" }, { status: 400 });
  }

  try {
    const bot = await getTelegramBotInfo(bot_token);
    return NextResponse.json({ ok: true, bot });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}

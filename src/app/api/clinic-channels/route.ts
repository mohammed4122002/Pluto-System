import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { requireOwner } from "@/lib/auth/require-owner";
import { adminSupabase } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const body = await request.json();
  const { clinic_id, channels } = body as {
    clinic_id: string;
    channels: Record<string, unknown>[];
  };

  if (!clinic_id || !Array.isArray(channels) || channels.length === 0) {
    return NextResponse.json(
      { error: "clinic_id and at least one channel are required" },
      { status: 400 }
    );
  }

  const rows = channels.map((channel) => ({
    ...channel,
    clinic_id,
    wa_verify_token:
      channel.channel === "whatsapp"
        ? (channel.wa_verify_token as string | undefined) ?? randomUUID()
        : channel.wa_verify_token,
  }));

  const { data, error } = await adminSupabase
    .from("clinic_channels")
    .insert(rows)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ channels: data }, { status: 201 });
}

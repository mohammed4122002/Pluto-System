import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/auth/require-owner";
import { adminSupabase } from "@/lib/supabase/admin";
import { PLANS } from "@/lib/pricing";
import type { Plan } from "@/types";

export async function GET() {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { data, error } = await adminSupabase
    .from("subscriptions")
    .select("*, clinic:clinics(name)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ subscriptions: data });
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const body = await request.json();
  const { clinic_id, plan, starts_at, payment_note } = body as {
    clinic_id: string;
    plan: Plan;
    starts_at: string;
    payment_note?: string;
  };

  if (!clinic_id || !plan || !starts_at) {
    return NextResponse.json(
      { error: "clinic_id, plan and starts_at are required" },
      { status: 400 }
    );
  }

  const planInfo = PLANS[plan];
  const expires = new Date(starts_at);
  expires.setMonth(expires.getMonth() + planInfo.months);

  const { data, error } = await adminSupabase
    .from("subscriptions")
    .insert({
      clinic_id,
      plan,
      price_sar: planInfo.totalSar,
      starts_at,
      expires_at: expires.toISOString().slice(0, 10),
      payment_note,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ subscription: data }, { status: 201 });
}

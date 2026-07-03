import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/auth/require-owner";
import { getAdminSupabase } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { id } = await params;
  const { data, error } = await getAdminSupabase()
    .from("clinics")
    .select(
      "*, channels:clinic_channels(*), db_config:clinic_db_config(*), automation:clinic_automation(*), subscription:subscriptions(*)"
    )
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ clinic: data });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { id } = await params;
  const body = await request.json();

  const { data, error } = await getAdminSupabase()
    .from("clinics")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ clinic: data });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { id } = await params;
  const { error } = await getAdminSupabase().from("clinics").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

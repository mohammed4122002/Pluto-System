import { NextResponse } from "next/server";

import { requireClinicManagerOrOwner } from "@/lib/auth/require-clinic-access";
import { getAdminSupabase } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ clinicId: string; methodId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { clinicId, methodId } = await params;
  const auth = await requireClinicManagerOrOwner(clinicId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  const body = await request.json();

  const patch: Record<string, unknown> = {};
  for (const key of [
    "name_ar",
    "name_en",
    "type",
    "account_ref",
    "instructions",
  ] as const) {
    if (key in body) patch[key] = String(body[key] ?? "").trim() || null;
  }
  for (const key of ["is_enabled", "show_in_bot", "is_default"] as const) {
    if (key in body) patch[key] = Boolean(body[key]);
  }
  // name must stay non-null
  if ("name_ar" in patch && !patch.name_ar) {
    return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
  }

  const { data, error } = await getAdminSupabase()
    .from("clinic_payment_methods")
    .update(patch)
    .eq("id", methodId)
    .eq("clinic_id", clinicId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ method: data });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { clinicId, methodId } = await params;
  const auth = await requireClinicManagerOrOwner(clinicId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  const { error } = await getAdminSupabase()
    .from("clinic_payment_methods")
    .delete()
    .eq("id", methodId)
    .eq("clinic_id", clinicId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

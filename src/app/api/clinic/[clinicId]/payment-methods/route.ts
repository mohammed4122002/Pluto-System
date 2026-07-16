import { NextResponse } from "next/server";

import { requireClinicManagerOrOwner } from "@/lib/auth/require-clinic-access";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { PaymentMethodType } from "@/types";

type RouteContext = { params: Promise<{ clinicId: string }> };

const TYPES: PaymentMethodType[] = [
  "vodafone_cash",
  "instapay",
  "visa",
  "bank",
  "cash",
  "other",
];

export async function GET(_request: Request, { params }: RouteContext) {
  const { clinicId } = await params;
  const auth = await requireClinicManagerOrOwner(clinicId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  const { data, error } = await getAdminSupabase()
    .from("clinic_payment_methods")
    .select("*")
    .eq("clinic_id", clinicId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ methods: data });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { clinicId } = await params;
  const auth = await requireClinicManagerOrOwner(clinicId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  const body = await request.json();
  const name_ar = String(body.name_ar ?? "").trim();
  const type = String(body.type ?? "other") as PaymentMethodType;
  if (!name_ar) {
    return NextResponse.json({ error: "اسم طريقة الدفع مطلوب" }, { status: 400 });
  }
  if (!TYPES.includes(type)) {
    return NextResponse.json({ error: "نوع غير صالح" }, { status: 400 });
  }

  const { data, error } = await getAdminSupabase()
    .from("clinic_payment_methods")
    .insert({
      clinic_id: clinicId,
      name_ar,
      name_en: String(body.name_en ?? "").trim() || null,
      type,
      account_ref: String(body.account_ref ?? "").trim() || null,
      instructions: String(body.instructions ?? "").trim() || null,
      is_enabled: body.is_enabled !== false,
      show_in_bot: body.show_in_bot !== false,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ method: data });
}

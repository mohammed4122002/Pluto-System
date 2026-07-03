import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/auth/require-owner";
import { getAdminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { data, error } = await getAdminSupabase()
    .from("clinics")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ clinics: data });
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const body = await request.json();
  const { name, doctor_name, specialty, city, address, phone, clinic_key } = body;

  if (!name || !doctor_name || !clinic_key) {
    return NextResponse.json(
      { error: "name, doctor_name and clinic_key are required" },
      { status: 400 }
    );
  }

  const { data, error } = await getAdminSupabase()
    .from("clinics")
    .insert({ name, doctor_name, specialty, city, address, phone, clinic_key })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ clinic: data }, { status: 201 });
}

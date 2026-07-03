import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/auth/require-owner";
import { adminSupabase } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const body = await request.json();
  const { clinic_id, ...automation } = body as {
    clinic_id: string;
    [key: string]: unknown;
  };

  if (!clinic_id) {
    return NextResponse.json({ error: "clinic_id is required" }, { status: 400 });
  }

  const { data, error } = await adminSupabase
    .from("clinic_automation")
    .insert({ clinic_id, ...automation })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ automation: data }, { status: 201 });
}

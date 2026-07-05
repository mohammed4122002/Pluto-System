import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/auth/require-owner";
import { getAdminSupabase } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string; staffId: string }> };

export async function DELETE(_request: Request, { params }: RouteContext) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { staffId } = await params;
  const adminSupabase = getAdminSupabase();

  const { data: staffRow, error: fetchError } = await adminSupabase
    .from("platform_users")
    .select("auth_id")
    .eq("id", staffId)
    .single();

  if (fetchError || !staffRow) {
    return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
  }

  const { error: deleteError } = await adminSupabase
    .from("platform_users")
    .delete()
    .eq("id", staffId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  await adminSupabase.auth.admin.deleteUser(staffRow.auth_id);

  return NextResponse.json({ ok: true });
}

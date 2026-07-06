import { NextResponse } from "next/server";

import { requireClinicManagerOrOwner } from "@/lib/auth/require-clinic-access";
import { getAdminSupabase } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string; staffId: string }> };

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id: clinicId, staffId } = await params;
  const auth = await requireClinicManagerOrOwner(clinicId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const adminSupabase = getAdminSupabase();

  // Scoped to the clinic in the URL so a manager can only touch their own staff.
  const { data: staffRow, error: fetchError } = await adminSupabase
    .from("platform_users")
    .select("auth_id")
    .eq("id", staffId)
    .eq("clinic_id", clinicId)
    .single();

  if (fetchError || !staffRow) {
    return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
  }

  if (staffRow.auth_id === auth.user.id) {
    return NextResponse.json({ error: "لا يمكنك حذف حسابك الحالي" }, { status: 400 });
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

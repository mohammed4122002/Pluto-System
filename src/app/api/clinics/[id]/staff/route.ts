import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/auth/require-owner";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { UserRole } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

const STAFF_ROLES: UserRole[] = ["manager", "doctor", "secretary"];

export async function GET(_request: Request, { params }: RouteContext) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { id } = await params;
  const { data, error } = await getAdminSupabase()
    .from("platform_users")
    .select("id, name, email, role, is_active, created_at")
    .eq("clinic_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ staff: data });
}

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { id: clinicId } = await params;
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const role = String(body.role ?? "") as UserRole;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "الاسم والبريد وكلمة المرور مطلوبة" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }, { status: 400 });
  }
  if (!STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "دور غير صالح" }, { status: 400 });
  }

  const adminSupabase = getAdminSupabase();

  const { data: created, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !created.user) {
    return NextResponse.json(
      { error: authError?.message ?? "فشل إنشاء حساب المصادقة" },
      { status: 400 }
    );
  }

  const { data: staffRow, error: insertError } = await adminSupabase
    .from("platform_users")
    .insert({
      auth_id: created.user.id,
      clinic_id: clinicId,
      role,
      name,
      email,
      is_active: true,
    })
    .select("id, name, email, role, is_active, created_at")
    .single();

  if (insertError) {
    // roll back the auth user so we don't leave an orphaned account
    await adminSupabase.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ staff: staffRow });
}

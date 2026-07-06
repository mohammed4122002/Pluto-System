import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

// Layouts only enforce clinic-tenant isolation (spec section 13); pages that
// are meant for a subset of roles (manager-only reports/settings, etc.) must
// re-check the role themselves rather than relying on the sidebar hiding the
// link. Owner passes by default — they can see every clinic — EXCEPT where
// `allowOwner: false` is set: patient conversations are private clinic data
// the platform operator must not read.
export async function requireClinicRole(
  clinicId: string,
  allow: UserRole[],
  options: { allowOwner?: boolean } = {}
) {
  const { allowOwner = true } = options;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: platformUser } = await supabase
    .from("platform_users")
    .select("role")
    .eq("auth_id", user.id)
    .single();

  const role = platformUser?.role as UserRole | undefined;

  if (role === "owner") {
    if (allowOwner) return role;
    redirect(`/clinic/${clinicId}`);
  }

  if (!role || !allow.includes(role)) {
    redirect(`/clinic/${clinicId}`);
  }

  return role;
}

import "server-only";

import { createClient } from "@/lib/supabase/server";

// API-route guard (JSON result, no redirect): passes for the platform owner
// or for an active manager of this specific clinic. Used by routes a clinic
// manager may call on their own clinic (e.g. staff management).
export async function requireClinicManagerOrOwner(clinicId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, status: 401 as const, message: "Unauthorized" };
  }

  const { data: platformUser } = await supabase
    .from("platform_users")
    .select("role, clinic_id, is_active")
    .eq("auth_id", user.id)
    .single();

  if (platformUser?.role === "owner" && platformUser.is_active) {
    return { ok: true as const, user };
  }
  if (
    platformUser?.role === "manager" &&
    platformUser.is_active &&
    platformUser.clinic_id === clinicId
  ) {
    return { ok: true as const, user };
  }

  return { ok: false as const, status: 403 as const, message: "Forbidden" };
}

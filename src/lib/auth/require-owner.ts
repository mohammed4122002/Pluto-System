import "server-only";

import { createClient } from "@/lib/supabase/server";

// Every /admin/* and /api/clinic-* mutation re-checks role=owner server-side
// rather than relying solely on proxy.ts (spec section 13, security checklist).
export async function requireOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, status: 401 as const, message: "Unauthorized" };
  }

  const { data: platformUser } = await supabase
    .from("platform_users")
    .select("role")
    .eq("auth_id", user.id)
    .single();

  if (platformUser?.role !== "owner") {
    return { ok: false as const, status: 403 as const, message: "Forbidden" };
  }

  return { ok: true as const, user };
}

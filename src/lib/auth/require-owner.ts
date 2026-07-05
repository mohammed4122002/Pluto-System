import "server-only";
import { cookies, headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";

// Every /admin/* and /api/clinic-* mutation re-checks role=owner server-side
// rather than relying solely on proxy.ts (spec section 13, security checklist).
export async function requireOwner() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user) {
    // TEMPORARY: verbose diagnostics for the Unauthorized-on-API-routes bug —
    // surfaced in the response body itself, not just server logs.
    const cookieStore = await cookies();
    const headerStore = await headers();
    const debug = {
      authError: error?.message ?? null,
      authErrorStatus: error?.status ?? null,
      cookieNames: cookieStore.getAll().map((c) => c.name),
      host: headerStore.get("host"),
      xForwardedHost: headerStore.get("x-forwarded-host"),
      xVercelId: headerStore.get("x-vercel-id"),
      origin: headerStore.get("origin"),
      referer: headerStore.get("referer"),
    };
    return { ok: false as const, status: 401 as const, message: "Unauthorized", debug };
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

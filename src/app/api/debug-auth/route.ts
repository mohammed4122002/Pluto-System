import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";

// TEMPORARY diagnostic route — remove once the Unauthorized-on-API-routes
// issue is root-caused. Not linked from any UI.
export async function GET() {
  const cookieStore = await cookies();
  const cookieNames = cookieStore.getAll().map((c) => c.name);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  let platformUserResult: unknown = null;
  if (data.user) {
    const { data: pu, error: puError } = await supabase
      .from("platform_users")
      .select("role, auth_id")
      .eq("auth_id", data.user.id)
      .single();
    platformUserResult = { pu, puError: puError?.message ?? null };
  }

  return NextResponse.json({
    cookieNames,
    hasUser: Boolean(data.user),
    userId: data.user?.id ?? null,
    userEmail: data.user?.email ?? null,
    authError: error?.message ?? null,
    authErrorStatus: error?.status ?? null,
    platformUserResult,
  });
}

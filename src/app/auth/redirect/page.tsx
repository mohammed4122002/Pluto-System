import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// Post-login router: sends each user to the dashboard that matches their role.
export default async function AuthRedirectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: platformUser } = await supabase
    .from("platform_users")
    .select("role, clinic_id")
    .eq("auth_id", user.id)
    .single();

  if (platformUser?.role === "owner") {
    redirect("/admin");
  }

  if (platformUser?.clinic_id) {
    redirect(`/clinic/${platformUser.clinic_id}`);
  }

  // Authenticated but not provisioned in platform_users yet.
  redirect("/login?error=no-account");
}

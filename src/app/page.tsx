import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
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

  redirect(`/clinic/${platformUser?.clinic_id ?? ""}`);
}

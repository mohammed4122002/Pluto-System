import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense in depth — proxy.ts already gates /admin/*, but every owner-only
  // surface re-checks the role server-side per the spec's security checklist.
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

  if (platformUser?.role !== "owner") redirect("/login");

  return (
    <div className="flex h-full flex-1">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto px-4 pb-6 pt-20 sm:px-6 lg:pt-6">
        {children}
      </main>
    </div>
  );
}

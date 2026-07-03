import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ClinicSidebar } from "@/components/clinic/ClinicSidebar";

export default async function ClinicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: platformUser } = await supabase
    .from("platform_users")
    .select("role, clinic_id")
    .eq("auth_id", user.id)
    .single();

  // Defense in depth alongside proxy.ts (spec section 13).
  if (platformUser?.role !== "owner" && platformUser?.clinic_id !== clinicId) {
    redirect(`/clinic/${platformUser?.clinic_id ?? ""}`);
  }

  const { data: clinic } = await supabase
    .from("clinics")
    .select("id")
    .eq("id", clinicId)
    .single();

  if (!clinic) notFound();

  return (
    <div className="flex h-full flex-1">
      <ClinicSidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}

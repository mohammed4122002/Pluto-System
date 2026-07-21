import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { ClinicSidebar } from "@/components/clinic/ClinicSidebar";
import { SubscriptionBanner } from "@/components/clinic/SubscriptionBanner";

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

  // Admin client: clinic staff can't read subscriptions directly, and the
  // banner must render regardless of RLS scope.
  const admin = getAdminSupabase();
  const [{ data: clinic }, { data: activeSub }] = await Promise.all([
    admin
      .from("clinics")
      .select("id, status, suspended_reason")
      .eq("id", clinicId)
      .single(),
    admin
      .from("subscriptions")
      .select("expires_at")
      .eq("clinic_id", clinicId)
      .eq("status", "active")
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!clinic) notFound();

  return (
    <div className="flex h-full flex-1">
      <ClinicSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <SubscriptionBanner
          clinicStatus={clinic.status as string}
          suspendedReason={(clinic.suspended_reason as string | null) ?? null}
          expiresAt={(activeSub?.expires_at as string | null) ?? null}
        />
        {children}
      </main>
    </div>
  );
}

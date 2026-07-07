import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { AppointmentForm } from "@/components/clinic/AppointmentForm";
import { requireClinicRole } from "@/lib/auth/require-clinic-role";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServices } from "@/lib/clinic-services";
import type { ClinicDbConfig } from "@/types";

export default async function NewAppointmentPage({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  await requireClinicRole(clinicId, ["manager", "secretary"]);
  const admin = getAdminSupabase();

  const [{ data: dbConfigRow }, { data: staff }] = await Promise.all([
    admin.from("clinic_db_config").select("*").eq("clinic_id", clinicId).single(),
    admin
      .from("platform_users")
      .select("id, name, email")
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
  ]);

  const dbConfig = (dbConfigRow as ClinicDbConfig | null) ?? null;
  const supported = dbConfig?.db_type === "supabase" || dbConfig?.db_type === "google_sheets";
  const services = supported ? (await getServices(dbConfig)) ?? [] : [];

  return (
    <div className="space-y-6">
      <PageHeader title="إضافة موعد" />
      <Card>
        <CardContent className="p-6">
          <AppointmentForm
            clinicId={clinicId}
            services={services.filter((s) => s.active)}
            employees={(staff ?? []).map((s) => ({
              id: s.id as string,
              name: (s.name as string) || (s.email as string) || "—",
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

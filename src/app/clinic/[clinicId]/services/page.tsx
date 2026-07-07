import { getAdminSupabase } from "@/lib/supabase/admin";
import { requireClinicRole } from "@/lib/auth/require-clinic-role";
import { getServices } from "@/lib/clinic-services";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { ServicesManager } from "@/components/clinic/ServicesManager";
import type { ClinicDbConfig } from "@/types";

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  await requireClinicRole(clinicId, ["manager"]);
  const admin = getAdminSupabase();

  const [{ data: dbConfigRow }, { data: staff }] = await Promise.all([
    admin.from("clinic_db_config").select("*").eq("clinic_id", clinicId).single(),
    admin
      .from("platform_users")
      .select("id, name, email, role")
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
  ]);

  const dbConfig = (dbConfigRow as ClinicDbConfig | null) ?? null;
  const supported = dbConfig?.db_type === "supabase" || dbConfig?.db_type === "google_sheets";
  const services = supported ? await getServices(dbConfig) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="الخدمات"
        description="خدمات العيادة وأسعارها، والموظفون الذين يقدّمون كل خدمة"
      />

      {!supported ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            إدارة الخدمات متاحة حالياً لعيادات Supabase وGoogle Sheets فقط.
          </CardContent>
        </Card>
      ) : (
        <ServicesManager
          clinicId={clinicId}
          initialServices={services ?? []}
          employees={(staff ?? []).map((s) => ({
            id: s.id as string,
            name: (s.name as string) || (s.email as string) || "—",
            role: s.role as string,
          }))}
          loadFailed={services === null}
        />
      )}
    </div>
  );
}

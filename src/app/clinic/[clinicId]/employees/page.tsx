import { getAdminSupabase } from "@/lib/supabase/admin";
import { requireClinicRole } from "@/lib/auth/require-clinic-role";
import { getServices, getAbsences } from "@/lib/clinic-services";
import { getClinicAppointments } from "@/lib/clinic-data";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { EmployeesManager, type EmployeeView } from "@/components/clinic/EmployeesManager";
import type { ClinicDbConfig, EmployeeAbsence } from "@/types";

export default async function EmployeesPage({
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
      .select("id, name, email, role, title, phone, work_start, work_end, working_days")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: true }),
  ]);

  const dbConfig = (dbConfigRow as ClinicDbConfig | null) ?? null;
  const supported = dbConfig?.db_type === "supabase" || dbConfig?.db_type === "google_sheets";

  const [services, absences, appointments] = await Promise.all([
    supported ? getServices(dbConfig) : Promise.resolve(null),
    supported ? getAbsences(dbConfig) : Promise.resolve(null),
    supported ? getClinicAppointments(dbConfig) : Promise.resolve(null),
  ]);

  const now = new Date().getTime();
  const employees: EmployeeView[] = (staff ?? []).map((s) => {
    const id = s.id as string;
    const myServices = (services ?? [])
      .filter((sv) => sv.employee_ids?.includes(id))
      .map((sv) => sv.name);

    const myAbsences = ((absences ?? []) as EmployeeAbsence[]).filter(
      (a) => a.employee_user_id === id
    );

    const myAppts = (appointments ?? []).filter((a) => a.employee_user_id === id);
    const patientKeys = new Set(
      myAppts.map((a) => (a.patient_phone || a.patient_name || "").trim()).filter(Boolean)
    );
    const upcoming = myAppts.filter(
      (a) => a.status === "scheduled" && new Date(a.appointment_time).getTime() > now
    ).length;

    return {
      id,
      name: (s.name as string) || (s.email as string) || "—",
      email: (s.email as string) ?? "",
      role: s.role as string,
      title: (s.title as string | null) ?? null,
      phone: (s.phone as string | null) ?? null,
      work_start: (s.work_start as string | null) ?? null,
      work_end: (s.work_end as string | null) ?? null,
      working_days: (s.working_days as number[] | null) ?? [],
      services: myServices,
      absences: myAbsences,
      patient_count: patientKeys.size,
      upcoming_count: upcoming,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="الموظفون"
        description="دوام كل موظف، الخدمات التي يقدّمها، غيابه، ومرضاه"
      />

      {!supported ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            إدارة دوام الموظفين والغياب متاحة حالياً لعيادات Supabase وGoogle Sheets فقط.
          </CardContent>
        </Card>
      ) : (
        <EmployeesManager clinicId={clinicId} employees={employees} />
      )}
    </div>
  );
}

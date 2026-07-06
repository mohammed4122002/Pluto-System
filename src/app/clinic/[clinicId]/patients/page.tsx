import {
  getClinicAppointments,
  getClinicWithDbConfig,
  derivePatients,
} from "@/lib/clinic-data";
import { requireClinicRole } from "@/lib/auth/require-clinic-role";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { PatientsTable } from "@/components/clinic/PatientsTable";

export default async function ClinicPatientsPage({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  await requireClinicRole(clinicId, ["manager", "secretary", "doctor"]);

  const clinic = await getClinicWithDbConfig(clinicId);
  const appointments = await getClinicAppointments(clinic?.db_config ?? null);
  const patients = appointments ? derivePatients(appointments) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="المرضى"
        description="قائمة المرضى وسجل زياراتهم — تُبنى تلقائياً من المواعيد"
      />
      <Card>
        <CardContent className="p-4">
          {patients === null ? (
            <EmptyState
              title="تعذّر جلب بيانات المرضى"
              description="هذه العيادة تستخدم قاعدة بيانات لا يمكن قراءتها حالياً (SQL Server)."
              className="border-none"
            />
          ) : (
            <PatientsTable patients={patients} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

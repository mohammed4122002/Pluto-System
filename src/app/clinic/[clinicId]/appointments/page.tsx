import Link from "next/link";

import { getClinicAppointments, getClinicWithDbConfig } from "@/lib/clinic-data";
import { requireClinicRole } from "@/lib/auth/require-clinic-role";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { AppointmentRow } from "@/components/clinic/AppointmentRow";
import { ExportButton } from "@/components/shared/ExportButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AppointmentStatus } from "@/types";

const STATUS_AR: Record<AppointmentStatus, string> = {
  scheduled: "مجدول",
  completed: "مكتمل",
  cancelled: "ملغى",
  no_show: "لم يحضر",
};

export default async function ClinicAppointmentsPage({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  await requireClinicRole(clinicId, ["manager", "secretary"]);
  const clinic = await getClinicWithDbConfig(clinicId);
  const appointments = await getClinicAppointments(clinic?.db_config ?? null);

  const exportRows = (appointments ?? []).map((a) => ({
    time: new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(a.appointment_time)),
    patient: a.patient_name ?? "",
    phone: a.patient_phone ?? "",
    status: STATUS_AR[a.status] ?? a.status,
    notes: a.notes ?? "",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="المواعيد"
        description="جميع المواعيد المسجّلة"
        actions={
          <div className="flex items-center gap-2">
            {appointments && appointments.length > 0 ? (
              <ExportButton
                filename="appointments"
                rows={exportRows}
                columns={[
                  { key: "time", label: "الوقت" },
                  { key: "patient", label: "المريض" },
                  { key: "phone", label: "الهاتف" },
                  { key: "status", label: "الحالة" },
                  { key: "notes", label: "ملاحظات" },
                ]}
              />
            ) : null}
            <Button asChild>
              <Link href={`/clinic/${clinicId}/appointments/new`}>إضافة موعد</Link>
            </Button>
          </div>
        }
      />
      <Card>
        <CardContent className="p-0 sm:p-2">
          {appointments === null ? (
            <EmptyState
              title="لا يمكن قراءة المواعيد لهذه العيادة"
              description="هذه العيادة تستخدم SQL Server — تُدار مواعيدها من نظامها الحالي عبر n8n."
              className="border-none"
            />
          ) : appointments.length === 0 ? (
            <EmptyState title="لا توجد مواعيد بعد" className="border-none" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الوقت</TableHead>
                  <TableHead>المريض</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>التذكير</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appointment) => (
                  <AppointmentRow
                    key={appointment.id}
                    clinicId={clinicId}
                    appointment={appointment}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

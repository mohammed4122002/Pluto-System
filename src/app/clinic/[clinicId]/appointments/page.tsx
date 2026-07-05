import Link from "next/link";

import { getClinicAppointments, getClinicWithDbConfig } from "@/lib/clinic-data";
import { requireClinicRole } from "@/lib/auth/require-clinic-role";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { AppointmentRow } from "@/components/clinic/AppointmentRow";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ClinicAppointmentsPage({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  await requireClinicRole(clinicId, ["manager", "secretary"]);
  const clinic = await getClinicWithDbConfig(clinicId);
  const appointments = await getClinicAppointments(clinic?.db_config ?? null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="المواعيد"
        description="جميع المواعيد المسجّلة"
        actions={
          <Button asChild>
            <Link href={`/clinic/${clinicId}/appointments/new`}>إضافة موعد</Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="p-0 sm:p-2">
          {appointments === null ? (
            <EmptyState
              title="لم يتم ربط قاعدة بيانات مباشرة"
              description="هذه العيادة تستخدم SQL Server أو Google Sheets — يتولى n8n قراءة المواعيد مباشرة."
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

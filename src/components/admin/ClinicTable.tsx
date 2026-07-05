import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SubscriptionBadge } from "@/components/admin/SubscriptionBadge";
import { ClinicActionsMenu } from "@/components/admin/ClinicActionsMenu";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Clinic } from "@/types";

export function ClinicTable({ clinics }: { clinics: Clinic[] }) {
  if (clinics.length === 0) {
    return (
      <EmptyState
        title="لا توجد عيادات بعد"
        description="ابدأ بإضافة أول عيادة من زر «إضافة عيادة» أعلى الصفحة."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>العيادة</TableHead>
          <TableHead>الطبيب</TableHead>
          <TableHead>المدينة</TableHead>
          <TableHead>الحالة</TableHead>
          <TableHead>تاريخ الإضافة</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {clinics.map((clinic) => (
          <TableRow key={clinic.id}>
            <TableCell className="font-medium">
              <Link href={`/admin/clinics/${clinic.id}`} className="hover:underline">
                {clinic.name}
              </Link>
            </TableCell>
            <TableCell>{clinic.doctor_name}</TableCell>
            <TableCell>{clinic.city ?? "—"}</TableCell>
            <TableCell>
              <SubscriptionBadge status={clinic.status} />
            </TableCell>
            <TableCell dir="ltr" className="text-end">
              {new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(
                new Date(clinic.created_at)
              )}
            </TableCell>
            <TableCell>
              <ClinicActionsMenu
                clinicId={clinic.id}
                clinicName={clinic.name}
                status={clinic.status}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

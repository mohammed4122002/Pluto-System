import Link from "next/link";
import { CalendarCheck, CheckCircle2, Clock, XCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getClinicAppointments, getClinicReviews, getClinicWithDbConfig } from "@/lib/clinic-data";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { KpiCard } from "@/components/admin/KpiCard";
import { AppointmentRow } from "@/components/clinic/AppointmentRow";
import { RatingStars } from "@/components/clinic/RatingStars";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ClinicDbConfig } from "@/types";

export default async function ClinicTodayPage({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: platformUser } = await supabase
    .from("platform_users")
    .select("role, name")
    .eq("auth_id", user!.id)
    .single();

  const clinic = await getClinicWithDbConfig(clinicId);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const appointments = await getClinicAppointments(clinic?.db_config ?? null, {
    from: startOfDay,
    to: endOfDay,
  });

  const role = platformUser?.role ?? "secretary";
  const greetingName = platformUser?.name ?? "بك";

  const sent = appointments?.filter((a) => a.reminder_sent).length ?? 0;
  const pending = appointments?.filter((a) => !a.reminder_sent && a.patient_phone).length ?? 0;
  const failed = appointments?.filter((a) => !a.reminder_sent && !a.patient_phone).length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`أهلاً ${greetingName} 👋`}
        description="مواعيد اليوم"
        actions={
          role === "secretary" || role === "manager" || role === "owner" ? (
            <Button asChild>
              <Link href={`/clinic/${clinicId}/appointments/new`}>إضافة موعد</Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="مواعيد اليوم" value={appointments?.length ?? 0} icon={CalendarCheck} />
        <KpiCard label="تم إرسال التذكير" value={sent} icon={CheckCircle2} tone="success" />
        <KpiCard label="لم يُرسل بعد" value={pending} icon={Clock} tone="warning" />
        <KpiCard label="فشل في الإرسال" value={failed} icon={XCircle} tone="destructive" />
      </div>

      {role === "doctor" ? (
        <DoctorRatingSummary dbConfig={clinic?.db_config ?? null} />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">مواعيد اليوم</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-2">
          {appointments === null ? (
            <EmptyState
              title="لم يتم ربط قاعدة بيانات مباشرة"
              description="هذه العيادة تستخدم SQL Server أو Google Sheets — يتولى n8n قراءة المواعيد مباشرة. راجع سجل التنفيذ لمتابعة الحالة."
              className="border-none"
            />
          ) : appointments.length === 0 ? (
            <EmptyState title="لا توجد مواعيد اليوم" className="border-none" />
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
                    appointment={appointment}
                    actions={
                      role !== "doctor" ? (
                        <Link
                          href={`/clinic/${clinicId}/appointments`}
                          className="text-sm text-primary hover:underline"
                        >
                          عرض الكل
                        </Link>
                      ) : undefined
                    }
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

async function DoctorRatingSummary({
  dbConfig,
}: {
  dbConfig: ClinicDbConfig | null;
}) {
  const reviews = await getClinicReviews(dbConfig);
  if (!reviews || reviews.length === 0) return null;

  const average = reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">ملخص التقييمات هذا الشهر</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-3xl font-bold" dir="ltr">
            {average.toFixed(1)}
          </p>
          <RatingStars value={average} size="lg" />
          <p className="text-sm text-muted-foreground">({reviews.length} تقييم)</p>
        </div>
        <div className="space-y-2">
          {reviews.slice(0, 5).map((review) => (
            <div key={review.id} className="rounded-md bg-muted p-3 text-sm">
              <RatingStars value={review.stars} size="sm" />
              {review.comment ? <p className="mt-1">{review.comment}</p> : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

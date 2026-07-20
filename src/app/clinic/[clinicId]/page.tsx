import Link from "next/link";
import { CalendarCheck, CheckCircle2, Clock, XCircle } from "lucide-react";

import { CalendarOff, Stethoscope, Users } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getClinicAppointments, getClinicReviews, getClinicWithDbConfig } from "@/lib/clinic-data";
import { getServices, getAbsences } from "@/lib/clinic-services";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { KpiCard } from "@/components/admin/KpiCard";
import { AppointmentRow } from "@/components/clinic/AppointmentRow";
import { RatingStars } from "@/components/clinic/RatingStars";
import { Badge } from "@/components/ui/badge";
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
    .select("id, role, name")
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

  // The next scheduled appointments (from now on). Shown so the landing is
  // never blank when today happens to be empty but the clinic has data.
  const nowDate = new Date();
  const nowTs = nowDate.getTime();
  const upcomingAll = await getClinicAppointments(clinic?.db_config ?? null, {
    from: nowDate,
  });
  const upcoming = (upcomingAll ?? [])
    .filter((a) => a.status === "scheduled" && new Date(a.appointment_time).getTime() > nowTs)
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
    .slice(0, 8);

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

      {(role === "doctor" || role === "secretary") && platformUser?.id ? (
        <EmployeeSelfPanel
          dbConfig={clinic?.db_config ?? null}
          employeeId={platformUser.id as string}
        />
      ) : null}

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
            <EmptyState
              title="لا توجد مواعيد اليوم"
              description={
                upcoming.length > 0
                  ? "لا مواعيد مجدولة لهذا اليوم — تجد مواعيدك القادمة بالأسفل."
                  : "ابدأ بإضافة موعد جديد وستظهر مواعيد اليوم هنا."
              }
              className="border-none"
            />
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
                    readOnly={role === "doctor"}
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

      {upcoming.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">المواعيد القادمة</CardTitle>
            <Link
              href={`/clinic/${clinicId}/appointments`}
              className="text-sm text-primary hover:underline"
            >
              عرض الكل
            </Link>
          </CardHeader>
          <CardContent className="p-0 sm:p-2">
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
                {upcoming.map((appointment) => (
                  <AppointmentRow
                    key={appointment.id}
                    clinicId={clinicId}
                    appointment={appointment}
                    readOnly={role === "doctor"}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

// The employee's own dashboard: the services they provide, their upcoming
// absences, their patient count, and their patients' upcoming appointments.
// "Their" = appointments whose employee_user_id matches this login account.
async function EmployeeSelfPanel({
  dbConfig,
  employeeId,
}: {
  dbConfig: ClinicDbConfig | null;
  employeeId: string;
}) {
  if (!dbConfig || (dbConfig.db_type !== "supabase" && dbConfig.db_type !== "google_sheets")) {
    return null;
  }

  const now = new Date().getTime();
  const [services, absences, appointments] = await Promise.all([
    getServices(dbConfig),
    getAbsences(dbConfig),
    getClinicAppointments(dbConfig),
  ]);

  const myServices = (services ?? [])
    .filter((s) => s.employee_ids?.includes(employeeId))
    .map((s) => s.name);
  const myAbsences = (absences ?? [])
    .filter((a) => a.employee_user_id === employeeId && new Date(a.absence_date).getTime() >= now - 86400000)
    .slice(0, 6);
  const myAppts = (appointments ?? []).filter((a) => a.employee_user_id === employeeId);
  const patientKeys = new Set(
    myAppts.map((a) => (a.patient_phone || a.patient_name || "").trim()).filter(Boolean)
  );
  const upcoming = myAppts
    .filter((a) => a.status === "scheduled" && new Date(a.appointment_time).getTime() > now)
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
    .slice(0, 8);

  const fmt = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("ar-SA", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Riyadh",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="size-4 text-primary" /> خدماتي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {myServices.length ? (
            <div className="flex flex-wrap gap-1.5">
              {myServices.map((s) => (
                <Badge key={s} className="bg-primary/10 text-primary">
                  {s}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">لم يُسنَد لك خدمات بعد.</p>
          )}

          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <Users className="size-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">مرضاي</p>
              <p className="text-xl font-bold" dir="ltr">
                {patientKeys.size}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CalendarOff className="size-3.5" /> غيابي القادم
            </p>
            {myAbsences.length ? (
              <div className="flex flex-wrap gap-1">
                {myAbsences.map((a) => (
                  <Badge key={a.id} variant="outline" className="text-[10px]">
                    {new Intl.DateTimeFormat("ar-SA", {
                      day: "numeric",
                      month: "short",
                      timeZone: "Asia/Riyadh",
                    }).format(new Date(a.absence_date))}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">لا غياب مسجّل.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">مواعيد مرضاي القادمة</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length ? (
            <div className="space-y-2">
              {upcoming.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.patient_name || "—"}</p>
                    {a.patient_phone ? (
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {a.patient_phone}
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">{fmt(a.appointment_time)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              لا مواعيد قادمة مُسنَدة إليك بعد.
            </p>
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

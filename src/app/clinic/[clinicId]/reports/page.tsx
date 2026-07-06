import {
  getClinicAppointments,
  getClinicReviews,
  getClinicWithDbConfig,
} from "@/lib/clinic-data";
import { requireClinicRole } from "@/lib/auth/require-clinic-role";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { KpiCard } from "@/components/admin/KpiCard";
import { AppointmentsTrendChart } from "@/components/clinic/AppointmentsTrendChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  BellRing,
  CalendarCheck,
  CheckCircle2,
  Star,
  UserX,
} from "lucide-react";
import type { Appointment, AppointmentStatus } from "@/types";

const WEEKS = 8;

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; barClass: string }
> = {
  completed: { label: "مكتملة", barClass: "bg-success" },
  scheduled: { label: "مجدولة", barClass: "bg-primary" },
  no_show: { label: "لم يحضر", barClass: "bg-warning" },
  cancelled: { label: "ملغاة", barClass: "bg-destructive" },
};

function weeklyBuckets(appointments: Appointment[]) {
  const now = new Date();
  const buckets: { week: string; count: number }[] = [];

  for (let i = WEEKS - 1; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(now.getDate() - i * 7 - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setDate(now.getDate() - i * 7);
    end.setHours(23, 59, 59, 999);

    const count = appointments.filter((a) => {
      const t = new Date(a.appointment_time);
      return t >= start && t <= end;
    }).length;

    buckets.push({
      week: new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short" }).format(
        start
      ),
      count,
    });
  }

  return buckets;
}

function statusBreakdown(appointments: Appointment[]) {
  const total = appointments.length;
  return (Object.keys(STATUS_CONFIG) as AppointmentStatus[]).map((status) => {
    const count = appointments.filter((a) => a.status === status).length;
    return {
      status,
      count,
      percent: total ? Math.round((count / total) * 100) : 0,
    };
  });
}

const DAY_LABELS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function busiestDays(appointments: Appointment[]) {
  const counts = new Array(7).fill(0);
  for (const a of appointments) {
    const d = new Date(a.appointment_time).getDay();
    if (!Number.isNaN(d)) counts[d] += 1;
  }
  const max = Math.max(1, ...counts);
  return DAY_LABELS.map((label, i) => ({
    label,
    count: counts[i],
    percent: Math.round((counts[i] / max) * 100),
    isPeak: counts[i] === max && counts[i] > 0,
  }));
}

export default async function ClinicReportsPage({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  await requireClinicRole(clinicId, ["manager"]);
  const clinic = await getClinicWithDbConfig(clinicId);

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - WEEKS * 7);

  const appointments = await getClinicAppointments(clinic?.db_config ?? null, {
    from: windowStart,
  });
  const reviews = await getClinicReviews(clinic?.db_config ?? null);

  if (appointments === null || reviews === null) {
    return (
      <div className="space-y-6">
        <PageHeader title="التقارير" />
        <EmptyState
          title="لا يمكن قراءة بيانات هذه العيادة"
          description="التقارير متاحة لعيادات Supabase وGoogle Sheets — عيادات SQL Server تُدار من نظامها الحالي."
        />
      </div>
    );
  }

  const total = appointments.length;
  const completed = appointments.filter((a) => a.status === "completed").length;
  const noShow = appointments.filter((a) => a.status === "no_show").length;
  const remindersSent = appointments.filter((a) => a.reminder_sent).length;

  const completionRate = total ? Math.round((completed / total) * 100) : 0;
  const noShowRate = total ? Math.round((noShow / total) * 100) : 0;
  const reminderRate = total ? Math.round((remindersSent / total) * 100) : 0;
  const averageRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length).toFixed(1)
    : "—";

  const trend = weeklyBuckets(appointments);
  const breakdown = statusBreakdown(appointments);
  const peakDays = busiestDays(appointments);
  const peakDay = peakDays.find((d) => d.isPeak);

  return (
    <div className="space-y-6">
      <PageHeader title="التقارير" description={`آخر ${WEEKS} أسابيع`} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="إجمالي المواعيد" value={total} icon={CalendarCheck} />
        <KpiCard
          label="نسبة الإكمال"
          value={`${completionRate}%`}
          icon={CheckCircle2}
          tone="success"
        />
        <KpiCard
          label="نسبة عدم الحضور"
          value={`${noShowRate}%`}
          icon={UserX}
          tone={noShowRate > 15 ? "destructive" : "warning"}
        />
        <KpiCard label="نجاح التذكيرات" value={`${reminderRate}%`} icon={BellRing} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">حجم المواعيد الأسبوعي</CardTitle>
          </CardHeader>
          <CardContent>
            {total > 0 ? (
              <AppointmentsTrendChart data={trend} />
            ) : (
              <p className="text-sm text-muted-foreground">لا توجد بيانات كافية بعد.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">متوسط التقييم</CardTitle>
          </CardHeader>
          <CardContent className="flex h-full flex-col items-center justify-center gap-1 pb-10">
            <p className="text-4xl font-extrabold" dir="ltr">
              {averageRating}
            </p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="size-3.5 fill-warning text-warning" />
              {reviews.length} تقييم
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            أوقات الذروة (الأيام الأكثر ازدحاماً)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {total === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد مواعيد بعد.</p>
          ) : (
            <>
              {peakDay ? (
                <p className="text-sm text-muted-foreground">
                  أكثر يوم ازدحاماً:{" "}
                  <span className="font-semibold text-foreground">{peakDay.label}</span>{" "}
                  ({peakDay.count} موعد)
                </p>
              ) : null}
              {peakDays.map((d) => (
                <div key={d.label} className="flex items-center gap-3 text-sm">
                  <span className="w-16 shrink-0">{d.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        d.isPeak ? "bg-primary" : "bg-primary/40"
                      )}
                      style={{ width: `${d.percent}%` }}
                    />
                  </div>
                  <span
                    className="w-8 shrink-0 text-end text-muted-foreground"
                    dir="ltr"
                  >
                    {d.count}
                  </span>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">تفصيل حالة المواعيد</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {total === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد مواعيد بعد.</p>
          ) : (
            breakdown.map((row) => (
              <div key={row.status} className="flex items-center gap-3 text-sm">
                <span className="w-20 shrink-0">{STATUS_CONFIG[row.status].label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", STATUS_CONFIG[row.status].barClass)}
                    style={{ width: `${row.percent}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-end text-muted-foreground" dir="ltr">
                  {row.count} ({row.percent}%)
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

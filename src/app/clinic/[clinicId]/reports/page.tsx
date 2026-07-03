import { getClinicAppointments, getClinicReviews, getClinicWithDbConfig } from "@/lib/clinic-data";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { KpiCard } from "@/components/admin/KpiCard";
import { CalendarCheck, CheckCircle2, Star, Users } from "lucide-react";

export default async function ClinicReportsPage({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  const clinic = await getClinicWithDbConfig(clinicId);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const appointments = await getClinicAppointments(clinic?.db_config ?? null, {
    from: thirtyDaysAgo,
  });
  const reviews = await getClinicReviews(clinic?.db_config ?? null);

  if (appointments === null || reviews === null) {
    return (
      <div className="space-y-6">
        <PageHeader title="التقارير" />
        <EmptyState
          title="لم يتم ربط قاعدة بيانات مباشرة"
          description="التقارير متاحة حالياً لعيادات Supabase فقط."
        />
      </div>
    );
  }

  const completed = appointments.filter((a) => a.status === "completed").length;
  const remindersSent = appointments.filter((a) => a.reminder_sent).length;
  const averageRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length).toFixed(1)
    : "—";

  return (
    <div className="space-y-6">
      <PageHeader title="التقارير" description="آخر 30 يوماً" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="إجمالي المواعيد" value={appointments.length} icon={CalendarCheck} />
        <KpiCard label="مواعيد مكتملة" value={completed} icon={Users} tone="success" />
        <KpiCard label="تذكيرات مُرسلة" value={remindersSent} icon={CheckCircle2} />
        <KpiCard label="متوسط التقييم" value={averageRating} icon={Star} tone="warning" />
      </div>
    </div>
  );
}

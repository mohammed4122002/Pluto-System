import Link from "next/link";
import {
  Stethoscope,
  Wallet,
  BellRing,
  Star,
  AlertTriangle,
  Sparkles,
  Plug,
  Database,
  ArrowLeft,
  Workflow,
  CreditCard,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/pricing";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/admin/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Plan } from "@/types";

const WORKFLOW_LABEL_AR: Record<string, string> = {
  reminder: "تذكير موعد",
  rating: "طلب تقييم",
  booking: "حجز",
  webhook: "محادثة واتساب",
};

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    { data: clinics },
    { data: activeSubs },
    { data: expiringSubs },
    { data: failedDbConfigs },
    { count: remindersToday },
    { count: ratingRequestsThisWeek },
    { count: errorsLast24h },
    { count: totalExec7d },
    { count: errorsExec7d },
    { data: recentActivity },
  ] = await Promise.all([
    supabase.from("clinics").select("id, status"),
    supabase.from("subscriptions").select("plan").eq("status", "active"),
    supabase
      .from("subscriptions")
      .select("id, expires_at, clinic:clinics(name)")
      .eq("status", "active")
      .lte("expires_at", in7Days.toISOString().slice(0, 10))
      .gte("expires_at", now.toISOString().slice(0, 10)),
    supabase
      .from("clinic_db_config")
      .select("id, clinic:clinics(name)")
      .eq("test_passed", false),
    supabase
      .from("n8n_execution_log")
      .select("id", { count: "exact", head: true })
      .eq("workflow", "reminder")
      .eq("status", "success")
      .gte("executed_at", todayStart.toISOString()),
    supabase
      .from("n8n_execution_log")
      .select("id", { count: "exact", head: true })
      .eq("workflow", "rating")
      .eq("status", "success")
      .gte("executed_at", weekAgo.toISOString()),
    supabase
      .from("n8n_execution_log")
      .select("id", { count: "exact", head: true })
      .eq("status", "error")
      .gte("executed_at", dayAgo.toISOString()),
    supabase
      .from("n8n_execution_log")
      .select("id", { count: "exact", head: true })
      .gte("executed_at", weekAgo.toISOString()),
    supabase
      .from("n8n_execution_log")
      .select("id", { count: "exact", head: true })
      .eq("status", "error")
      .gte("executed_at", weekAgo.toISOString()),
    // Platform monitoring only — exclude patient conversation (webhook)
    // events; the operator sees automation activity, never chat content.
    supabase
      .from("n8n_execution_log")
      .select("id, workflow, status, executed_at, error_msg, clinic:clinics(name)")
      .neq("workflow", "webhook")
      .order("executed_at", { ascending: false })
      .limit(10),
  ]);

  const successRate7d =
    (totalExec7d ?? 0) > 0
      ? Math.round((1 - (errorsExec7d ?? 0) / (totalExec7d ?? 1)) * 100)
      : 100;

  const totalClinics = clinics?.length ?? 0;
  const activeClinics = clinics?.filter((c) => c.status === "active").length ?? 0;
  const trialClinics = clinics?.filter((c) => c.status === "trial").length ?? 0;
  const suspendedClinics = clinics?.filter((c) => c.status === "suspended").length ?? 0;

  const mrrSar = (activeSubs ?? []).reduce((sum, s) => {
    const plan = PLANS[s.plan as Plan];
    return sum + (plan?.pricePerMonth ?? 0);
  }, 0);

  type Alert = { tone: "warning" | "destructive"; title: string; description: string };
  const alerts: Alert[] = [
    ...(expiringSubs ?? []).map((s) => ({
      tone: "warning" as const,
      title: "اشتراك ينتهي قريباً",
      description: `عيادة "${(s.clinic as { name?: string } | null)?.name ?? "—"}" — ينتهي بتاريخ ${new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "long", timeZone: "Asia/Riyadh" }).format(new Date(s.expires_at))}`,
    })),
    ...((errorsLast24h ?? 0) > 0
      ? [
          {
            tone: "destructive" as const,
            title: "أخطاء في تنفيذ n8n",
            description: `${errorsLast24h} خطأ في آخر 24 ساعة — راجع صفحة مراقبة n8n`,
          },
        ]
      : []),
    ...(failedDbConfigs ?? []).map((d) => ({
      tone: "warning" as const,
      title: "فشل الاتصال بقاعدة بيانات عيادة",
      description: `عيادة "${(d.clinic as { name?: string } | null)?.name ?? "—"}" — تحقق من إعدادات قاعدة البيانات`,
    })),
  ];

  const hasClinics = totalClinics > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="نظرة عامة"
        description={new Intl.DateTimeFormat("ar-SA", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Riyadh",
        }).format(now)}
        actions={
          <Button asChild className="gap-2">
            <Link href="/admin/clinics/new">
              <Sparkles className="size-4" />
              إضافة عيادة
            </Link>
          </Button>
        }
      />

      {!hasClinics && (
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-l from-primary/5 to-transparent">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25">
                <Sparkles className="size-6" />
              </span>
              <div>
                <p className="font-bold">أهلاً بك في MediSync AI 👋</p>
                <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                  لم تُضف أي عيادة بعد. ابدأ بإضافة أول عيادة لتفعيل تذكيرات
                  المواعيد وتقييمات المرضى عبر واتساب تلقائياً.
                </p>
              </div>
            </div>
            <Button asChild size="lg" className="w-full shrink-0 gap-2 sm:w-auto">
              <Link href="/admin/clinics/new">
                ابدأ الآن
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="إجمالي العيادات"
          value={totalClinics}
          icon={Stethoscope}
          hint={`نشط ${activeClinics} · تجريبي ${trialClinics} · موقوف ${suspendedClinics}`}
        />
        <KpiCard
          label="الإيراد الشهري (ر.س)"
          value={mrrSar}
          icon={Wallet}
          tone="success"
        />
        <KpiCard
          label="تذكيرات اليوم"
          value={remindersToday ?? 0}
          icon={BellRing}
        />
        <KpiCard
          label="نجاح الأتمتة (7 أيام)"
          value={`${successRate7d}%`}
          icon={Star}
          tone={successRate7d >= 95 ? "success" : successRate7d >= 80 ? "warning" : "destructive"}
          hint={`${totalExec7d ?? 0} تنفيذ · ${errorsExec7d ?? 0} خطأ · تقييمات ${ratingRequestsThisWeek ?? 0}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/admin/clinics/new">
          <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/40">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Stethoscope className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">إضافة عيادة جديدة</p>
                <p className="text-xs text-muted-foreground">معالج من 5 خطوات</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/n8n">
          <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/40">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Workflow className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">مراقبة n8n</p>
                <p className="text-xs text-muted-foreground">حالة الأتمتة والتنفيذات</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/subscriptions">
          <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/40">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CreditCard className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">الاشتراكات</p>
                <p className="text-xs text-muted-foreground">إدارة خطط العيادات</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-warning" />
              التنبيهات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-success/10 text-success">
                  <Sparkles className="size-5" />
                </span>
                <p className="text-sm text-muted-foreground">
                  لا توجد تنبيهات — كل شيء يعمل بشكل طبيعي.
                </p>
              </div>
            ) : (
              alerts.map((alert, i) => (
                <Alert key={i} variant={alert.tone === "destructive" ? "destructive" : "warning"}>
                  <AlertTriangle />
                  <AlertTitle>{alert.title}</AlertTitle>
                  <AlertDescription>{alert.description}</AlertDescription>
                </Alert>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plug className="size-4 text-primary" />
              النشاط الأخير
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العيادة</TableHead>
                  <TableHead>العملية</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الوقت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!recentActivity || recentActivity.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center">
                      <Database className="mx-auto mb-2 size-6 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        لا يوجد نشاط بعد — سيظهر هنا سجل تنفيذات n8n.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  recentActivity.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {(row.clinic as { name?: string } | null)?.name ?? "—"}
                      </TableCell>
                      <TableCell>{WORKFLOW_LABEL_AR[row.workflow ?? ""] ?? row.workflow}</TableCell>
                      <TableCell>
                        <Badge variant={row.status === "success" ? "success" : "destructive"}>
                          {row.status === "success" ? "نجاح" : "خطأ"}
                        </Badge>
                      </TableCell>
                      <TableCell dir="ltr" className="text-end text-muted-foreground">
                        {new Intl.DateTimeFormat("ar-SA", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Riyadh",
                        }).format(new Date(row.executed_at))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

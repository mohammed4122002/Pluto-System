import { Stethoscope, Wallet, BellRing, Star, AlertTriangle } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/admin/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// TODO(phase-3): replace with live Supabase queries once clinics exist.
const MOCK_KPIS = {
  totalClinics: 0,
  activeClinics: 0,
  trialClinics: 0,
  suspendedClinics: 0,
  mrrSar: 0,
  remindersToday: 0,
  ratingsThisWeek: 0,
};

const MOCK_ALERTS: {
  tone: "warning" | "destructive";
  title: string;
  description: string;
}[] = [];

const MOCK_ACTIVITY: {
  clinic: string;
  workflow: string;
  status: "success" | "error";
  time: string;
}[] = [];

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="نظرة عامة"
        description="ملخص أداء المنصة عبر جميع العيادات"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="إجمالي العيادات"
          value={MOCK_KPIS.totalClinics}
          icon={Stethoscope}
          hint={`نشط ${MOCK_KPIS.activeClinics} · تجريبي ${MOCK_KPIS.trialClinics} · موقوف ${MOCK_KPIS.suspendedClinics}`}
        />
        <KpiCard
          label="الإيراد الشهري (ر.س)"
          value={MOCK_KPIS.mrrSar}
          icon={Wallet}
          tone="success"
        />
        <KpiCard
          label="تذكيرات اليوم"
          value={MOCK_KPIS.remindersToday}
          icon={BellRing}
        />
        <KpiCard
          label="تقييمات هذا الأسبوع"
          value={MOCK_KPIS.ratingsThisWeek}
          icon={Star}
          tone="warning"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">التنبيهات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {MOCK_ALERTS.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد تنبيهات حالياً.</p>
          ) : (
            MOCK_ALERTS.map((alert, i) => (
              <Alert key={i} variant={alert.tone}>
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
          <CardTitle className="text-base">النشاط الأخير</CardTitle>
        </CardHeader>
        <CardContent>
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
              {MOCK_ACTIVITY.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    لا يوجد نشاط بعد.
                  </TableCell>
                </TableRow>
              ) : (
                MOCK_ACTIVITY.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.clinic}</TableCell>
                    <TableCell>{row.workflow}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === "success" ? "success" : "destructive"}>
                        {row.status === "success" ? "نجاح" : "خطأ"}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.time}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

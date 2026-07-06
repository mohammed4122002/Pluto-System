import { getClinicReviews, getClinicWithDbConfig } from "@/lib/clinic-data";
import { requireClinicRole } from "@/lib/auth/require-clinic-role";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { RatingStars } from "@/components/clinic/RatingStars";
import { RatingsTrendChart } from "@/components/clinic/RatingsTrendChart";
import { ExportButton } from "@/components/shared/ExportButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Review } from "@/types";

function maskPhone(phone?: string) {
  if (!phone) return "—";
  return phone.length > 4 ? `${"*".repeat(phone.length - 4)}${phone.slice(-4)}` : phone;
}

function monthlyTrend(reviews: Review[]) {
  const byMonth = new Map<string, { sum: number; count: number }>();
  for (const review of reviews) {
    const key = new Intl.DateTimeFormat("ar-SA", { month: "short" }).format(
      new Date(review.created_at)
    );
    const entry = byMonth.get(key) ?? { sum: 0, count: 0 };
    entry.sum += review.stars;
    entry.count += 1;
    byMonth.set(key, entry);
  }
  return Array.from(byMonth.entries()).map(([month, { sum, count }]) => ({
    month,
    average: Number((sum / count).toFixed(1)),
  }));
}

function distribution(reviews: Review[]) {
  const counts = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.stars === stars).length,
  }));
  return counts.map((c) => ({
    ...c,
    percent: reviews.length ? Math.round((c.count / reviews.length) * 100) : 0,
  }));
}

export default async function ClinicRatingsPage({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  await requireClinicRole(clinicId, ["manager", "doctor"]);
  const clinic = await getClinicWithDbConfig(clinicId);
  const reviews = await getClinicReviews(clinic?.db_config ?? null);

  if (reviews === null) {
    return (
      <div className="space-y-6">
        <PageHeader title="التقييمات" />
        <EmptyState
          title="لم يتم ربط قاعدة بيانات مباشرة"
          description="هذه العيادة تستخدم SQL Server أو Google Sheets."
        />
      </div>
    );
  }

  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length
    : 0;
  const trend = monthlyTrend(reviews);
  const dist = distribution(reviews);

  const exportRows = reviews.map((r) => ({
    date: new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(
      new Date(r.created_at)
    ),
    stars: r.stars,
    phone: maskPhone(r.patient_phone),
    comment: r.comment ?? "",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="التقييمات"
        description={`${reviews.length} تقييم`}
        actions={
          reviews.length > 0 ? (
            <ExportButton
              filename="ratings"
              rows={exportRows}
              columns={[
                { key: "date", label: "التاريخ" },
                { key: "stars", label: "النجوم" },
                { key: "phone", label: "الهاتف" },
                { key: "comment", label: "التعليق" },
              ]}
            />
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">متوسط التقييم</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <p className="text-4xl font-bold" dir="ltr">
              {average.toFixed(1)}
            </p>
            <RatingStars value={average} size="lg" />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">التوزيع الشهري</CardTitle>
          </CardHeader>
          <CardContent>
            {trend.length > 0 ? (
              <RatingsTrendChart data={trend} />
            ) : (
              <p className="text-sm text-muted-foreground">لا توجد بيانات كافية بعد.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">توزيع النجوم</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {dist.map((d) => (
            <div key={d.stars} className="flex items-center gap-3 text-sm">
              <span className="w-10 shrink-0" dir="ltr">
                {d.stars}★
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-warning" style={{ width: `${d.percent}%` }} />
              </div>
              <span className="w-10 shrink-0 text-end text-muted-foreground" dir="ltr">
                {d.percent}%
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">جميع التقييمات</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-2">
          {reviews.length === 0 ? (
            <EmptyState title="لا توجد تقييمات بعد" className="border-none" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>التقييم</TableHead>
                  <TableHead>التعليق</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell dir="ltr">{maskPhone(review.patient_phone)}</TableCell>
                    <TableCell>
                      <RatingStars value={review.stars} size="sm" />
                    </TableCell>
                    <TableCell className="max-w-sm truncate">{review.comment ?? "—"}</TableCell>
                    <TableCell dir="ltr" className="text-end">
                      {new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(
                        new Date(review.created_at)
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

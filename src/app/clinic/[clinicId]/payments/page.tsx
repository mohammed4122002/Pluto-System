import { Wallet, Clock, CheckCircle2 } from "lucide-react";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { requireClinicRole } from "@/lib/auth/require-clinic-role";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/admin/KpiCard";
import { PaymentReviewList, type PayRow } from "@/components/clinic/PaymentReviewList";

export default async function PaymentsPage({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  await requireClinicRole(clinicId, ["manager", "secretary"]);

  const { data } = await getAdminSupabase()
    .from("unified_appointments")
    .select(
      "id, patient_name, patient_phone, appointment_time, deposit_amount, payment_method, payment_proof_url, payment_status, payment_updated_at"
    )
    .eq("clinic_id", clinicId)
    .eq("deleted", false)
    .neq("payment_status", "none")
    .order("payment_status", { ascending: true })
    .order("appointment_time", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as PayRow[];
  const pending = rows.filter((r) => r.payment_status === "pending").length;
  const paid = rows.filter((r) => r.payment_status === "paid").length;
  const paidTotal = rows
    .filter((r) => r.payment_status === "paid")
    .reduce((sum, r) => sum + (Number(r.deposit_amount) || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="مراجعة المدفوعات"
        description="راجع مقدّمات الحجوزات المحوّلة وأكّدها أو ارفضها"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="بانتظار المراجعة"
          value={pending}
          icon={Clock}
          tone={pending > 0 ? "warning" : "success"}
        />
        <KpiCard label="مدفوعات مؤكّدة" value={paid} icon={CheckCircle2} tone="success" />
        <KpiCard
          label="إجمالي المقدّمات المؤكّدة"
          value={paidTotal}
          icon={Wallet}
          tone="default"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الطلبات</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentReviewList clinicId={clinicId} initialRows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}

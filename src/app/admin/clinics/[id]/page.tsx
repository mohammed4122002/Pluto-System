import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { SubscriptionBadge } from "@/components/admin/SubscriptionBadge";
import { ClinicActionsMenu } from "@/components/admin/ClinicActionsMenu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Clinic } from "@/types";

export default async function ClinicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: clinic } = await supabase
    .from("clinics")
    .select(
      "*, channels:clinic_channels(*), db_config:clinic_db_config(*), automation:clinic_automation(*), subscription:subscriptions(*)"
    )
    .eq("id", id)
    .single();

  if (!clinic) notFound();

  const typedClinic = clinic as Clinic;

  return (
    <div className="space-y-6">
      <PageHeader
        title={typedClinic.name}
        description={typedClinic.doctor_name}
        actions={
          <div className="flex items-center gap-2">
            <SubscriptionBadge status={typedClinic.status} />
            <ClinicActionsMenu
              clinicId={typedClinic.id}
              clinicName={typedClinic.name}
              status={typedClinic.status}
              redirectOnDelete="/admin/clinics"
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">المعلومات الأساسية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow label="المعرّف" value={typedClinic.clinic_key} dir="ltr" />
            <InfoRow label="التخصص" value={typedClinic.specialty} />
            <InfoRow label="المدينة" value={typedClinic.city} />
            <InfoRow label="العنوان" value={typedClinic.address} />
            <InfoRow label="الهاتف" value={typedClinic.phone} dir="ltr" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">الاشتراك</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {typedClinic.subscription ? (
              <>
                <InfoRow label="الخطة" value={typedClinic.subscription.plan} />
                <InfoRow
                  label="السعر"
                  value={`${typedClinic.subscription.price_sar} ر.س`}
                  dir="ltr"
                />
                <InfoRow label="ينتهي في" value={typedClinic.subscription.expires_at} dir="ltr" />
              </>
            ) : (
              <p className="text-muted-foreground">لا يوجد اشتراك مسجّل</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">قنوات التواصل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {typedClinic.channels && typedClinic.channels.length > 0 ? (
              typedClinic.channels.map((ch) => (
                <div key={ch.id}>
                  <p className="font-medium">{ch.channel}</p>
                  <p className="text-muted-foreground" dir="ltr">
                    {ch.verified ? "متصل ✅" : "غير متحقق منه"}
                  </p>
                  <Separator className="mt-2" />
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">لا توجد قنوات مسجّلة</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">قاعدة البيانات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow label="النوع" value={typedClinic.db_config?.db_type} dir="ltr" />
            <InfoRow
              label="آخر اختبار"
              value={
                typedClinic.db_config?.test_passed === true
                  ? "ناجح ✅"
                  : typedClinic.db_config?.test_passed === false
                    ? "فشل ❌"
                    : "لم يُختبر بعد"
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  dir,
}: {
  label: string;
  value?: string | null;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span dir={dir}>{value || "—"}</span>
    </div>
  );
}

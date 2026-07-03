import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { ClinicSettingsForm } from "@/components/clinic/ClinicSettingsForm";
import type { ClinicAutomation } from "@/types";

export default async function ClinicSettingsPage({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("clinic_automation")
    .select("*")
    .eq("clinic_id", clinicId)
    .single();

  return (
    <div className="space-y-6">
      <PageHeader title="إعدادات العيادة" description="التذكيرات وطلبات التقييم وساعات العمل" />
      <Card>
        <CardContent className="p-6">
          <ClinicSettingsForm clinicId={clinicId} automation={data as ClinicAutomation | null} />
        </CardContent>
      </Card>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { requireClinicRole } from "@/lib/auth/require-clinic-role";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClinicSettingsForm } from "@/components/clinic/ClinicSettingsForm";
import { ClinicInfoForm } from "@/components/clinic/ClinicInfoForm";
import { ClinicStaffManager } from "@/components/admin/ClinicStaffManager";
import { PaymentMethodsManager } from "@/components/clinic/PaymentMethodsManager";
import type { Clinic, ClinicAutomation, ClinicPaymentMethod } from "@/types";

export default async function ClinicSettingsPage({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  await requireClinicRole(clinicId, ["manager"]);
  const supabase = await createClient();

  const [{ data: clinic }, { data: automation }, { data: staff }, { data: paymentMethods }] =
    await Promise.all([
      supabase.from("clinics").select("*").eq("id", clinicId).single(),
      supabase.from("clinic_automation").select("*").eq("clinic_id", clinicId).single(),
      // Staff listing needs the admin client: platform_users RLS only exposes
      // the caller's own row to non-owners. The manager role check above gates
      // access to this page.
      getAdminSupabase()
        .from("platform_users")
        .select("id, name, email, role, is_active, created_at")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: true }),
      getAdminSupabase()
        .from("clinic_payment_methods")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="إعدادات العيادة"
        description="معلومات العيادة، أوقات العمل، طرق الدفع، والموظفون — كل التحكم من مكان واحد"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">معلومات العيادة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {clinic ? <ClinicInfoForm clinic={clinic as Clinic} /> : null}
          <p className="text-xs text-muted-foreground">
            أطباء العيادة وخدماتها وأسعارها يقرأها المساعد الذكي مباشرةً من صفحتَي
            «الموظفون» و«الخدمات» — لا حاجة لكتابتها هنا.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">أوقات العمل والتذكيرات والتقييم</CardTitle>
        </CardHeader>
        <CardContent>
          <ClinicSettingsForm
            clinicId={clinicId}
            automation={automation as ClinicAutomation | null}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">طرق الدفع</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentMethodsManager
            clinicId={clinicId}
            initialMethods={(paymentMethods ?? []) as ClinicPaymentMethod[]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الموظفون</CardTitle>
        </CardHeader>
        <CardContent>
          <ClinicStaffManager clinicId={clinicId} initialStaff={staff ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}

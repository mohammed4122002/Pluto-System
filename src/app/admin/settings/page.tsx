import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <PageHeader title="إعدادات الحساب" description="بيانات حساب مالك المنصة" />
      <Card>
        <CardContent className="space-y-2 p-6 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">البريد الإلكتروني</span>
            <span dir="ltr">{user?.email}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

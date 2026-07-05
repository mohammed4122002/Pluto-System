import { KeyRound } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { ChangePasswordDialog } from "@/components/shared/ChangePasswordDialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
        <CardHeader>
          <CardTitle className="text-base">معلومات الحساب</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">البريد الإلكتروني</span>
            <span dir="ltr">{user?.email}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">آخر تسجيل دخول</span>
            <span dir="ltr">
              {user?.last_sign_in_at
                ? new Intl.DateTimeFormat("ar-SA", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(user.last_sign_in_at))
                : "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الأمان</CardTitle>
          <CardDescription>غيّر كلمة مرور حسابك دورياً للحفاظ على أمان المنصة.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordDialog
            trigger={
              <Button variant="outline" className="gap-2">
                <KeyRound className="size-4" />
                تغيير كلمة المرور
              </Button>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

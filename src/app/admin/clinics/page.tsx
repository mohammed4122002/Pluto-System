import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { ClinicTable } from "@/components/admin/ClinicTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Clinic } from "@/types";

export default async function AdminClinicsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clinics")
    .select("*")
    .order("created_at", { ascending: false });

  const clinics = (data ?? []) as Clinic[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="العيادات"
        description="جميع العيادات المسجلة على المنصة"
        actions={
          <Button asChild>
            <Link href="/admin/clinics/new">إضافة عيادة</Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="p-0 sm:p-2">
          <ClinicTable clinics={clinics} />
        </CardContent>
      </Card>
    </div>
  );
}

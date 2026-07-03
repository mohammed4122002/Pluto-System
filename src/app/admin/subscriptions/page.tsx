import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PLANS } from "@/lib/pricing";
import type { Plan } from "@/types";

interface SubscriptionRow {
  id: string;
  plan: Plan;
  price_sar: number;
  starts_at: string;
  expires_at: string;
  status: "active" | "expired" | "cancelled";
  clinic: { name: string } | null;
}

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("id, plan, price_sar, starts_at, expires_at, status, clinic:clinics(name)")
    .order("expires_at", { ascending: true });

  const subscriptions = (data ?? []) as unknown as SubscriptionRow[];

  return (
    <div className="space-y-6">
      <PageHeader title="الاشتراكات" description="إدارة اشتراكات جميع العيادات" />
      <Card>
        <CardContent className="p-0 sm:p-2">
          {subscriptions.length === 0 ? (
            <EmptyState
              title="لا توجد اشتراكات بعد"
              description="ستظهر الاشتراكات هنا بعد إضافة أول عيادة."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العيادة</TableHead>
                  <TableHead>الخطة</TableHead>
                  <TableHead>السعر</TableHead>
                  <TableHead>ينتهي في</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>{sub.clinic?.name ?? "—"}</TableCell>
                    <TableCell>{PLANS[sub.plan].label}</TableCell>
                    <TableCell dir="ltr" className="text-end">
                      {sub.price_sar} ر.س
                    </TableCell>
                    <TableCell dir="ltr" className="text-end">
                      {sub.expires_at}
                    </TableCell>
                    <TableCell>{sub.status}</TableCell>
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

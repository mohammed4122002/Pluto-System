import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function RemindersLogPage({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("n8n_execution_log")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("workflow", "reminder")
    .order("executed_at", { ascending: false })
    .limit(100);

  const logs = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="سجل التذكيرات" description="آخر 100 عملية تذكير مرسلة" />
      <Card>
        <CardContent className="p-0 sm:p-2">
          {logs.length === 0 ? (
            <EmptyState
              title="لا يوجد سجل تذكيرات بعد"
              description="سيظهر هنا كل تذكير يرسله n8n بعد تفعيل سير العمل."
              className="border-none"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الرسالة</TableHead>
                  <TableHead>الوقت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant={log.status === "success" ? "success" : "destructive"}>
                        {log.status === "success" ? "نجاح" : "خطأ"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate">{log.error_msg ?? "—"}</TableCell>
                    <TableCell dir="ltr" className="text-end">
                      {new Intl.DateTimeFormat("ar-SA", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(log.executed_at))}
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

"use client";

import { useQuery } from "@tanstack/react-query";

import { N8nStatusCard } from "@/components/admin/N8nStatusCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
}

interface N8nExecution {
  id: string;
  workflowId: string;
  status?: "success" | "error";
  startedAt: string;
}

export function N8nMonitor() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["n8n-status"],
    queryFn: async () => {
      const res = await fetch("/api/n8n/status");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "تعذر الاتصال بـ n8n");
      return json as { workflows: { data: N8nWorkflow[] }; executions: { data: N8nExecution[] } };
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="لم يتم إعداد n8n بعد"
        description="أضف N8N_BASE_URL و N8N_API_KEY في متغيرات البيئة لعرض حالة سير العمل."
      />
    );
  }

  const workflows = data?.workflows?.data ?? [];
  const executions = data?.executions?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workflows.map((wf) => (
          <N8nStatusCard key={wf.id} name={wf.name} active={wf.active} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">آخر 50 خطأ</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>سير العمل</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الوقت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions
                .filter((e) => e.status === "error")
                .slice(0, 50)
                .map((exec) => (
                  <TableRow key={exec.id}>
                    <TableCell>{exec.workflowId}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">خطأ</Badge>
                    </TableCell>
                    <TableCell dir="ltr" className="text-end">
                      {exec.startedAt}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

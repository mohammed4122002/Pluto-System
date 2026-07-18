import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function N8nStatusCard({
  name,
  active,
  lastExecutedAt,
  status,
}: {
  name: string;
  active: boolean;
  lastExecutedAt?: string;
  status?: "success" | "error";
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{name}</CardTitle>
        <Badge variant={active ? "success" : "secondary"}>
          {active ? "مفعّل" : "متوقف"}
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          آخر تنفيذ:{" "}
          {lastExecutedAt
            ? new Intl.DateTimeFormat("ar-SA", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Riyadh",
              }).format(new Date(lastExecutedAt))
            : "—"}
        </p>
        {status ? (
          <Badge
            variant={status === "success" ? "success" : "destructive"}
            className="mt-2"
          >
            {status === "success" ? "نجاح" : "خطأ"}
          </Badge>
        ) : null}
      </CardContent>
    </Card>
  );
}

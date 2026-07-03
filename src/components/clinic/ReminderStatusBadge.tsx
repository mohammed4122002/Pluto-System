import { Badge } from "@/components/ui/badge";

export type ReminderStatus = "sent" | "pending" | "failed";

const CONFIG: Record<ReminderStatus, { label: string; variant: "success" | "secondary" | "destructive" }> = {
  sent: { label: "✅ أُرسل", variant: "success" },
  pending: { label: "⏳ سيُرسل", variant: "secondary" },
  failed: { label: "❌ فشل الإرسال", variant: "destructive" },
};

export function ReminderStatusBadge({
  status,
  detail,
}: {
  status: ReminderStatus;
  detail?: string;
}) {
  const config = CONFIG[status];
  return (
    <Badge variant={config.variant}>
      {config.label}
      {detail ? ` ${detail}` : ""}
    </Badge>
  );
}

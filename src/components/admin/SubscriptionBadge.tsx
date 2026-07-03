import { Badge } from "@/components/ui/badge";
import type { ClinicStatus } from "@/types";

const STATUS_CONFIG: Record<
  ClinicStatus,
  { label: string; variant: "success" | "secondary" | "warning" | "destructive" }
> = {
  trial: { label: "تجريبي", variant: "secondary" },
  active: { label: "نشط", variant: "success" },
  suspended: { label: "موقوف", variant: "warning" },
  expired: { label: "منتهي", variant: "destructive" },
};

export function SubscriptionBadge({ status }: { status: ClinicStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

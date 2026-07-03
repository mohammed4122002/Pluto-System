import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  trend,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  hint?: string;
  trend?: { value: string; direction: "up" | "down" };
  tone?: "default" | "success" | "warning" | "destructive";
}) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              tone === "success" && "bg-success/15 text-success",
              tone === "warning" && "bg-warning/15 text-warning",
              tone === "destructive" && "bg-destructive/15 text-destructive",
              tone === "default" && "bg-primary/10 text-primary"
            )}
          >
            <Icon className="size-5" />
          </div>
          {trend ? (
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                trend.direction === "up"
                  ? "bg-success/15 text-success"
                  : "bg-destructive/15 text-destructive"
              )}
            >
              {trend.direction === "up" ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              <span dir="ltr">{trend.value}</span>
            </span>
          ) : null}
        </div>
        <p dir="ltr" className="mt-3 text-end text-3xl font-extrabold tracking-tight">
          {value}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
        {hint ? (
          <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

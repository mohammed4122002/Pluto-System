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
    <Card className="overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-brand">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl shadow-brand-sm ring-inset-highlight",
              tone === "success" && "bg-gradient-to-br from-success/90 to-success text-white",
              tone === "warning" && "bg-gradient-to-br from-warning/90 to-warning text-white",
              tone === "destructive" && "bg-gradient-to-br from-destructive/90 to-destructive text-white",
              tone === "default" && "bg-gradient-to-br from-primary/90 to-primary text-primary-foreground"
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

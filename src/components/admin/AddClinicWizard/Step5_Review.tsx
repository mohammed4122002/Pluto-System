"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PLANS } from "@/lib/pricing";
import type { Plan } from "@/types";
import type { StepProps } from "./types";

const PLAN_ORDER: Plan[] = ["monthly", "quarterly", "annual"];

export function Step5_Review({ data, update }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PLAN_ORDER.map((plan) => {
          const info = PLANS[plan];
          return (
            <button
              key={plan}
              type="button"
              onClick={() => update({ plan })}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-xl border p-6 text-center transition-colors",
                data.plan === plan
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent"
              )}
            >
              {info.badge ? (
                <Badge className="absolute -top-2" variant="warning">
                  {info.badge} ⭐
                </Badge>
              ) : null}
              <p className="font-semibold">{info.label}</p>
              <p dir="ltr" className="text-2xl font-bold">
                {info.pricePerMonth}
                <span className="text-sm font-normal text-muted-foreground"> ر.س / شهر</span>
              </p>
              <p className="text-xs text-muted-foreground" dir="ltr">
                {info.totalSar} ر.س {info.months > 1 ? "مرة واحدة" : ""}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>تاريخ البدء</Label>
          <Input
            type="date"
            value={data.starts_at}
            onChange={(e) => update({ starts_at: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>ملاحظة الدفع</Label>
          <Input
            value={data.payment_note}
            onChange={(e) => update({ payment_note: e.target.value })}
            placeholder="تحويل بنكي رقم 123"
          />
        </div>
      </div>

      <ReviewSummary data={data} />
    </div>
  );
}

function ReviewSummary({ data }: { data: StepProps["data"] }) {
  const info = PLANS[data.plan];
  const expires = new Date(data.starts_at);
  expires.setMonth(expires.getMonth() + info.months);

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
      <p className="font-medium">{data.name || "—"} · {data.doctor_name || "—"}</p>
      <p className="mt-1 text-muted-foreground">
        الخطة: {info.label} · الإجمالي: {info.totalSar} ر.س · ينتهي في{" "}
        {new Intl.DateTimeFormat("ar-SA", {
          dateStyle: "medium",
          timeZone: "Asia/Riyadh",
        }).format(expires)}
      </p>
    </div>
  );
}

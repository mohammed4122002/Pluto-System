"use client";

import { useState } from "react";
import { BellRing, Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function StaffNotifyCard({
  code,
  linked,
}: {
  code: string;
  linked: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-start"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <BellRing className="size-4 text-primary" />
          تنبيهات تيليجرام عند تصعيد محادثة
          {linked ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
              مفعّل
            </Badge>
          ) : (
            <Badge variant="outline">غير مفعّل</Badge>
          )}
        </span>
        <span className="text-xs text-muted-foreground">{open ? "إخفاء" : "إظهار"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3 border-t border-border/60 pt-3 text-sm text-muted-foreground">
          <p>
            لتصلك تنبيهات على تيليجرام عندما يحوّل المساعد الذكي محادثة إليك: افتح
            بوت العيادة على تيليجرام وأرسل له هذا الرمز مرة واحدة.
          </p>
          <div className="flex items-center gap-2">
            <code
              dir="ltr"
              className="flex-1 truncate rounded-md bg-muted px-3 py-2 text-xs"
            >
              {code}
            </code>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(code);
                toast.success("تم نسخ الرمز");
              }}
            >
              <Copy className="size-4" />
            </Button>
          </div>
          {linked && (
            <p className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Check className="size-4" /> حسابك مربوط — ستصلك التنبيهات.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

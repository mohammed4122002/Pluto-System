"use client";

import { useRef } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StepProps } from "./types";

const VARIABLES = [
  { token: "{اسم_المريض}", sample: "أحمد محمد" },
  { token: "{اسم_الطبيب}", sample: "د. سالم" },
  { token: "{الوقت_المتبقي}", sample: "ساعتين" },
  { token: "{وقت_الموعد}", sample: "05:00 م" },
  { token: "{عنوان_العيادة}", sample: "الرياض، حي النخيل" },
];

function preview(template: string) {
  return VARIABLES.reduce(
    (text, v) => text.replaceAll(v.token, v.sample),
    template
  );
}

export function Step4_Automation({ data, update }: StepProps) {
  const reminderRef = useRef<HTMLTextAreaElement>(null);
  const automation = data.automation;

  function patch(patch: Partial<typeof automation>) {
    update({ automation: { ...automation, ...patch } });
  }

  function insertVariable(token: string) {
    const el = reminderRef.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const current = automation.reminder_message_ar ?? "";
    const next = current.slice(0, start) + token + current.slice(end);
    patch({ reminder_message_ar: next });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">تذكير الموعد</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-xs">
            <Label>عدد الساعات قبل الموعد</Label>
            <Input
              type="number"
              value={automation.reminder_hours_before ?? 2}
              onChange={(e) => patch({ reminder_hours_before: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label>نص الرسالة</Label>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLES.map((v) => (
                <button
                  key={v.token}
                  type="button"
                  onClick={() => insertVariable(v.token)}
                  className="rounded-md border border-border bg-muted px-2 py-1 text-xs hover:bg-accent"
                >
                  {v.token}
                </button>
              ))}
            </div>
            <textarea
              ref={reminderRef}
              rows={4}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={automation.reminder_message_ar ?? ""}
              onChange={(e) => patch({ reminder_message_ar: e.target.value })}
              placeholder="مرحباً {اسم_المريض}، تذكير بموعدك مع {اسم_الطبيب} خلال {الوقت_المتبقي} الساعة {وقت_الموعد} في {عنوان_العيادة}."
            />
          </div>

          {automation.reminder_message_ar ? (
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="mb-1 text-xs text-muted-foreground">معاينة:</p>
              {preview(automation.reminder_message_ar)}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">طلب التقييم بعد الزيارة</CardTitle>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={automation.rating_enabled ?? true}
              onChange={(e) => patch({ rating_enabled: e.target.checked })}
            />
            تفعيل
          </label>
        </CardHeader>
        {automation.rating_enabled ? (
          <CardContent className="space-y-4">
            <div className="space-y-2 max-w-xs">
              <Label>عدد الساعات بعد انتهاء الموعد</Label>
              <Input
                type="number"
                value={automation.rating_delay_hours ?? 1}
                onChange={(e) => patch({ rating_delay_hours: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>نص رسالة طلب التقييم</Label>
              <textarea
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={automation.rating_message_ar ?? ""}
                onChange={(e) => patch({ rating_message_ar: e.target.value })}
                placeholder="شكراً لزيارتك {اسم_الطبيب}! يرجى تقييم تجربتك من 1 إلى 5."
              />
            </div>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ساعات العمل</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 max-w-sm">
          <div className="space-y-2">
            <Label>من</Label>
            <Input
              type="time"
              value={automation.working_hours_start ?? "08:00"}
              onChange={(e) => patch({ working_hours_start: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>إلى</Label>
            <Input
              type="time"
              value={automation.working_hours_end ?? "20:00"}
              onChange={(e) => patch({ working_hours_end: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

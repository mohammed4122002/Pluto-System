"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateAutomation } from "@/app/clinic/[clinicId]/settings/actions";
import type { ClinicAutomation } from "@/types";

// The exact tokens the reminder/rating cron workflows substitute (n8n
// .replaceAll calls) — must match those literally or a chip would insert a
// placeholder that never gets filled in.
const REMINDER_VARS = [
  { token: "{اسم_المريض}", label: "اسم المريض" },
  { token: "{اسم_الطبيب}", label: "اسم الطبيب" },
  { token: "{وقت_الموعد}", label: "وقت الموعد" },
  { token: "{الوقت_المتبقي}", label: "الوقت المتبقي" },
  { token: "{عنوان_العيادة}", label: "عنوان العيادة" },
];
const RATING_VARS = [
  { token: "{اسم_المريض}", label: "اسم المريض" },
  { token: "{اسم_الطبيب}", label: "اسم الطبيب" },
];

function TemplateTextarea({
  id,
  name,
  defaultValue,
  variables,
}: {
  id: string;
  name: string;
  defaultValue: string;
  variables: { token: string; label: string }[];
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(defaultValue);

  function insertVar(token: string) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {variables.map((v) => (
          <button
            key={v.token}
            type="button"
            onClick={() => insertVar(v.token)}
            className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs text-primary transition-colors hover:bg-primary/10"
            title={v.token}
          >
            + {v.label}
          </button>
        ))}
      </div>
      <textarea
        ref={ref}
        id={id}
        name={name}
        rows={3}
        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}

export function ClinicSettingsForm({
  clinicId,
  automation,
}: {
  clinicId: string;
  automation: ClinicAutomation | null;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await updateAutomation(clinicId, formData);
        toast.success("تم حفظ الإعدادات");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reminder_hours_before">ساعات التذكير قبل الموعد</Label>
          <Input
            id="reminder_hours_before"
            name="reminder_hours_before"
            type="number"
            defaultValue={automation?.reminder_hours_before ?? 2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rating_delay_hours">ساعات طلب التقييم بعد الموعد</Label>
          <Input
            id="rating_delay_hours"
            name="rating_delay_hours"
            type="number"
            defaultValue={automation?.rating_delay_hours ?? 1}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reminder_message_ar">نص رسالة التذكير</Label>
        <p className="text-xs text-muted-foreground">
          اضغط على أي متغيّر لإدراجه في مكان المؤشر — يستبدله النظام تلقائياً بالقيمة الفعلية عند الإرسال.
        </p>
        <TemplateTextarea
          id="reminder_message_ar"
          name="reminder_message_ar"
          defaultValue={automation?.reminder_message_ar ?? ""}
          variables={REMINDER_VARS}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rating_message_ar">نص رسالة طلب التقييم</Label>
        <p className="text-xs text-muted-foreground">
          اضغط على أي متغيّر لإدراجه في مكان المؤشر — يستبدله النظام تلقائياً بالقيمة الفعلية عند الإرسال.
        </p>
        <TemplateTextarea
          id="rating_message_ar"
          name="rating_message_ar"
          defaultValue={automation?.rating_message_ar ?? ""}
          variables={RATING_VARS}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="rating_enabled"
          defaultChecked={automation?.rating_enabled ?? true}
        />
        تفعيل طلب التقييم
      </label>

      <div className="grid grid-cols-2 gap-4 max-w-sm">
        <div className="space-y-2">
          <Label htmlFor="working_hours_start">من</Label>
          <Input
            id="working_hours_start"
            name="working_hours_start"
            type="time"
            defaultValue={automation?.working_hours_start ?? "08:00"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="working_hours_end">إلى</Label>
          <Input
            id="working_hours_end"
            name="working_hours_end"
            type="time"
            defaultValue={automation?.working_hours_end ?? "20:00"}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border/60 p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="deposit_enabled"
            defaultChecked={automation?.deposit_enabled ?? false}
          />
          طلب مقدّم (deposit) لتأكيد الحجز
        </label>
        <div className="max-w-xs space-y-2">
          <Label htmlFor="deposit_amount">قيمة المقدّم</Label>
          <Input
            id="deposit_amount"
            name="deposit_amount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={automation?.deposit_amount ?? 0}
          />
          <p className="text-xs text-muted-foreground">
            يُطلب من المريض تحويله عبر طرق الدفع أدناه وإرسال صورة الإثبات لتأكيد الحجز.
          </p>
        </div>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
      </Button>
    </form>
  );
}

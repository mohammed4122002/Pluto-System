"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveAiInfo } from "@/app/clinic/[clinicId]/settings/actions";
import {
  EMPTY_AI_INFO,
  SAMPLE_AI_INFO,
  type AiInfoForm,
  type AiInfoService,
} from "@/lib/ai-info";

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function AiInfoDialog({
  clinicId,
  initialForm,
  hasContent,
}: {
  clinicId: string;
  initialForm: AiInfoForm | null;
  hasContent: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<AiInfoForm>(
    initialForm ?? (hasContent ? EMPTY_AI_INFO : SAMPLE_AI_INFO)
  );

  function patch(p: Partial<AiInfoForm>) {
    setForm((f) => ({ ...f, ...p }));
  }
  function setService(i: number, key: keyof AiInfoService, v: string) {
    setForm((f) => ({
      ...f,
      services: f.services.map((s, idx) => (idx === i ? { ...s, [key]: v } : s)),
    }));
  }
  function addService() {
    setForm((f) => ({ ...f, services: [...f.services, { name: "", price: "", note: "" }] }));
  }
  function removeService(i: number) {
    setForm((f) => ({ ...f, services: f.services.filter((_, idx) => idx !== i) }));
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await saveAiInfo(clinicId, form);
        toast.success("تم حفظ معلومات المساعد الذكي");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "حدث خطأ");
      }
    });
  }

  const serviceCount = form.services.filter((s) => s.name.trim()).length;

  return (
    <div className="space-y-2">
      <Label>معلومات المساعد الذكي</Label>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/70 bg-muted/30 p-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Bot className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {hasContent ? (
              <span className="flex items-center gap-2">
                معبّأة
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                  {serviceCount} خدمة
                </Badge>
              </span>
            ) : (
              "لم تُضف بعد"
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            الخدمات والأسعار، أوقات العمل، التأمين، وتعليمات المرضى — يستخدمها البوت للرد.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          {hasContent ? "تعديل" : "إضافة معلومات"}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>معلومات المساعد الذكي</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Services */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">الخدمات والأسعار</h4>
                <Button type="button" variant="ghost" size="sm" onClick={() => patch(SAMPLE_AI_INFO)}>
                  <Sparkles className="size-4" />
                  أمثلة جاهزة
                </Button>
              </div>
              <div className="space-y-2">
                {form.services.map((s, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                    <Input
                      value={s.name}
                      onChange={(e) => setService(i, "name", e.target.value)}
                      placeholder="اسم الخدمة"
                    />
                    <Input
                      value={s.price}
                      onChange={(e) => setService(i, "price", e.target.value)}
                      placeholder="السعر ₪"
                      className="w-24"
                    />
                    <Input
                      value={s.note}
                      onChange={(e) => setService(i, "note", e.target.value)}
                      placeholder="ملاحظة (للجلسة/يبدأ من)"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeService(i)}
                      aria-label="حذف"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addService}>
                <Plus className="size-4" />
                إضافة خدمة
              </Button>
            </section>

            <section className="space-y-3 border-t border-border/60 pt-4">
              <h4 className="text-sm font-semibold">أوقات العمل والتأمين</h4>
              <Field
                label="أيام وساعات العمل"
                value={form.working_hours}
                onChange={(v) => patch({ working_hours: v })}
                placeholder="السبت – الخميس: 9 صباحاً – 5 مساءً · الجمعة: إجازة"
              />
              <Field
                label="سياسة التأمين"
                value={form.insurance}
                onChange={(v) => patch({ insurance: v })}
                placeholder="لا نتعامل مع تأمين طبي — الدفع نقداً أو تحويل"
              />
            </section>

            <section className="space-y-3 border-t border-border/60 pt-4">
              <h4 className="text-sm font-semibold">تعليمات المرضى</h4>
              <Field
                label="تعليمات الحضور"
                value={form.prep}
                onChange={(v) => patch({ prep: v })}
                placeholder="الحضور بدون مكياج قبل جلسات البشرة والليزر"
              />
              <Field
                label="تجنّب الشمس"
                value={form.sun}
                onChange={(v) => patch({ sun: v })}
                placeholder="تجنّب الشمس المباشرة قبل وبعد الليزر بيومين"
              />
              <Field
                label="فترة ظهور النتائج"
                value={form.results}
                onChange={(v) => patch({ results: v })}
                placeholder="نتائج الفيلر والبوتوكس تظهر خلال 3–7 أيام"
              />
            </section>

            <section className="space-y-3 border-t border-border/60 pt-4">
              <h4 className="text-sm font-semibold">سياسة المواعيد</h4>
              <Field
                label="سياسة الإلغاء"
                value={form.cancel_policy}
                onChange={(v) => patch({ cancel_policy: v })}
                placeholder="الإلغاء قبل الموعد بـ 3 ساعات على الأقل"
              />
              <Field
                label="سياسة التأخير"
                value={form.late_policy}
                onChange={(v) => patch({ late_policy: v })}
                placeholder="التأخر أكثر من 15 دقيقة قد يؤجّل الموعد"
              />
            </section>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="button" onClick={handleSave} disabled={isPending}>
              {isPending ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

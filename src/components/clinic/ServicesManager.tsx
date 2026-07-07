"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, Pencil, Plus, Stethoscope, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { saveService, removeService } from "@/app/clinic/[clinicId]/services/actions";
import type { Service } from "@/types";

interface Employee {
  id: string;
  name: string;
  role: string;
}

const ROLE_AR: Record<string, string> = {
  manager: "مدير",
  doctor: "طبيب",
  secretary: "سكرتيرة",
};

interface DraftState {
  id?: string;
  name: string;
  description: string;
  duration_minutes: string;
  price: string;
  active: boolean;
  employee_ids: string[];
}

const EMPTY_DRAFT: DraftState = {
  name: "",
  description: "",
  duration_minutes: "30",
  price: "",
  active: true,
  employee_ids: [],
};

export function ServicesManager({
  clinicId,
  initialServices,
  employees,
  loadFailed,
}: {
  clinicId: string;
  initialServices: Service[];
  employees: Employee[];
  loadFailed: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const empName = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employees) m.set(e.id, e.name);
    return m;
  }, [employees]);

  function openAdd() {
    setDraft(EMPTY_DRAFT);
    setOpen(true);
  }
  function openEdit(s: Service) {
    setDraft({
      id: s.id,
      name: s.name,
      description: s.description ?? "",
      duration_minutes: String(s.duration_minutes ?? 30),
      price: s.price != null ? String(s.price) : "",
      active: s.active,
      employee_ids: s.employee_ids ?? [],
    });
    setOpen(true);
  }

  function toggleEmployee(id: string) {
    setDraft((d) => ({
      ...d,
      employee_ids: d.employee_ids.includes(id)
        ? d.employee_ids.filter((x) => x !== id)
        : [...d.employee_ids, id],
    }));
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await saveService(clinicId, {
          id: draft.id,
          name: draft.name,
          description: draft.description,
          duration_minutes: Number(draft.duration_minutes) || 30,
          price: draft.price,
          active: draft.active,
          employee_ids: draft.employee_ids,
        });
        toast.success(draft.id ? "تم تحديث الخدمة" : "تمت إضافة الخدمة");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "حدث خطأ");
      }
    });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      try {
        await removeService(clinicId, id);
        toast.success("تم حذف الخدمة");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "حدث خطأ");
      } finally {
        setDeletingId(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {initialServices.length} خدمة مسجّلة
        </p>
        <Button type="button" onClick={openAdd}>
          <Plus className="size-4" />
          إضافة خدمة
        </Button>
      </div>

      {loadFailed ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            تعذّر تحميل الخدمات حالياً. لعيادات Google Sheets تُقرأ البيانات عبر خدمة
            الأتمتة (n8n) — تأكد من أنها متاحة (لم تتجاوز حد التنفيذ) ثم أعد المحاولة.
          </CardContent>
        </Card>
      ) : initialServices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Stethoscope className="size-5" />
            </span>
            <p className="text-sm font-medium">لا توجد خدمات بعد</p>
            <p className="text-xs text-muted-foreground">
              أضف خدمات العيادة وحدّد الموظفين الذين يقدّمونها.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {initialServices.map((s) => (
            <Card key={s.id} className={cn(!s.active && "opacity-60")}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold">{s.name}</p>
                      {!s.active && (
                        <Badge variant="secondary" className="text-[10px]">
                          موقوفة
                        </Badge>
                      )}
                    </div>
                    {s.description ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {s.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => openEdit(s)}
                      aria-label="تعديل"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      disabled={isPending && deletingId === s.id}
                      onClick={() => handleDelete(s.id)}
                      aria-label="حذف"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" />
                    <span dir="ltr">{s.duration_minutes}</span> دقيقة
                  </span>
                  {s.price != null && (
                    <span className="font-medium text-foreground">
                      <span dir="ltr">{s.price}</span> ₪
                    </span>
                  )}
                </div>

                <div className="flex items-start gap-1.5 border-t border-border/60 pt-2">
                  <Users className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  {s.employee_ids && s.employee_ids.length ? (
                    <div className="flex flex-wrap gap-1">
                      {s.employee_ids.map((id) => (
                        <Badge key={id} variant="secondary" className="text-[10px]">
                          {empName.get(id) ?? "موظف محذوف"}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">لم يُسنَد لأي موظف</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? "تعديل خدمة" : "إضافة خدمة"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>اسم الخدمة</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="تنظيف بشرة عميق"
              />
            </div>
            <div className="space-y-1.5">
              <Label>الوصف (اختياري)</Label>
              <Input
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="نبذة قصيرة عن الخدمة"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>المدة (دقيقة)</Label>
                <Input
                  type="number"
                  dir="ltr"
                  value={draft.duration_minutes}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, duration_minutes: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>السعر (₪)</Label>
                <Input
                  type="number"
                  dir="ltr"
                  value={draft.price}
                  onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                  placeholder="اختياري"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>الموظفون الذين يقدّمون الخدمة</Label>
              {employees.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  لا يوجد موظفون — أضِفهم من صفحة الموظفين أولاً.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {employees.map((e) => {
                    const selected = draft.employee_ids.includes(e.id);
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => toggleEmployee(e.id)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-accent"
                        )}
                      >
                        {e.name}
                        <span className="ms-1 text-[10px] opacity-70">
                          {ROLE_AR[e.role] ?? e.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={draft.active}
                onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
              />
              خدمة فعّالة (تظهر للحجز)
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="button" onClick={handleSave} disabled={isPending || !draft.name.trim()}>
              {isPending ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

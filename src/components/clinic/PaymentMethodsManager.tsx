"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, CreditCard } from "lucide-react";
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
import type { ClinicPaymentMethod, PaymentMethodType } from "@/types";

const TYPE_LABEL: Record<PaymentMethodType, string> = {
  vodafone_cash: "فودافون كاش",
  instapay: "إنستاباي",
  visa: "فيزا / بطاقة",
  bank: "تحويل بنكي",
  cash: "نقداً",
  other: "أخرى",
};

export function PaymentMethodsManager({
  clinicId,
  initialMethods,
}: {
  clinicId: string;
  initialMethods: ClinicPaymentMethod[];
}) {
  const router = useRouter();
  const [methods, setMethods] = useState<ClinicPaymentMethod[]>(initialMethods);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleAdd(formData: FormData) {
    setBusy(true);
    try {
      const res = await fetch(`/api/clinic/${clinicId}/payment-methods`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_ar: String(formData.get("name_ar") ?? ""),
          type: String(formData.get("type") ?? "vodafone_cash"),
          account_ref: String(formData.get("account_ref") ?? ""),
          instructions: String(formData.get("instructions") ?? ""),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "فشل الإضافة");
      setMethods((m) => [...m, json.method]);
      toast.success("تمت إضافة طريقة الدفع");
      setAddOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الإضافة");
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const prev = methods;
    setMethods((m) => m.map((x) => (x.id === id ? { ...x, ...body } : x)));
    try {
      const res = await fetch(`/api/clinic/${clinicId}/payment-methods/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "فشل التحديث");
    } catch (e) {
      setMethods(prev);
      toast.error(e instanceof Error ? e.message : "فشل التحديث");
    }
  }

  async function remove(id: string) {
    const prev = methods;
    setMethods((m) => m.filter((x) => x.id !== id));
    try {
      const res = await fetch(`/api/clinic/${clinicId}/payment-methods/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "فشل الحذف");
      toast.success("تم حذف طريقة الدفع");
    } catch (e) {
      setMethods(prev);
      toast.error(e instanceof Error ? e.message : "فشل الحذف");
    }
  }

  return (
    <>
      <div className="space-y-3">
        {methods.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            لا توجد طرق دفع بعد — أضِف فودافون كاش، إنستاباي، فيزا، أو غيرها.
          </p>
        ) : (
          methods.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
            >
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="size-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {m.name_ar}{" "}
                    <Badge variant="secondary" className="ms-1 text-[11px]">
                      {TYPE_LABEL[m.type]}
                    </Badge>
                  </p>
                  {m.account_ref ? (
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {m.account_ref}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={m.is_enabled}
                    onChange={(e) => patch(m.id, { is_enabled: e.target.checked })}
                  />
                  مفعّل
                </label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={m.show_in_bot}
                    onChange={(e) => patch(m.id, { show_in_bot: e.target.checked })}
                  />
                  يعرضه البوت
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive"
                  onClick={() => remove(m.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))
        )}

        <Button type="button" variant="outline" className="w-full" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          إضافة طريقة دفع
        </Button>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة طريقة دفع</DialogTitle>
          </DialogHeader>
          <form action={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name_ar">الاسم الظاهر</Label>
                <Input id="name_ar" name="name_ar" required placeholder="فودافون كاش" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">النوع</Label>
                <select
                  id="type"
                  name="type"
                  defaultValue="vodafone_cash"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="vodafone_cash">فودافون كاش</option>
                  <option value="instapay">إنستاباي</option>
                  <option value="visa">فيزا / بطاقة</option>
                  <option value="bank">تحويل بنكي</option>
                  <option value="cash">نقداً</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="account_ref">الرقم / الحساب (يظهر للمريض)</Label>
                <Input id="account_ref" name="account_ref" dir="ltr" placeholder="01000000000" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="instructions">تعليمات (اختياري)</Label>
                <Input
                  id="instructions"
                  name="instructions"
                  placeholder="حوّل المبلغ ثم أرسل صورة الإيصال"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={busy}>
                إلغاء
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                إضافة
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

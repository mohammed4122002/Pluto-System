"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createAppointment } from "@/app/clinic/[clinicId]/appointments/new/actions";
import type { Service } from "@/types";

interface Employee {
  id: string;
  name: string;
}

export function AppointmentForm({
  clinicId,
  services = [],
  employees = [],
}: {
  clinicId: string;
  services?: Service[];
  employees?: Employee[];
}) {
  const [isPending, startTransition] = useTransition();
  const [serviceId, setServiceId] = useState("");

  // Only employees who perform the chosen service are selectable; before a
  // service is picked, any employee can be assigned.
  const eligibleEmployees = useMemo(() => {
    if (!serviceId) return employees;
    const svc = services.find((s) => s.id === serviceId);
    if (!svc?.employee_ids?.length) return employees;
    return employees.filter((e) => svc.employee_ids!.includes(e.id));
  }, [serviceId, services, employees]);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await createAppointment(clinicId, formData);
      } catch (err) {
        const digest = (err as { digest?: string })?.digest ?? "";
        if (digest.startsWith("NEXT_REDIRECT")) throw err;
        toast.error(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
      }
    });
  }

  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <form action={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="patient_name">اسم المريض</Label>
        <Input id="patient_name" name="patient_name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="patient_phone">هاتف المريض (واتساب)</Label>
        <Input id="patient_phone" name="patient_phone" dir="ltr" placeholder="9665XXXXXXXX" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="service_id">الخدمة</Label>
        <select
          id="service_id"
          name="service_id"
          className={selectClass}
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
        >
          <option value="">— بدون خدمة محددة —</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.price != null ? ` — ${s.price} ₪` : ""}
            </option>
          ))}
        </select>
        {services.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            لا توجد خدمات مضافة بعد — أضِفها من صفحة «الخدمات».
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="employee_user_id">الموظف</Label>
        <select id="employee_user_id" name="employee_user_id" className={selectClass}>
          <option value="">— بدون تحديد —</option>
          {eligibleEmployees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        {serviceId && eligibleEmployees.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            لا يوجد موظف مُسنَد لهذه الخدمة — عيّنه من صفحة «الخدمات».
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">التاريخ</Label>
        <Input id="date" name="date" type="date" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="time">الوقت</Label>
        <Input id="time" name="time" type="time" required />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="notes">ملاحظات</Label>
        <Input id="notes" name="notes" />
      </div>
      <Button type="submit" disabled={isPending} className="sm:col-span-2">
        {isPending ? "جارٍ الحفظ..." : "حفظ الموعد"}
      </Button>
    </form>
  );
}

"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createAppointment } from "@/app/clinic/[clinicId]/appointments/new/actions";

export function AppointmentForm({ clinicId }: { clinicId: string }) {
  const [isPending, startTransition] = useTransition();

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

"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateClinicInfo } from "@/app/clinic/[clinicId]/settings/actions";
import type { Clinic } from "@/types";

export function ClinicInfoForm({ clinic }: { clinic: Clinic }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await updateClinicInfo(clinic.id, formData);
        toast.success("تم حفظ معلومات العيادة");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">اسم العيادة</Label>
          <Input id="name" name="name" required defaultValue={clinic.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="doctor_name">اسم الطبيب</Label>
          <Input id="doctor_name" name="doctor_name" required defaultValue={clinic.doctor_name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="specialty">التخصص</Label>
          <Input id="specialty" name="specialty" defaultValue={clinic.specialty ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">المدينة</Label>
          <Input id="city" name="city" defaultValue={clinic.city ?? ""} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">العنوان</Label>
          <Input id="address" name="address" defaultValue={clinic.address ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">هاتف العيادة</Label>
          <Input id="phone" name="phone" dir="ltr" defaultValue={clinic.phone ?? ""} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ai_info_text">معلومات إضافية للمساعد الذكي</Label>
        <textarea
          id="ai_info_text"
          name="ai_info_text"
          rows={7}
          defaultValue={clinic.ai_info_text ?? ""}
          placeholder={
            "اكتب هنا أي معلومات تريد أن يعرفها المساعد الذكي ويجيب بها المرضى:\n" +
            "• الخدمات والأسعار\n• شركات التأمين المقبولة\n• تعليمات الوصول والمواقف\n" +
            "• أيام الإجازات\n• أي شيء آخر يسأل عنه المرضى عادةً"
          }
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          المساعد الذكي في واتساب وتيليجرام يقرأ هذا النص ويستخدمه للرد على استفسارات
          المرضى — كلما كتبت تفاصيل أكثر كانت إجاباته أدق.
        </p>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "جارٍ الحفظ..." : "حفظ معلومات العيادة"}
      </Button>
    </form>
  );
}

"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugifyClinicKey } from "@/lib/utils";
import type { StepProps } from "./types";

export function Step1_Info({ data, update }: StepProps) {
  const [keyEdited, setKeyEdited] = useState(false);

  function handleNameChange(name: string) {
    update({
      name,
      clinic_key: keyEdited ? data.clinic_key : slugifyClinicKey(name),
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="name">اسم العيادة *</Label>
        <Input
          id="name"
          value={data.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="عيادة د. أحمد لطب الأسنان"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="doctor_name">اسم الطبيب *</Label>
        <Input
          id="doctor_name"
          value={data.doctor_name}
          onChange={(e) => update({ doctor_name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="specialty">التخصص</Label>
        <Input
          id="specialty"
          value={data.specialty}
          onChange={(e) => update({ specialty: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">المدينة</Label>
        <Input
          id="city"
          value={data.city}
          onChange={(e) => update({ city: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">الهاتف</Label>
        <Input
          id="phone"
          dir="ltr"
          value={data.phone}
          onChange={(e) => update({ phone: e.target.value })}
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="address">العنوان (يظهر في رسائل واتساب)</Label>
        <Input
          id="address"
          value={data.address}
          onChange={(e) => update({ address: e.target.value })}
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="clinic_key">المعرّف الفريد (clinic_key)</Label>
        <Input
          id="clinic_key"
          dir="ltr"
          value={data.clinic_key}
          onChange={(e) => {
            setKeyEdited(true);
            update({ clinic_key: e.target.value });
          }}
        />
        <p className="text-xs text-muted-foreground">
          يُستخدم داخل n8n لتمييز العيادة — يُولَّد تلقائياً من الاسم ويمكن تعديله.
        </p>
      </div>
    </div>
  );
}

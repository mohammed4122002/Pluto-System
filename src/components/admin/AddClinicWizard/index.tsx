"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Step1_Info } from "./Step1_Info";
import { Step2_Channels } from "./Step2_Channels";
import { Step3_Database } from "./Step3_Database";
import { Step4_Automation } from "./Step4_Automation";
import { Step5_Review } from "./Step5_Review";
import { EMPTY_FORM_DATA } from "./types";

const STEPS = [
  { title: "المعلومات الأساسية", component: Step1_Info },
  { title: "قنوات التواصل", component: Step2_Channels },
  { title: "قاعدة البيانات", component: Step3_Database },
  { title: "الأتمتة", component: Step4_Automation },
  { title: "الاشتراك", component: Step5_Review },
];

export function AddClinicWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState(EMPTY_FORM_DATA);
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState<{ clinicId: string } | null>(null);

  function update(patch: Partial<typeof data>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  const isLastStep = step === STEPS.length - 1;
  const StepComponent = STEPS[step].component;

  function canProceed() {
    if (step === 0) return Boolean(data.name && data.doctor_name && data.clinic_key);
    return true;
  }

  async function handleLaunch() {
    setLaunching(true);
    try {
      const clinicRes = await fetch("/api/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          doctor_name: data.doctor_name,
          specialty: data.specialty,
          city: data.city,
          address: data.address,
          phone: data.phone,
          clinic_key: data.clinic_key,
        }),
      });
      const clinicJson = await clinicRes.json();
      if (!clinicRes.ok) throw new Error(clinicJson.error ?? "فشل إنشاء العيادة");
      const clinicId = clinicJson.clinic.id as string;

      await Promise.all([
        fetch("/api/clinic-channels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clinic_id: clinicId, channels: data.channels }),
        }),
        fetch("/api/clinic-db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clinic_id: clinicId, ...data.db_config }),
        }),
        fetch("/api/clinic-automation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clinic_id: clinicId, ...data.automation }),
        }),
        fetch("/api/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clinic_id: clinicId,
            plan: data.plan,
            starts_at: data.starts_at,
            payment_note: data.payment_note,
          }),
        }),
      ]);

      setLaunched({ clinicId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setLaunching(false);
    }
  }

  if (launched) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
          <CheckCircle2 className="size-12 text-success" />
          <h2 className="text-lg font-semibold">تم إطلاق العيادة بنجاح</h2>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>✅ تم إنشاء العيادة</li>
            <li>✅ تم تسجيل قنوات التواصل</li>
            <li>✅ تم حفظ إعدادات الأتمتة والاشتراك</li>
          </ul>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => router.push(`/admin/clinics/${launched.clinicId}`)}>
              فتح صفحة العيادة
            </Button>
            <Button variant="outline" onClick={() => router.push("/admin/clinics")}>
              العودة لقائمة العيادات
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <ol className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-success text-white"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {i + 1}
            </div>
            <span className={cn("hidden text-sm sm:inline", i === step && "font-medium")}>
              {s.title}
            </span>
            {i < STEPS.length - 1 ? <div className="h-px flex-1 bg-border" /> : null}
          </li>
        ))}
      </ol>

      <Card>
        <CardContent className="p-6">
          <StepComponent data={data} update={update} />
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          السابق
        </Button>
        {isLastStep ? (
          <Button type="button" onClick={handleLaunch} disabled={launching}>
            {launching ? <Loader2 className="size-4 animate-spin" /> : null}
            إطلاق العيادة
          </Button>
        ) : (
          <Button
            type="button"
            disabled={!canProceed()}
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
          >
            التالي
          </Button>
        )}
      </div>
    </div>
  );
}

"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireClinicRole } from "@/lib/auth/require-clinic-role";

export async function updateClinicInfo(clinicId: string, formData: FormData) {
  await requireClinicRole(clinicId, ["manager"]);
  const supabase = await createClient();

  // .select() so an RLS-filtered update (0 rows) surfaces as an error instead
  // of a silent no-op success.
  const { data, error } = await supabase
    .from("clinics")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      doctor_name: String(formData.get("doctor_name") ?? "").trim(),
      specialty: String(formData.get("specialty") ?? "").trim() || null,
      city: String(formData.get("city") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      ai_info_text: String(formData.get("ai_info_text") ?? "").trim() || null,
    })
    .eq("id", clinicId)
    .select("id");

  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("تعذّر الحفظ — لا تملك صلاحية تعديل هذه العيادة");

  revalidatePath(`/clinic/${clinicId}/settings`);
  revalidatePath(`/clinic/${clinicId}`);
}

export async function updateAutomation(clinicId: string, formData: FormData) {
  await requireClinicRole(clinicId, ["manager"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clinic_automation")
    .update({
      reminder_hours_before: Number(formData.get("reminder_hours_before")),
      reminder_message_ar: String(formData.get("reminder_message_ar") ?? ""),
      rating_enabled: formData.get("rating_enabled") === "on",
      rating_delay_hours: Number(formData.get("rating_delay_hours")),
      rating_message_ar: String(formData.get("rating_message_ar") ?? ""),
      working_hours_start: String(formData.get("working_hours_start") ?? "08:00"),
      working_hours_end: String(formData.get("working_hours_end") ?? "20:00"),
    })
    .eq("clinic_id", clinicId)
    .select("id");

  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("تعذّر الحفظ — لا تملك صلاحية تعديل هذه العيادة");

  revalidatePath(`/clinic/${clinicId}/settings`);
}

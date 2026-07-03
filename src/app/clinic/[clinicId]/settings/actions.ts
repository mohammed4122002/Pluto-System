"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function updateAutomation(clinicId: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
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
    .eq("clinic_id", clinicId);

  if (error) throw new Error(error.message);

  revalidatePath(`/clinic/${clinicId}/settings`);
}

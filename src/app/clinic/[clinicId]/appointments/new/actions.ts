"use server";

import { redirect } from "next/navigation";

import { getClinicWithDbConfig } from "@/lib/clinic-data";
import { createClinicSupabaseClient } from "@/lib/db-adapters/supabase";
import { requireClinicRole } from "@/lib/auth/require-clinic-role";

export async function createAppointment(clinicId: string, formData: FormData) {
  await requireClinicRole(clinicId, ["manager", "secretary"]);
  const clinic = await getClinicWithDbConfig(clinicId);

  if (!clinic?.db_config || clinic.db_config.db_type !== "supabase") {
    throw new Error(
      "إضافة المواعيد مباشرة متاحة فقط لعيادات Supabase — لعيادات SQL Server وGoogle Sheets أضِف الموعد من نظامك الحالي."
    );
  }

  const client = createClinicSupabaseClient(clinic.db_config);

  const patient_name = String(formData.get("patient_name") ?? "");
  const patient_phone = String(formData.get("patient_phone") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const notes = String(formData.get("notes") ?? "");

  const { error } = await client.from("appointments").insert({
    patient_name,
    patient_phone,
    appointment_time: new Date(`${date}T${time}`).toISOString(),
    notes: notes || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/clinic/${clinicId}/appointments`);
}

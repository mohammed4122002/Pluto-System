"use server";

import { revalidatePath } from "next/cache";

import { getClinicWithDbConfig } from "@/lib/clinic-data";
import { createClinicSupabaseClient } from "@/lib/db-adapters/supabase";
import { requireClinicRole } from "@/lib/auth/require-clinic-role";
import type { AppointmentStatus } from "@/types";

async function getWritableClient(clinicId: string) {
  const clinic = await getClinicWithDbConfig(clinicId);
  if (!clinic?.db_config || clinic.db_config.db_type !== "supabase") {
    throw new Error(
      "تعديل المواعيد مباشرة متاح فقط لعيادات Supabase — لعيادات SQL Server وGoogle Sheets عدّل الموعد من نظامك الحالي."
    );
  }
  return createClinicSupabaseClient(clinic.db_config);
}

function revalidateAppointmentPaths(clinicId: string) {
  revalidatePath(`/clinic/${clinicId}`);
  revalidatePath(`/clinic/${clinicId}/appointments`);
  revalidatePath(`/clinic/${clinicId}/reports`);
}

export async function updateAppointmentStatus(
  clinicId: string,
  appointmentId: string,
  status: AppointmentStatus
) {
  await requireClinicRole(clinicId, ["manager", "secretary"]);
  const client = await getWritableClient(clinicId);

  const { error } = await client
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId);

  if (error) throw new Error(error.message);

  revalidateAppointmentPaths(clinicId);
}

export async function updateAppointmentDetails(
  clinicId: string,
  appointmentId: string,
  formData: FormData
) {
  await requireClinicRole(clinicId, ["manager", "secretary"]);
  const client = await getWritableClient(clinicId);

  const patient_name = String(formData.get("patient_name") ?? "");
  const patient_phone = String(formData.get("patient_phone") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const notes = String(formData.get("notes") ?? "");

  const { error } = await client
    .from("appointments")
    .update({
      patient_name,
      patient_phone,
      appointment_time: new Date(`${date}T${time}`).toISOString(),
      notes: notes || null,
    })
    .eq("id", appointmentId);

  if (error) throw new Error(error.message);

  revalidateAppointmentPaths(clinicId);
}

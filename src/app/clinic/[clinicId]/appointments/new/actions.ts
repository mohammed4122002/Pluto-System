"use server";

import { redirect } from "next/navigation";

import { getClinicWithDbConfig } from "@/lib/clinic-data";
import { createClinicSupabaseClient } from "@/lib/db-adapters/supabase";
import { writeSheetsAppointment } from "@/lib/db-adapters/sheets";
import { requireClinicRole } from "@/lib/auth/require-clinic-role";

export async function createAppointment(clinicId: string, formData: FormData) {
  await requireClinicRole(clinicId, ["manager", "secretary"]);
  const clinic = await getClinicWithDbConfig(clinicId);

  if (!clinic?.db_config || clinic.db_config.db_type === "sql_server") {
    throw new Error(
      "إضافة المواعيد من الداشبورد متاحة لعيادات Supabase وGoogle Sheets — لعيادات SQL Server أضِف الموعد من نظامك الحالي."
    );
  }

  const patient_name = String(formData.get("patient_name") ?? "");
  const patient_phone = String(formData.get("patient_phone") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const notes = String(formData.get("notes") ?? "");
  const appointment_time = new Date(`${date}T${time}`).toISOString();

  if (clinic.db_config.db_type === "google_sheets") {
    await writeSheetsAppointment({
      clinicId,
      op: "insert",
      patient_name,
      patient_phone,
      appointment_time,
      notes,
    });
    redirect(`/clinic/${clinicId}/appointments`);
  }

  const client = createClinicSupabaseClient(clinic.db_config);
  const { error } = await client.from("appointments").insert({
    patient_name,
    patient_phone,
    appointment_time,
    notes: notes || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/clinic/${clinicId}/appointments`);
}

"use server";

import { redirect } from "next/navigation";

import { getClinicWithDbConfig } from "@/lib/clinic-data";
import { createClinicSupabaseClient } from "@/lib/db-adapters/supabase";
import { writeSheetsAppointment } from "@/lib/db-adapters/sheets";
import { requireClinicRole } from "@/lib/auth/require-clinic-role";

// Returns an error result on failure (Next.js redacts thrown server-action
// messages in production); redirects on success.
export async function createAppointment(
  clinicId: string,
  formData: FormData
): Promise<{ ok: false; error: string } | void> {
  await requireClinicRole(clinicId, ["manager", "secretary"]);
  const clinic = await getClinicWithDbConfig(clinicId);

  if (!clinic?.db_config || clinic.db_config.db_type === "sql_server") {
    return {
      ok: false,
      error:
        "إضافة المواعيد من الداشبورد متاحة لعيادات Supabase وGoogle Sheets — لعيادات SQL Server أضِف الموعد من نظامك الحالي.",
    };
  }

  const patient_name = String(formData.get("patient_name") ?? "");
  const patient_phone = String(formData.get("patient_phone") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const notes = String(formData.get("notes") ?? "");
  const service_id = String(formData.get("service_id") ?? "").trim() || null;
  const employee_user_id = String(formData.get("employee_user_id") ?? "").trim() || null;
  const appointment_time = new Date(`${date}T${time}`).toISOString();

  try {
    if (clinic.db_config.db_type === "google_sheets") {
      await writeSheetsAppointment({
        clinicId,
        op: "insert",
        patient_name,
        patient_phone,
        appointment_time,
        notes,
        service_id,
        employee_user_id,
      });
    } else {
      const client = createClinicSupabaseClient(clinic.db_config);
      const { error } = await client.from("appointments").insert({
        patient_name,
        patient_phone,
        appointment_time,
        notes: notes || null,
        service_id,
        employee_user_id,
      });
      if (error) throw new Error(error.message);
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "تعذّر حفظ الموعد" };
  }

  redirect(`/clinic/${clinicId}/appointments`);
}

"use server";

import { revalidatePath } from "next/cache";

import { getClinicWithDbConfig } from "@/lib/clinic-data";
import { createClinicSupabaseClient } from "@/lib/db-adapters/supabase";
import { writeSheetsAppointment } from "@/lib/db-adapters/sheets";
import { requireClinicRole } from "@/lib/auth/require-clinic-role";
import type { AppointmentStatus } from "@/types";

// Actions return a result object instead of throwing (Next.js redacts thrown
// server-action error messages in production).
export type ActionResult = { ok: true } | { ok: false; error: string };

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
): Promise<ActionResult> {
  await requireClinicRole(clinicId, ["manager", "secretary"]);
  try {
    const clinic = await getClinicWithDbConfig(clinicId);

    if (clinic?.db_config?.db_type === "google_sheets") {
      await writeSheetsAppointment({
        clinicId,
        op: "update_status",
        id: appointmentId,
        status,
      });
      revalidateAppointmentPaths(clinicId);
      return { ok: true };
    }

    const client = await getWritableClient(clinicId);
    const { error } = await client
      .from("appointments")
      .update({ status })
      .eq("id", appointmentId);
    if (error) throw new Error(error.message);

    revalidateAppointmentPaths(clinicId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

export async function updateAppointmentDetails(
  clinicId: string,
  appointmentId: string,
  formData: FormData
): Promise<ActionResult> {
  await requireClinicRole(clinicId, ["manager", "secretary"]);
  try {
    const clinic = await getClinicWithDbConfig(clinicId);

    const patient_name = String(formData.get("patient_name") ?? "");
    const patient_phone = String(formData.get("patient_phone") ?? "");
    const date = String(formData.get("date") ?? "");
    const time = String(formData.get("time") ?? "");
    const notes = String(formData.get("notes") ?? "");
    const appointment_time = new Date(`${date}T${time}`).toISOString();

    if (clinic?.db_config?.db_type === "google_sheets") {
      await writeSheetsAppointment({
        clinicId,
        op: "update_details",
        id: appointmentId,
        patient_name,
        patient_phone,
        appointment_time,
        notes,
      });
      revalidateAppointmentPaths(clinicId);
      return { ok: true };
    }

    const client = await getWritableClient(clinicId);
    const { error } = await client
      .from("appointments")
      .update({
        patient_name,
        patient_phone,
        appointment_time,
        notes: notes || null,
      })
      .eq("id", appointmentId);
    if (error) throw new Error(error.message);

    revalidateAppointmentPaths(clinicId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
  }
}

"use server";

import { revalidatePath } from "next/cache";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { requireClinicRole } from "@/lib/auth/require-clinic-role";
import { addAbsence, deleteAbsence } from "@/lib/clinic-services";
import type { ClinicDbConfig } from "@/types";

async function loadDbConfig(clinicId: string): Promise<ClinicDbConfig> {
  const { data } = await getAdminSupabase()
    .from("clinic_db_config")
    .select("*")
    .eq("clinic_id", clinicId)
    .single();
  if (!data) throw new Error("لم يتم إعداد قاعدة بيانات لهذه العيادة");
  return data as ClinicDbConfig;
}

// Server actions return a result object instead of throwing so the client
// gets our real Arabic message (Next.js redacts thrown server-action errors
// in production).
export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(e: unknown): ActionResult {
  return { ok: false, error: e instanceof Error ? e.message : "حدث خطأ غير متوقع" };
}

// The employee schedule lives on the login account (platform_users, owner
// project). Managers edit it through the admin client after the role gate;
// the affected row is verified to belong to this clinic first.
export async function updateEmployeeSchedule(
  clinicId: string,
  employeeId: string,
  payload: { work_start: string | null; work_end: string | null; working_days: number[] }
): Promise<ActionResult> {
  await requireClinicRole(clinicId, ["manager"]);
  try {
    const admin = getAdminSupabase();
    const { data: staff } = await admin
      .from("platform_users")
      .select("id, clinic_id")
      .eq("id", employeeId)
      .single();
    if (!staff || staff.clinic_id !== clinicId) {
      throw new Error("هذا الموظف لا ينتمي لهذه العيادة");
    }
    const { error } = await admin
      .from("platform_users")
      .update({
        work_start: payload.work_start,
        work_end: payload.work_end,
        working_days: payload.working_days,
      })
      .eq("id", employeeId);
    if (error) throw new Error(error.message);
    revalidatePath(`/clinic/${clinicId}/employees`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function addEmployeeAbsence(
  clinicId: string,
  payload: { employee_user_id: string; absence_date: string; reason: string }
): Promise<ActionResult> {
  await requireClinicRole(clinicId, ["manager"]);
  try {
    if (!payload.employee_user_id) throw new Error("اختر الموظف");
    if (!payload.absence_date) throw new Error("اختر تاريخ الغياب");
    const dbConfig = await loadDbConfig(clinicId);
    await addAbsence(dbConfig, {
      employee_user_id: payload.employee_user_id,
      absence_date: payload.absence_date,
      reason: payload.reason.trim() || null,
    });
    revalidatePath(`/clinic/${clinicId}/employees`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removeEmployeeAbsence(
  clinicId: string,
  id: string
): Promise<ActionResult> {
  await requireClinicRole(clinicId, ["manager"]);
  try {
    const dbConfig = await loadDbConfig(clinicId);
    await deleteAbsence(dbConfig, id);
    revalidatePath(`/clinic/${clinicId}/employees`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

"use server";

import { revalidatePath } from "next/cache";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { requireClinicRole } from "@/lib/auth/require-clinic-role";
import {
  createService,
  updateService,
  deleteService,
  type ServiceInput,
} from "@/lib/clinic-services";
import type { ClinicDbConfig } from "@/types";

// Managers write to the clinic's OWN DB; clinic_db_config (with the service
// key needed to reach that DB) is owner-project data, so load it with the
// admin client after gating on the manager role.
async function loadDbConfig(clinicId: string): Promise<ClinicDbConfig> {
  const { data } = await getAdminSupabase()
    .from("clinic_db_config")
    .select("*")
    .eq("clinic_id", clinicId)
    .single();
  if (!data) throw new Error("لم يتم إعداد قاعدة بيانات لهذه العيادة");
  return data as ClinicDbConfig;
}

function parseServiceInput(form: {
  name: string;
  description: string;
  duration_minutes: number;
  price: string;
  active: boolean;
  employee_ids: string[];
}): ServiceInput {
  const name = form.name.trim();
  if (!name) throw new Error("اسم الخدمة مطلوب");
  const priceStr = form.price.trim();
  return {
    name,
    description: form.description.trim() || null,
    duration_minutes: Number(form.duration_minutes) || 30,
    price: priceStr ? Number(priceStr) : null,
    active: form.active,
    employee_ids: form.employee_ids.filter(Boolean),
  };
}

export async function saveService(
  clinicId: string,
  payload: {
    id?: string;
    name: string;
    description: string;
    duration_minutes: number;
    price: string;
    active: boolean;
    employee_ids: string[];
  }
) {
  await requireClinicRole(clinicId, ["manager"]);
  const dbConfig = await loadDbConfig(clinicId);
  const input = parseServiceInput(payload);

  if (payload.id) {
    await updateService(dbConfig, payload.id, input);
  } else {
    await createService(dbConfig, input);
  }

  revalidatePath(`/clinic/${clinicId}/services`);
}

export async function removeService(clinicId: string, id: string) {
  await requireClinicRole(clinicId, ["manager"]);
  const dbConfig = await loadDbConfig(clinicId);
  await deleteService(dbConfig, id);
  revalidatePath(`/clinic/${clinicId}/services`);
}

import type { AddClinicFormData } from "@/types";

export interface StepProps {
  data: AddClinicFormData;
  update: (patch: Partial<AddClinicFormData>) => void;
}

export const EMPTY_FORM_DATA: AddClinicFormData = {
  name: "",
  doctor_name: "",
  specialty: "",
  city: "",
  address: "",
  phone: "",
  clinic_key: "",
  channels: [{ channel: "whatsapp", is_enabled: true }],
  db_config: { db_type: "supabase" },
  automation: {
    reminder_enabled: true,
    reminder_hours_before: 2,
    rating_enabled: true,
    rating_delay_hours: 1,
    working_hours_start: "08:00",
    working_hours_end: "20:00",
  },
  plan: "monthly",
  starts_at: new Date().toISOString().slice(0, 10),
  payment_note: "",
};

export type ClinicStatus = 'trial' | 'active' | 'suspended' | 'expired';
export type DbType = 'supabase' | 'sql_server' | 'google_sheets';
export type Channel = 'whatsapp' | 'telegram' | 'messenger' | 'instagram' | 'facebook';
export type UserRole = 'owner' | 'manager' | 'doctor' | 'secretary';
export type Plan = 'monthly' | 'quarterly' | 'annual';
export type WorkflowType = 'reminder' | 'rating' | 'booking' | 'webhook';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

// Rows from the *clinic's own* DB (supabase.clinic-schema.sql). Not the
// owner project — shape may differ per db_type in practice (section 15).
export interface Patient {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient_id?: string;
  patient_name?: string;
  patient_phone?: string;
  appointment_time: string;
  duration_minutes: number;
  status: AppointmentStatus;
  reminder_sent: boolean;
  reminder_sent_at?: string;
  rating_sent: boolean;
  rating_sent_at?: string;
  notes?: string;
  service_id?: string | null;
  employee_user_id?: string | null;
  created_at: string;
}

// Rows from the clinic's OWN DB (services live there — owner decision).
export interface Service {
  id: string;
  name: string;
  description?: string | null;
  duration_minutes: number;
  price?: number | null;
  active: boolean;
  created_at: string;
  // joined: platform_users.id of the employees who perform it
  employee_ids?: string[];
}

// service_employees mapping row (clinic DB). employee_user_id is a soft ref to
// platform_users.id in the owner project.
export interface ServiceEmployee {
  service_id: string;
  employee_user_id: string;
}

export interface EmployeeAbsence {
  id: string;
  employee_user_id: string;
  absence_date: string;
  reason?: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  appointment_id?: string;
  patient_phone?: string;
  stars: number;
  comment?: string;
  created_at: string;
}

export interface Clinic {
  id: string;
  clinic_key: string;
  name: string;
  doctor_name: string;
  specialty?: string;
  city?: string;
  address?: string;
  phone?: string;
  logo_url?: string;
  status: ClinicStatus;
  notes?: string;
  ai_info_text?: string | null;
  ai_info_form?: unknown;
  ai_persona_gender?: "female" | "male";
  created_at: string;
  // joined
  subscription?: Subscription;
  channels?: ClinicChannel[];
  db_config?: ClinicDbConfig;
  automation?: ClinicAutomation;
}

export interface ClinicChannel {
  id: string;
  clinic_id: string;
  channel: Channel;
  is_enabled: boolean;
  wa_phone_number?: string;
  wa_phone_id?: string;
  wa_waba_id?: string;
  wa_access_token?: string;
  wa_verify_token?: string;
  wa_webhook_url?: string;
  tg_bot_token?: string;
  tg_chat_id?: string;
  fb_page_id?: string;
  fb_page_token?: string;
  ig_account_id?: string;
  ig_access_token?: string;
  verified: boolean;
  last_verified_at?: string;
}

export interface ClinicDbConfig {
  id: string;
  clinic_id: string;
  db_type: DbType;
  sb_project_url?: string;
  sb_anon_key?: string;
  sb_service_key?: string;
  mssql_host?: string;
  mssql_port?: number;
  mssql_database?: string;
  mssql_schema?: string;
  mssql_username?: string;
  mssql_password?: string;
  mssql_table_appointments?: string;
  mssql_table_patients?: string;
  mssql_table_reviews?: string;
  gs_spreadsheet_id?: string;
  gs_oauth_token?: string;
  test_passed?: boolean;
  last_tested_at?: string;
}

export interface ClinicAutomation {
  id: string;
  clinic_id: string;
  reminder_enabled: boolean;
  reminder_hours_before: number;
  reminder_message_ar?: string;
  reminder_message_en?: string;
  rating_enabled: boolean;
  rating_delay_hours: number;
  rating_message_ar?: string;
  working_hours_start?: string;
  working_hours_end?: string;
}

export interface Subscription {
  id: string;
  clinic_id: string;
  plan: Plan;
  price_sar: number;
  starts_at: string;
  expires_at: string;
  status: 'active' | 'expired' | 'cancelled';
  payment_note?: string;
}

export interface PlatformUser {
  id: string;
  auth_id: string;
  clinic_id?: string;
  role: UserRole;
  name?: string;
  email?: string;
  avatar_url?: string;
  is_active: boolean;
  // Per-employee schedule (the employee IS this login account).
  work_start?: string | null; // "HH:MM"
  work_end?: string | null; // "HH:MM"
  working_days?: number[] | null; // 0=Sun .. 6=Sat
}

export interface N8nExecutionLog {
  id: string;
  clinic_id: string;
  workflow: WorkflowType;
  status: 'success' | 'error';
  error_msg?: string;
  executed_at: string;
}

// Wizard state (held in React, not persisted until submit)
export interface AddClinicFormData {
  // Step 1
  name: string;
  doctor_name: string;
  specialty: string;
  city: string;
  address: string;
  phone: string;
  clinic_key: string;
  // Step 2
  channels: Partial<ClinicChannel>[];
  // Step 3
  db_config: Partial<ClinicDbConfig>;
  // Step 4
  automation: Partial<ClinicAutomation>;
  // Step 5
  plan: Plan;
  starts_at: string;
  payment_note: string;
}

export type ConversationChannel = "telegram" | "whatsapp";
export type ConversationMode = "ai" | "human";
export type MessageSender = "patient" | "ai" | "staff";

export interface Conversation {
  id: string;
  channel: ConversationChannel;
  chat_ref: string;
  patient_phone: string | null;
  patient_name: string | null;
  mode: ConversationMode;
  needs_attention: boolean;
  last_message_at: string;
  last_message_preview: string | null;
  last_sender: MessageSender | null;
}

export interface ConversationMessage {
  id: string;
  direction: "in" | "out";
  sender: MessageSender;
  body: string | null;
  created_at: string;
}

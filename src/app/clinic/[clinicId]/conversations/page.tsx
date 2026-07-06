import { requireClinicRole } from "@/lib/auth/require-clinic-role";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConversationsInbox } from "@/components/clinic/ConversationsInbox";
import { StaffNotifyCard } from "@/components/clinic/StaffNotifyCard";
import type { Conversation } from "@/types";

export default async function ConversationsPage({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  // Clinic staff only — the platform owner must not read patients' private
  // conversations (allowOwner: false).
  await requireClinicRole(clinicId, ["manager", "doctor", "secretary"], {
    allowOwner: false,
  });

  const admin = getAdminSupabase();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data }, { data: me }] = await Promise.all([
    admin
      .from("conversations")
      .select(
        "id, channel, chat_ref, patient_phone, patient_name, mode, needs_attention, last_message_at, last_message_preview, last_sender"
      )
      .eq("clinic_id", clinicId)
      .order("last_message_at", { ascending: false })
      .limit(100),
    admin
      .from("platform_users")
      .select("id, notify_chat_id")
      .eq("auth_id", user?.id ?? "")
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="المحادثات"
        description="محادثات المرضى عبر واتساب وتيليجرام — تابع ردود المساعد الذكي أو تدخّل بنفسك في أي وقت"
      />
      {me?.id ? (
        <StaffNotifyCard code={`ربط-${me.id}`} linked={Boolean(me.notify_chat_id)} />
      ) : null}
      <ConversationsInbox clinicId={clinicId} initial={(data ?? []) as Conversation[]} />
    </div>
  );
}

import { requireClinicRole } from "@/lib/auth/require-clinic-role";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConversationsInbox } from "@/components/clinic/ConversationsInbox";
import type { Conversation } from "@/types";

export default async function ConversationsPage({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  // Any active staff member of this clinic may handle chats.
  await requireClinicRole(clinicId, ["manager", "doctor", "secretary"]);

  const { data } = await getAdminSupabase()
    .from("conversations")
    .select(
      "id, channel, chat_ref, patient_phone, patient_name, mode, needs_attention, last_message_at, last_message_preview, last_sender"
    )
    .eq("clinic_id", clinicId)
    .order("last_message_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="المحادثات"
        description="محادثات المرضى عبر واتساب وتيليجرام — تابع ردود المساعد الذكي أو تدخّل بنفسك في أي وقت"
      />
      <ConversationsInbox clinicId={clinicId} initial={(data ?? []) as Conversation[]} />
    </div>
  );
}

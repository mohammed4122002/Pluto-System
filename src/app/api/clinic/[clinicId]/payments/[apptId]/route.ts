import { NextResponse } from "next/server";

import { requireClinicMember } from "@/lib/auth/require-clinic-access";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { triggerPaymentReviewNotify } from "@/lib/n8n/webhooks";

type RouteContext = { params: Promise<{ clinicId: string; apptId: string }> };

const DECISIONS = ["paid", "rejected", "pending"] as const;

// Staff confirms or rejects a booking's deposit payment. Updates the payment
// state on the unified appointment (the dashboard's read path); this column
// is untouched by the sheet sync, so the decision sticks.
export async function PATCH(request: Request, { params }: RouteContext) {
  const { clinicId, apptId } = await params;
  const auth = await requireClinicMember(clinicId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  const body = await request.json();
  const status = String(body.status ?? "");
  if (!DECISIONS.includes(status as (typeof DECISIONS)[number])) {
    return NextResponse.json({ error: "قرار غير صالح" }, { status: 400 });
  }
  // Optional staff-written message to the patient (e.g. why the proof was
  // rejected). Sent as-is instead of the default notification text.
  const note = String(body.note ?? "").trim().slice(0, 1000);

  const { data, error } = await getAdminSupabase()
    .from("unified_appointments")
    .update({
      payment_status: status,
      payment_updated_at: new Date().toISOString(),
      ...(note ? { payment_note: note } : {}),
    })
    .eq("id", apptId)
    .eq("clinic_id", clinicId)
    .select("id, payment_status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Tell the patient the outcome on the channel they paid from. The message
  // is queued in the owner DB and delivered by the n8n worker (webhook poke
  // for instant delivery + every-minute poll as the guarantee) — direct
  // Vercel→n8n HTTP has proven unreachable in production, so the DB queue is
  // the reliable transport.
  if (status === "paid" || status === "rejected") {
    await getAdminSupabase().from("notify_queue").insert({
      clinic_id: clinicId,
      appointment_id: apptId,
      decision: status,
      note: note || null,
    });
    await triggerPaymentReviewNotify();
  }

  return NextResponse.json({ appointment: data });
}

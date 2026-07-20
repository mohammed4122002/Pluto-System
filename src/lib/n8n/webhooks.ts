import "server-only";

const N8N_WEBHOOK_BASE_URL =
  process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL ??
  "https://n8n-quc4.srv1825882.hstgr.cloud";

/**
 * Kick the Sheets-clinic employee sync (normally every 15 min) immediately
 * after a clinic's Google Sheets config is saved, instead of leaving a freshly
 * registered clinic's dashboard/bot empty of employees until the next
 * scheduled run. Best-effort and fire-and-forget: the cron is still the
 * reliable path, this just closes the gap for a brand-new clinic.
 */
export async function triggerEmployeeSync() {
  try {
    await fetch(
      `${N8N_WEBHOOK_BASE_URL.replace(/\/$/, "")}/webhook/c4a1f8d2-sync-employees`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
    );
  } catch {
    // Best-effort — the 15-minute cron will still pick this clinic up.
  }
}

// Same shared secret that gates the n8n Data Read/Write APIs.
const N8N_NOTIFY_SECRET =
  process.env.MEDISYNC_N8N_READ_SECRET ?? "msync_read_7f3a9c21b8e64d05a1";

/**
 * Tell the patient the outcome of their deposit-payment review, on the same
 * channel they used to send the proof (Telegram / WhatsApp). Called after
 * staff confirms or rejects a payment in the dashboard; n8n looks up the
 * patient's conversation and sends via the clinic's own channel credentials.
 * Best-effort — the review decision itself is already saved before this runs.
 */
export async function triggerPaymentReviewNotify(input: {
  clinicId: string;
  appointmentId: string;
  decision: "paid" | "rejected";
  /** Optional staff-written message — sent to the patient as-is instead of the default text. */
  note?: string;
}) {
  try {
    await fetch(
      `${N8N_WEBHOOK_BASE_URL.replace(/\/$/, "")}/webhook/7c2e9f4a-payment-review-notify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: N8N_NOTIFY_SECRET,
          clinic_id: input.clinicId,
          appointment_id: input.appointmentId,
          decision: input.decision,
          note: input.note ?? "",
        }),
      }
    );
  } catch {
    // Best-effort — the patient can still ask the bot about their status.
  }
}

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

/**
 * Kick the sheet-tab normalizer right after a Sheets clinic is registered so
 * non-canonical tab names (الحجوزات، الموظفين…) are renamed to the standard
 * ones before the first sync runs. Best-effort — the 10-minute cron is the
 * guarantee.
 */
export async function triggerSheetTabNormalize() {
  try {
    await fetch(
      `${N8N_WEBHOOK_BASE_URL.replace(/\/$/, "")}/webhook/a9c3e7f1-normalize-tabs`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
    );
  } catch {
    // Best-effort — the cron normalizes on its next tick.
  }
}

/**
 * Poke the n8n payment-review-notify worker so it processes the notify_queue
 * immediately. The actual notification payload lives in the queue row the
 * caller inserted first — this call carries no data, so losing it costs at
 * most one minute (the worker also polls the queue every minute).
 */
export async function triggerPaymentReviewNotify() {
  try {
    await fetch(
      `${N8N_WEBHOOK_BASE_URL.replace(/\/$/, "")}/webhook/7c2e9f4a-payment-review-notify`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
    );
  } catch {
    // Best-effort — the every-minute poll delivers the queued message anyway.
  }
}

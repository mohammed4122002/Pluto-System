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

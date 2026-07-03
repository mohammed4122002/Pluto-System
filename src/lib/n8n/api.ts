import "server-only";

const N8N_BASE_URL = process.env.N8N_BASE_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

function assertConfigured() {
  if (!N8N_BASE_URL || !N8N_API_KEY) {
    throw new Error("N8N_BASE_URL / N8N_API_KEY are not configured");
  }
}

async function n8nFetch(path: string, init?: RequestInit) {
  assertConfigured();
  const res = await fetch(`${N8N_BASE_URL}/api/v1${path}`, {
    ...init,
    headers: {
      "X-N8N-API-KEY": N8N_API_KEY!,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`n8n API request failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function listWorkflows() {
  return n8nFetch("/workflows");
}

export async function listExecutions(workflowId?: string) {
  const query = workflowId ? `?workflowId=${workflowId}` : "";
  return n8nFetch(`/executions${query}`);
}

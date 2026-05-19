import { isDevDebugEnabled } from "@/lib/dev-log";

/** Debug session ring buffer — local dev / explicit VITE_AGENT_DEBUG only. */
const STORAGE_KEY = "__amynest_agent_debug_9b2f04";
const MAX_ENTRIES = 80;
const INGEST =
  "http://127.0.0.1:7894/ingest/c3ee7ea7-b5b2-44c2-a422-3a06c950411d";
const SESSION_ID = "9b2f04";

export type AgentDebugPayload = {
  location: string;
  message: string;
  data?: Record<string, unknown>;
  hypothesisId?: string;
  runId?: string;
};

function persist(entry: AgentDebugPayload & { timestamp: number }): void {
  try {
    const w = window as Window & { __amynestAgentDebug?: typeof entry[] };
    const prev = w.__amynestAgentDebug ?? [];
    const next = [...prev, entry].slice(-MAX_ENTRIES);
    w.__amynestAgentDebug = next;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
}

/** Ring buffer + optional localhost ingest — disabled in production unless VITE_AGENT_DEBUG. */
export function agentDebugLog(payload: AgentDebugPayload): void {
  if (!isDevDebugEnabled()) return;

  const entry = { ...payload, timestamp: Date.now() };
  persist(entry);

  if (!import.meta.env.DEV) return;

  try {
    fetch(INGEST, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": SESSION_ID,
      },
      body: JSON.stringify({
        sessionId: SESSION_ID,
        ...payload,
        timestamp: entry.timestamp,
      }),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export function readAgentDebugLog(): Array<AgentDebugPayload & { timestamp: number }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Array<AgentDebugPayload & { timestamp: number }>;
  } catch {
    return [];
  }
}

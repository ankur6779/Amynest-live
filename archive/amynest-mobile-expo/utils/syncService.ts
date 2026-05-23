import { API_BASE_URL } from "@/constants/api";
import {
  drainQueue,
  type QueuedAction,
  type QueuedActionType,
} from "@/utils/offlineQueue";

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 500;

let authTokenGetter: (() => Promise<string | null>) | null = null;
export function setSyncAuthGetter(fn: () => Promise<string | null>): void {
  authTokenGetter = fn;
}

async function authHeader(): Promise<Record<string, string>> {
  if (!authTokenGetter) return {};
  try {
    const t = await authTokenGetter();
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch {
    return {};
  }
}

/**
 * Endpoint map for offline action types.
 * NOTE: backend currently does not expose dedicated mutation endpoints for
 * routine task completion / coach-step / behavior write-through. These paths
 * are the canonical targets the backend team has agreed to add. Until they
 * exist, requests will 404; sync treats 404 as RETAIN (keeps the action in
 * queue for later retry) so no data is lost when the routes ship.
 */
function endpointFor(type: QueuedActionType): { method: string; path: string } {
  switch (type) {
    case "COMPLETE_ROUTINE":
      return { method: "POST", path: "/api/routines/complete" };
    case "UNDO_ROUTINE":
      return { method: "POST", path: "/api/routines/undo" };
    case "COMPLETE_COACH_STEP":
      return { method: "POST", path: "/api/ai-coach/feedback" };
    case "UPDATE_BEHAVIOR":
      return { method: "POST", path: "/api/behaviors" };
  }
}

type SendOutcome = "success" | "retain" | "drop";

async function sendOne(action: QueuedAction): Promise<SendOutcome> {
  const { method, path } = endpointFor(action.type);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(await authHeader()),
  };
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: JSON.stringify({ ...action.payload, clientTimestamp: action.timestamp }),
    });
  } catch {
    // Network-level failure → retain for later
    throw new Error("network");
  }

  if (res.ok) return "success";

  // Auth issues / rate limiting / endpoint not yet implemented / server errors
  // → retain. We must NEVER drop on 401/403 or we'd lose user data on a
  // transient token expiry across the sign-out boundary.
  if (
    res.status === 401 ||
    res.status === 403 ||
    res.status === 404 ||
    res.status === 408 ||
    res.status === 409 ||
    res.status === 429 ||
    res.status >= 500
  ) {
    const text = await res.text().catch(() => "");
    throw new Error(`retain ${res.status}: ${text || res.statusText}`);
  }

  // Other 4xx (400/422 etc.) → malformed payload, drop to avoid permanent stuck queue
  return "drop";
}

let isSyncing = false;

export type SyncResult = {
  attempted: number;
  succeeded: number;
  failed: number;
  dropped: number;
  remaining: number;
  skipped?: boolean;
};

export async function syncOfflineData(): Promise<SyncResult> {
  if (isSyncing) {
    return { attempted: 0, succeeded: 0, failed: 0, dropped: 0, remaining: 0, skipped: true };
  }
  isSyncing = true;
  try {
    let succeeded = 0;
    let failed = 0;
    let dropped = 0;

    const { processed, remaining } = await drainQueue(async (snapshot) => {
      const retained: QueuedAction[] = [];
      for (const action of snapshot) {
        const attempts = (action.attempts ?? 0) + 1;
        try {
          const outcome = await sendOne(action);
          if (outcome === "success") {
            succeeded += 1;
          } else {
            // dropped (malformed)
            dropped += 1;
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (attempts >= MAX_ATTEMPTS) {
            // give up after MAX_ATTEMPTS to prevent permanent stuck queue
            dropped += 1;
          } else {
            retained.push({ ...action, attempts, lastError: message });
            failed += 1;
            await new Promise((r) => setTimeout(r, BASE_DELAY_MS * attempts));
          }
        }
      }
      return retained;
    });

    return {
      attempted: processed,
      succeeded,
      failed,
      dropped,
      remaining,
    };
  } finally {
    isSyncing = false;
  }
}

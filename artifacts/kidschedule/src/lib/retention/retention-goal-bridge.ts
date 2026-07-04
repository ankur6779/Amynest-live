import { getApiUrl } from "@/lib/api";
import { parseApiJson } from "@/lib/safe-json-response";
import { trackRetentionEvent } from "@/lib/retention/retention-analytics";
import type { RetentionDailyGoals } from "@/lib/retention/retention-api";

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

let retentionAuthFetch: AuthFetch | null = null;

/** Bind auth fetch once at app bootstrap for fire-and-forget goal reporting. */
export function setRetentionAuthFetch(fetch: AuthFetch | null): void {
  retentionAuthFetch = fetch;
}

/** Mark a daily retention goal complete (idempotent server-side). */
export async function reportRetentionGoal(
  authFetch: AuthFetch,
  goal: keyof RetentionDailyGoals,
): Promise<void> {
  try {
    const res = await authFetch(getApiUrl("/api/retention/goal"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal }),
    });
    if (!res.ok) return;
    await parseApiJson(res);
    trackRetentionEvent("goal_completed", { goal });
  } catch {
    /* best-effort */
  }
}

/** Report goal without an explicit auth fetch (uses bootstrap binding). */
export function reportRetentionGoalBestEffort(goal: keyof RetentionDailyGoals): void {
  if (!retentionAuthFetch) return;
  void reportRetentionGoal(retentionAuthFetch, goal);
}

/** Record app open for inactive-day / win-back tracking. */
export async function touchRetentionActivity(authFetch: AuthFetch): Promise<void> {
  try {
    await authFetch(getApiUrl("/api/retention/touch"), { method: "POST" });
  } catch {
    /* best-effort */
  }
}

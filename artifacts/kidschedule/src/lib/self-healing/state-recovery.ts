/**
 * Level 3 — Rebuild corrupted local / form state without full app reload.
 */

import type { QueryClient } from "@tanstack/react-query";
import { recordRecoveryEvent } from "@/lib/self-healing/recovery-stats";
import { recordSelfHealingAction } from "@/lib/self-healing/action-log";
import { recoverQueriesForRoute } from "@/lib/self-healing/query-recovery";

const CORRUPT_STORAGE_PATTERNS = [
  /^amynest:learning-sync:v1$/,
  /^amynest:learning-sync:v1:/,
  /^amynest:reward-bus:/,
];

/** Clear known corrupted localStorage keys (not auth tokens). */
export function clearCorruptedLocalState(): string[] {
  if (typeof window === "undefined") return [];
  const cleared: string[] = [];
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (CORRUPT_STORAGE_PATTERNS.some((p) => p.test(key))) {
        try {
          JSON.parse(localStorage.getItem(key) ?? "null");
        } catch {
          localStorage.removeItem(key);
          cleared.push(key);
        }
      }
    }
  } catch {
    /* ignore */
  }
  return cleared;
}

/**
 * Level 3 state recovery for a crashed component:
 * - clear corrupted caches
 * - rehydrate server data via query invalidation
 * - no full page reload
 */
export async function recoverComponentState(input: {
  component: string;
  queryClient?: QueryClient;
}): Promise<boolean> {
  const route = typeof window !== "undefined" ? window.location.pathname : "";
  recordSelfHealingAction(`state_recovery:${input.component}`);

  const cleared = clearCorruptedLocalState();
  if (input.queryClient && route) {
    await recoverQueriesForRoute(input.queryClient, route);
  }

  recordRecoveryEvent({
    level: 3,
    outcome: cleared.length > 0 || Boolean(input.queryClient) ? "auto_recovered" : "partial_recovery",
    component: input.component,
    route,
    detail: cleared.length ? `cleared:${cleared.join(",")}` : "query_rehydrate",
  });

  return true;
}

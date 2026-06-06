/**
 * Level 4 — React Query automatic cache recovery.
 */

import {
  QueryClient,
  type DefaultOptions,
  type Query,
} from "@tanstack/react-query";
import { recordRecoveryEvent } from "@/lib/self-healing/recovery-stats";
import { recordSelfHealingAction } from "@/lib/self-healing/action-log";

const STALE_MS = 5 * 60 * 1000;

function queryKeyLabel(query: Query): string {
  try {
    return JSON.stringify(query.queryKey).slice(0, 200);
  } catch {
    return "unknown";
  }
}

/** Default options — auto-retry and refetch without user action. */
export function selfHealingQueryDefaults(): DefaultOptions {
  return {
    queries: {
      staleTime: STALE_MS,
      retry: (failureCount, error) => {
        if (failureCount >= 2) return false;
        const msg = error instanceof Error ? error.message : String(error ?? "");
        if (msg.includes("auth-unauthorized")) return false;
        return true;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  };
}

export function createSelfHealingQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: selfHealingQueryDefaults(),
  });

  client.getQueryCache().subscribe((event) => {
    if (event?.type !== "updated") return;
    const query = event.query;
    if (query.state.status !== "error" || query.state.fetchStatus !== "idle") return;
    const key = queryKeyLabel(query);
    recordSelfHealingAction(`query_error:${key}`);
    void recoverQuery(client, query);
  });

  return client;
}

/** Invalidate + refetch a failed query. */
export async function recoverQuery(client: QueryClient, query: Query): Promise<boolean> {
  const key = query.queryKey;
  try {
    await client.invalidateQueries({ queryKey: key });
    await client.refetchQueries({ queryKey: key, type: "active" });
    recordRecoveryEvent({
      level: 4,
      outcome: "auto_recovered",
      detail: queryKeyLabel(query),
    });
    return true;
  } catch {
    return false;
  }
}

/** Route-scoped query recovery — e.g. /children/:id → child queries. */
export async function recoverQueriesForRoute(
  client: QueryClient,
  pathname: string,
): Promise<void> {
  const patterns: Array<{ match: RegExp; predicate: (key: unknown) => boolean }> = [
    {
      match: /^\/children\/(\d+)/,
      predicate: (key) => {
        const s = JSON.stringify(key);
        return s.includes("child") || s.includes("children");
      },
    },
    {
      match: /^\/routines/,
      predicate: (key) => JSON.stringify(key).includes("routine"),
    },
    {
      match: /^\/dashboard/,
      predicate: (key) => {
        const s = JSON.stringify(key);
        return s.includes("children") || s.includes("dashboard");
      },
    },
  ];

  const rule = patterns.find((p) => p.match.test(pathname));
  if (!rule) return;

  const cache = client.getQueryCache().getAll();
  for (const query of cache) {
    if (!rule.predicate(query.queryKey)) continue;
    await recoverQuery(client, query);
  }
}

export function getActiveQueryKeyLabels(client: QueryClient): string[] {
  return client
    .getQueryCache()
    .getAll()
    .filter((q) => q.getObserversCount() > 0)
    .map(queryKeyLabel)
    .slice(0, 20);
}

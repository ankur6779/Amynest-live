import { parseApiJson } from "@/lib/safe-json-response";
/**
 * Client-side dashboard cache — instant paint from last successful session,
 * background refresh when online.
 */

import type { SubscriptionResponse } from "@/hooks/use-subscription";
import { EMPTY_SUBSCRIPTION_RESPONSE } from "@/lib/subscription-defaults";
import { getApiUrl } from "@/lib/api";
import type { AuthFetchFn } from "@/lib/setup-status";

const SUMMARY_KEY = "amynest:dashboard:summary:v1";
const STATS_KEY = "amynest:dashboard:behavior-stats:v1";
const CHILDREN_KEY = "amynest:dashboard:children:v1";
const SUBSCRIPTION_KEY = "amynest:dashboard:subscription:v1";
const SYNCED_AT_KEY = "amynest:dashboard:synced-at:v1";

export type DashboardSummary = {
  totalChildren: number;
  totalRoutines: number;
  positiveBehaviorsToday: number;
  negativeBehaviorsToday: number;
  routinesGeneratedThisWeek: number;
  fallback?: boolean;
};

export type BehaviorStatRow = {
  childId: number;
  childName?: string;
  positive?: number;
  negative?: number;
  [key: string]: unknown;
};

export type DashboardChildRow = {
  id: number;
  name: string;
  age: number;
  ageMonths?: number;
  [key: string]: unknown;
};

export const EMPTY_DASHBOARD_SUMMARY: DashboardSummary = {
  totalChildren: 0,
  totalRoutines: 0,
  positiveBehaviorsToday: 0,
  negativeBehaviorsToday: 0,
  routinesGeneratedThisWeek: 0,
  fallback: true,
};

function readJson<T>(key: string): T | undefined {
  if (typeof localStorage === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode */
  }
}

/** Record last successful dashboard cache write (ms since epoch). */
export function touchDashboardSyncTimestamp(at = Date.now()): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(SYNCED_AT_KEY, String(at));
  } catch {
    /* private mode */
  }
}

export function readDashboardSyncTimestamp(): number | undefined {
  if (typeof localStorage === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(SYNCED_AT_KEY);
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** User-facing label for cache hydration / last successful sync. */
export function formatDashboardSyncLabel(syncedAtMs: number, now = Date.now()): string {
  const diffMin = Math.max(0, Math.floor((now - syncedAtMs) / 60_000));
  if (diffMin < 1) return "Last synced just now";
  if (diffMin < 60) return `Updated ${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Updated ${diffHr} hr ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `Updated ${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}

function persistWithSync(write: () => void): void {
  write();
  touchDashboardSyncTimestamp();
}

export function readCachedDashboardSummary(): DashboardSummary | undefined {
  const cached = readJson<DashboardSummary>(SUMMARY_KEY);
  if (!cached || cached.fallback) return undefined;
  return cached;
}

export function persistDashboardSummary(summary: DashboardSummary): void {
  if (summary.fallback) return;
  persistWithSync(() => writeJson(SUMMARY_KEY, summary));
}

export function readCachedBehaviorStats(): BehaviorStatRow[] | undefined {
  const cached = readJson<BehaviorStatRow[]>(STATS_KEY);
  return Array.isArray(cached) && cached.length > 0 ? cached : undefined;
}

export function persistBehaviorStats(stats: BehaviorStatRow[]): void {
  if (!Array.isArray(stats) || stats.length === 0) return;
  persistWithSync(() => writeJson(STATS_KEY, stats));
}

export function readCachedChildrenList(): DashboardChildRow[] | undefined {
  const cached = readJson<DashboardChildRow[]>(CHILDREN_KEY);
  return Array.isArray(cached) && cached.length > 0 ? cached : undefined;
}

export function persistChildrenList(children: DashboardChildRow[]): void {
  if (!Array.isArray(children) || children.length === 0) return;
  persistWithSync(() => writeJson(CHILDREN_KEY, children));
}

/** Drop dashboard/session payloads (e.g. after sign-out or account deletion). */
export function clearDashboardCaches(): void {
  if (typeof localStorage === "undefined") return;
  for (const key of [SUMMARY_KEY, STATS_KEY, CHILDREN_KEY, SUBSCRIPTION_KEY, SYNCED_AT_KEY]) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* private mode */
    }
  }
}

export function readCachedSubscription(): SubscriptionResponse | undefined {
  const cached = readJson<SubscriptionResponse>(SUBSCRIPTION_KEY);
  if (!cached?.entitlements?.limits) return undefined;
  return cached;
}

export function persistSubscription(data: SubscriptionResponse): void {
  if (!data?.entitlements?.limits) return;
  persistWithSync(() => writeJson(SUBSCRIPTION_KEY, data));
}

/** True when a prior session left real (non-empty) dashboard payloads. */
export function hasDashboardStaleCache(): boolean {
  return !!(
    readCachedDashboardSummary() ||
    readCachedBehaviorStats() ||
    readCachedChildrenList() ||
    readCachedSubscription()
  );
}

async function fetchJson<T>(
  authFetch: AuthFetchFn,
  path: string,
): Promise<T> {
  const res = await authFetch(getApiUrl(path));
  if (!res.ok) throw new Error(`dashboard_fetch_${res.status}`);
  return (await parseApiJson<T>(res));
}

export async function fetchDashboardSummaryResilient(
  authFetch: AuthFetchFn,
): Promise<DashboardSummary> {
  try {
    const data = await fetchJson<DashboardSummary>(authFetch, "/api/dashboard/summary");
    if (data?.fallback) return data;
    persistDashboardSummary(data);
    return data;
  } catch (err) {
    console.warn("[dashboard] summary fetch failed", err);
    return readCachedDashboardSummary() ?? EMPTY_DASHBOARD_SUMMARY;
  }
}

export async function fetchBehaviorStatsResilient(
  authFetch: AuthFetchFn,
): Promise<BehaviorStatRow[]> {
  try {
    const data = await fetchJson<BehaviorStatRow[]>(authFetch, "/api/dashboard/behavior-stats");
    const rows = Array.isArray(data) ? data : [];
    persistBehaviorStats(rows);
    return rows;
  } catch (err) {
    console.warn("[dashboard] behavior-stats fetch failed", err);
    return readCachedBehaviorStats() ?? [];
  }
}

export async function fetchChildrenListResilient(
  authFetch: AuthFetchFn,
): Promise<DashboardChildRow[]> {
  try {
    const data = await fetchJson<DashboardChildRow[]>(authFetch, "/api/children");
    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) {
      if (typeof localStorage !== "undefined") {
        try {
          localStorage.removeItem(CHILDREN_KEY);
        } catch {
          /* private mode */
        }
      }
    } else {
      persistChildrenList(rows);
    }
    return rows;
  } catch (err) {
    console.warn("[dashboard] children fetch failed", err);
    return readCachedChildrenList() ?? [];
  }
}

export async function fetchSubscriptionResilient(
  authFetch: AuthFetchFn,
): Promise<SubscriptionResponse> {
  try {
    const data = await fetchJson<SubscriptionResponse>(authFetch, "/api/subscription");
    if (!data?.entitlements?.limits) return EMPTY_SUBSCRIPTION_RESPONSE;
    persistSubscription(data);
    return data;
  } catch (err) {
    console.warn("[dashboard] subscription fetch failed", err);
    return readCachedSubscription() ?? EMPTY_SUBSCRIPTION_RESPONSE;
  }
}

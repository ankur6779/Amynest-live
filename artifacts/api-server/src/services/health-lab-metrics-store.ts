/**
 * In-process Health Lab™ telemetry counters (client logs + sync outcomes).
 * Powers admin dashboards and launch watchlists.
 */
import { logger } from "../lib/logger.js";

export type HealthLabMetricName =
  | "health_lab_dau_users"
  | "health_lab_session_start"
  | "health_lab_session_complete"
  | "health_lab_session_abandon"
  | "health_lab_quest_complete"
  | "health_lab_badge_unlock"
  | "health_lab_master_badge_unlock"
  | "health_lab_level_up"
  | "health_lab_prestige_unlock"
  | "health_lab_shop_purchase"
  | "health_lab_dashboard_view"
  | "health_lab_permission_denied"
  | "health_lab_simulation_mode"
  | "health_lab_cheat_detected"
  | "health_lab_sync_success"
  | "health_lab_sync_failure";

const eventCounts = new Map<HealthLabMetricName, number>();
const recentEvents: Array<{ event: HealthLabMetricName; ts: number; childId?: number; userId?: string }> = [];
const MAX_RECENT = 20_000;
const dauUsers = new Set<string>();

const SESSION_START_EVENTS = new Set<HealthLabMetricName>(["health_lab_session_start"]);
const SESSION_COMPLETE_EVENTS = new Set<HealthLabMetricName>(["health_lab_session_complete"]);

function bump(name: HealthLabMetricName): void {
  eventCounts.set(name, (eventCounts.get(name) ?? 0) + 1);
}

export function recordHealthLabClientEvent(
  event: string,
  opts?: { childId?: number; userId?: string | null },
): void {
  if (!event.startsWith("health_lab_")) return;
  const name = event as HealthLabMetricName;
  bump(name);
  recentEvents.push({
    event: name,
    ts: Date.now(),
    childId: opts?.childId,
    userId: opts?.userId ?? undefined,
  });
  if (recentEvents.length > MAX_RECENT) {
    recentEvents.splice(0, recentEvents.length - MAX_RECENT);
  }
  if (opts?.userId) {
    dauUsers.add(opts.userId);
  }
}

export function recordHealthLabSyncOutcome(success: boolean): void {
  recordHealthLabClientEvent(success ? "health_lab_sync_success" : "health_lab_sync_failure");
}

export function getHealthLabMetricCounts(): Record<HealthLabMetricName, number> {
  const out = {} as Record<HealthLabMetricName, number>;
  const names: HealthLabMetricName[] = [
    "health_lab_dau_users",
    "health_lab_session_start",
    "health_lab_session_complete",
    "health_lab_session_abandon",
    "health_lab_quest_complete",
    "health_lab_badge_unlock",
    "health_lab_master_badge_unlock",
    "health_lab_level_up",
    "health_lab_prestige_unlock",
    "health_lab_shop_purchase",
    "health_lab_dashboard_view",
    "health_lab_permission_denied",
    "health_lab_simulation_mode",
    "health_lab_cheat_detected",
    "health_lab_sync_success",
    "health_lab_sync_failure",
  ];
  for (const n of names) {
    out[n] = n === "health_lab_dau_users" ? dauUsers.size : (eventCounts.get(n) ?? 0);
  }
  return out;
}

function countInWindow(
  predicate: (e: (typeof recentEvents)[number]) => boolean,
  windowMs: number,
  now = Date.now(),
): number {
  const cutoff = now - windowMs;
  let n = 0;
  for (let i = recentEvents.length - 1; i >= 0; i--) {
    const e = recentEvents[i]!;
    if (e.ts < cutoff) break;
    if (predicate(e)) n++;
  }
  return n;
}

export type HealthLabDashboardSnapshot = {
  generatedAt: string;
  counts: Record<HealthLabMetricName, number>;
  rates: {
    questCompletionRate: number;
    badgeUnlockRate: number;
    shopUsageRate: number;
    syncFailureRate: number;
    permissionDenialRate: number;
    cheatDetectionRate: number;
    sessionAbandonRate: number;
    avgSessionLengthMs: number | null;
  };
  retention: {
    d1: number | null;
    d7: number | null;
    d30: number | null;
  };
  gamesPlayed24h: number;
  dailyActiveUsers: number;
};

export function getHealthLabDashboardSnapshot(now = Date.now()): HealthLabDashboardSnapshot {
  const counts = getHealthLabMetricCounts();
  const dayMs = 86_400_000;

  const starts24h = countInWindow((e) => SESSION_START_EVENTS.has(e.event), dayMs, now);
  const completes24h = countInWindow((e) => SESSION_COMPLETE_EVENTS.has(e.event), dayMs, now);
  const quests24h = countInWindow((e) => e.event === "health_lab_quest_complete", dayMs, now);
  const badges24h = countInWindow((e) => e.event === "health_lab_badge_unlock", dayMs, now);
  const shop24h = countInWindow((e) => e.event === "health_lab_shop_purchase", dayMs, now);
  const syncOk24h = countInWindow((e) => e.event === "health_lab_sync_success", dayMs, now);
  const syncFail24h = countInWindow((e) => e.event === "health_lab_sync_failure", dayMs, now);
  const permDenied24h = countInWindow((e) => e.event === "health_lab_permission_denied", dayMs, now);
  const cheat24h = countInWindow((e) => e.event === "health_lab_cheat_detected", dayMs, now);
  const abandon24h = countInWindow((e) => e.event === "health_lab_session_abandon", dayMs, now);

  const syncTotal = syncOk24h + syncFail24h;
  const sessionTotal = starts24h || 1;

  return {
    generatedAt: new Date(now).toISOString(),
    counts,
    rates: {
      questCompletionRate: Math.round((quests24h / sessionTotal) * 1000) / 10,
      badgeUnlockRate: Math.round((badges24h / sessionTotal) * 1000) / 10,
      shopUsageRate: Math.round((shop24h / sessionTotal) * 1000) / 10,
      syncFailureRate: syncTotal > 0 ? Math.round((syncFail24h / syncTotal) * 1000) / 10 : 0,
      permissionDenialRate: Math.round((permDenied24h / sessionTotal) * 1000) / 10,
      cheatDetectionRate: Math.round((cheat24h / sessionTotal) * 1000) / 10,
      sessionAbandonRate: Math.round((abandon24h / sessionTotal) * 1000) / 10,
      avgSessionLengthMs: null,
    },
    retention: { d1: null, d7: null, d30: null },
    gamesPlayed24h: completes24h,
    dailyActiveUsers: dauUsers.size,
  };
}

export function resetHealthLabMetricsForTests(): void {
  eventCounts.clear();
  recentEvents.length = 0;
  dauUsers.clear();
}

export function logHealthLabMetricSpikeAlerts(now = Date.now()): void {
  const syncFail = countInWindow((e) => e.event === "health_lab_sync_failure", 5 * 60_000, now);
  if (syncFail >= 50) {
    logger.warn({ syncFail, windowMs: 300_000 }, "health_lab_sync_failure_spike");
  }
}

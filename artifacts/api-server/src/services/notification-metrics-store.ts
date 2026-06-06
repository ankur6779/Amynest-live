/**
 * In-process counters for notification delivery outcomes.
 * Persisted outcomes live in notification_log; these metrics power alerts.
 */
import { logger } from "../lib/logger.js";

export type NotificationMetricName =
  | "notification_sent_total"
  | "notification_duplicate_blocked_total"
  | "notification_rate_limited_total"
  | "notification_failed_total"
  | "notification_pending_total"
  | "notification_claim_conflicts_total"
  | "notification_cron_lock_contention_total";

const counts = new Map<NotificationMetricName, number>();

const SPIKE_WINDOW_MS = 5 * 60 * 1000;
const recentEvents: Array<{ metric: NotificationMetricName; ts: number }> = [];
const MAX_RECENT = 10_000;

export function recordNotificationMetric(metric: NotificationMetricName): void {
  counts.set(metric, (counts.get(metric) ?? 0) + 1);
  recentEvents.push({ metric, ts: Date.now() });
  if (recentEvents.length > MAX_RECENT) {
    recentEvents.splice(0, recentEvents.length - MAX_RECENT);
  }
}

export function getNotificationMetricCounts(): Record<NotificationMetricName, number> {
  return {
    notification_sent_total: counts.get("notification_sent_total") ?? 0,
    notification_duplicate_blocked_total:
      counts.get("notification_duplicate_blocked_total") ?? 0,
    notification_rate_limited_total: counts.get("notification_rate_limited_total") ?? 0,
    notification_failed_total: counts.get("notification_failed_total") ?? 0,
    notification_pending_total: counts.get("notification_pending_total") ?? 0,
    notification_claim_conflicts_total:
      counts.get("notification_claim_conflicts_total") ?? 0,
    notification_cron_lock_contention_total:
      counts.get("notification_cron_lock_contention_total") ?? 0,
  };
}

export function countRecentMetricEvents(
  metric: NotificationMetricName,
  windowMs = SPIKE_WINDOW_MS,
  now = Date.now(),
): number {
  const cutoff = now - windowMs;
  let n = 0;
  for (let i = recentEvents.length - 1; i >= 0; i--) {
    const e = recentEvents[i]!;
    if (e.ts < cutoff) break;
    if (e.metric === metric) n++;
  }
  return n;
}

export function resetNotificationMetricsForTests(): void {
  counts.clear();
  recentEvents.length = 0;
}

/** Evaluate spike thresholds and emit admin alerts when crossed. */
export async function checkNotificationMetricAlerts(now = Date.now()): Promise<void> {
  const { syncAdminAlertCondition } = await import("./admin-alert-system.js");

  const claimConflicts = countRecentMetricEvents(
    "notification_claim_conflicts_total",
    SPIKE_WINDOW_MS,
    now,
  );
  await syncAdminAlertCondition(
    claimConflicts >= 20,
    {
      severity: "warning",
      module: "api",
      issue: "Notification claim conflicts spiking",
      metric: "notification_claim_conflicts_total",
      value: claimConflicts,
      actionTaken: "Review concurrent cron workers and dedup index health",
    },
    "Claim conflict rate returned to normal",
    now,
  );

  const failures = countRecentMetricEvents("notification_failed_total", SPIKE_WINDOW_MS, now);
  await syncAdminAlertCondition(
    failures >= 15,
    {
      severity: "warning",
      module: "api",
      issue: "Notification delivery failures spiking",
      metric: "notification_failed_total",
      value: failures,
    },
    "Notification failure rate returned to normal",
    now,
  );

  const { countPendingClaims } = await import("./notificationRateLimitService.js");
  const pending = await countPendingClaims();
  counts.set("notification_pending_total", pending);
  await syncAdminAlertCondition(
    pending >= 50,
    {
      severity: "warning",
      module: "api",
      issue: "Notification pending claims growing",
      metric: "notification_pending_total",
      value: pending,
      actionTaken: "Check stale pending recovery and worker crash loops",
    },
    "Pending notification claims cleared",
    now,
  );

  const duplicates = countRecentMetricEvents(
    "notification_duplicate_blocked_total",
    SPIKE_WINDOW_MS,
    now,
  );
  await syncAdminAlertCondition(
    duplicates >= 100,
    {
      severity: "info",
      module: "api",
      issue: "Notification duplicate blocks elevated",
      metric: "notification_duplicate_blocked_total",
      value: duplicates,
    },
    "Duplicate block rate returned to normal",
    now,
  );

  logger.debug(
    { evt: "notification.metrics.check", ...getNotificationMetricCounts() },
    "notification metrics evaluated",
  );
}

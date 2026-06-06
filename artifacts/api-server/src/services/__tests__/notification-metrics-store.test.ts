import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getNotificationMetricCounts,
  recordNotificationMetric,
  resetNotificationMetricsForTests,
  countRecentMetricEvents,
} from "../notification-metrics-store.js";

describe("notification metrics store", () => {
  it("tracks all required counters", () => {
    resetNotificationMetricsForTests();
    recordNotificationMetric("notification_sent_total");
    recordNotificationMetric("notification_duplicate_blocked_total");
    recordNotificationMetric("notification_rate_limited_total");
    recordNotificationMetric("notification_failed_total");
    recordNotificationMetric("notification_claim_conflicts_total");
    recordNotificationMetric("notification_cron_lock_contention_total");

    const counts = getNotificationMetricCounts();
    assert.equal(counts.notification_sent_total, 1);
    assert.equal(counts.notification_duplicate_blocked_total, 1);
    assert.equal(counts.notification_rate_limited_total, 1);
    assert.equal(counts.notification_failed_total, 1);
    assert.equal(counts.notification_claim_conflicts_total, 1);
    assert.equal(counts.notification_cron_lock_contention_total, 1);
  });

  it("counts recent events in sliding window", () => {
    resetNotificationMetricsForTests();
    const now = Date.now();
    recordNotificationMetric("notification_claim_conflicts_total");
    assert.equal(
      countRecentMetricEvents("notification_claim_conflicts_total", 60_000, now + 1000),
      1,
    );
  });
});

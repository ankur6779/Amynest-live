import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getHealthLabDashboardSnapshot,
  getHealthLabMetricCounts,
  recordHealthLabClientEvent,
  recordHealthLabSyncOutcome,
  resetHealthLabMetricsForTests,
} from "../services/health-lab-metrics-store.js";

test("metrics dashboard reflects ingested client events", () => {
  resetHealthLabMetricsForTests();
  recordHealthLabClientEvent("health_lab_session_start", { userId: "parent-1", childId: 10 });
  recordHealthLabClientEvent("health_lab_session_complete", { userId: "parent-1", childId: 10 });
  recordHealthLabClientEvent("health_lab_quest_complete", { userId: "parent-1", childId: 10 });
  recordHealthLabClientEvent("health_lab_badge_unlock", { userId: "parent-1", childId: 10 });
  recordHealthLabClientEvent("health_lab_shop_purchase", { userId: "parent-1", childId: 10 });
  recordHealthLabClientEvent("health_lab_permission_denied", { userId: "parent-1", childId: 10 });
  recordHealthLabSyncOutcome(false);

  const counts = getHealthLabMetricCounts();
  assert.equal(counts.health_lab_session_start, 1);
  assert.equal(counts.health_lab_session_complete, 1);
  assert.equal(counts.health_lab_quest_complete, 1);
  assert.equal(counts.health_lab_badge_unlock, 1);
  assert.equal(counts.health_lab_shop_purchase, 1);
  assert.equal(counts.health_lab_permission_denied, 1);
  assert.equal(counts.health_lab_sync_failure, 1);
  assert.equal(counts.health_lab_dau_users, 1);

  const dash = getHealthLabDashboardSnapshot();
  assert.ok(dash.generatedAt);
  assert.equal(dash.dailyActiveUsers, 1);
  assert.ok(dash.rates.syncFailureRate >= 0);
});

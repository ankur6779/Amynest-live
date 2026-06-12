import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getHealthLabDashboardSnapshot,
  getHealthLabMetricCounts,
  recordHealthLabClientEvent,
  recordHealthLabSyncOutcome,
  resetHealthLabMetricsForTests,
} from "../health-lab-metrics-store.js";

test("recordHealthLabClientEvent increments counters", () => {
  resetHealthLabMetricsForTests();
  recordHealthLabClientEvent("health_lab_session_start", { childId: 1, userId: "u1" });
  recordHealthLabClientEvent("health_lab_session_complete", { childId: 1, userId: "u1" });
  const counts = getHealthLabMetricCounts();
  assert.equal(counts.health_lab_session_start, 1);
  assert.equal(counts.health_lab_session_complete, 1);
  assert.equal(counts.health_lab_dau_users, 1);
});

test("recordHealthLabSyncOutcome tracks sync success and failure", () => {
  resetHealthLabMetricsForTests();
  recordHealthLabSyncOutcome(true);
  recordHealthLabSyncOutcome(false);
  const counts = getHealthLabMetricCounts();
  assert.equal(counts.health_lab_sync_success, 1);
  assert.equal(counts.health_lab_sync_failure, 1);
});

test("getHealthLabDashboardSnapshot returns rates", () => {
  resetHealthLabMetricsForTests();
  recordHealthLabClientEvent("health_lab_session_start", { userId: "u1" });
  recordHealthLabClientEvent("health_lab_quest_complete", { userId: "u1" });
  const snap = getHealthLabDashboardSnapshot();
  assert.ok(snap.generatedAt);
  assert.equal(snap.gamesPlayed24h, 0);
  assert.ok(snap.rates.questCompletionRate >= 0);
});

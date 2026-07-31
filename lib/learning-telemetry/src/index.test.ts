import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ALERT_DEFINITIONS,
  createLearningTelemetryCollector,
  formatTelemetryReport,
  DEFAULT_ALERT_THRESHOLDS,
} from "./index.js";

test("collector records runtime / bus / kg and computes health", () => {
  const c = createLearningTelemetryCollector({
    thresholds: { runtimeLatencyMs: 5, queueDepth: 2 },
  });

  c.recordRuntime({
    latencyMs: 1.2,
    ruleId: "runtime.success_streak",
    matchedRuleCount: 2,
    ruleEvaluations: 10,
    cooldownHits: 1,
    reviewQueueSize: 3,
    recommendationNodeId: "entity:lion",
    nextActivityNodeId: "entity:tiger",
    eventType: "learning.item_recognized",
    childId: "1",
  });
  c.recordBus({ kind: "publish", latencyMs: 0.2, queued: false, queueDepth: 0 });
  c.recordBus({ kind: "duplicate" });
  c.recordKg({
    kind: "snapshot",
    nodeCount: 40,
    edgeCount: 80,
    bytes: 12_000,
  });
  c.recordKnowledgeUpdate();
  c.recordAttentionTransition("focused", "fatigued");

  const snap = c.snapshot();
  assert.equal(snap.schemaVersion, 1);
  assert.equal(snap.runtime.decisions, 1);
  assert.equal(snap.runtime.recommendationIgnored, 1);
  assert.equal(snap.bus.duplicatesPrevented, 1);
  assert.equal(snap.kg.nodeCount, 40);
  assert.ok(snap.healthScore >= 0 && snap.healthScore <= 100);
  assert.ok(snap.topSlowRules.length >= 1);

  const text = formatTelemetryReport(snap);
  assert.ok(text.includes("Health"));
  assert.ok(text.includes("Event bus"));
});

test("alerts fire when thresholds exceeded", () => {
  const c = createLearningTelemetryCollector({
    thresholds: {
      ...DEFAULT_ALERT_THRESHOLDS,
      runtimeLatencyMs: 1,
      queueDepth: 1,
      repairWindowCount: 2,
      repairWindowMs: 60_000,
    },
  });

  c.recordRuntime({
    latencyMs: 20,
    ruleId: "slow",
    matchedRuleCount: 1,
    reviewQueueSize: 0,
    eventType: "learning.item_heard",
    childId: "x",
  });
  c.recordBus({ kind: "publish", latencyMs: 0, queued: true, queueDepth: 5 });
  c.recordKg({ kind: "repair", reason: "corrupt", durationMs: 1 });
  c.recordKg({ kind: "repair", reason: "corrupt", durationMs: 1 });

  const snap = c.snapshot();
  const ids = new Set(snap.alerts.map((a) => a.id));
  assert.ok(ids.has("runtime_latency_high"));
  assert.ok(ids.has("queue_depth_high"));
  assert.ok(ids.has("repair_spike"));
});

test("alert definitions cover required production signals", () => {
  const ids = ALERT_DEFINITIONS.map((d) => d.id);
  for (const required of [
    "runtime_latency_high",
    "queue_depth_high",
    "repair_spike",
    "storage_limit",
    "recommendations_repetitive",
  ]) {
    assert.ok(ids.includes(required as (typeof ids)[number]), required);
  }
});

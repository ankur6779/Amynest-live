import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  applyAdminOpsAction,
  getAdminOpsState,
  resetAdminOpsStoreForTests,
} from "../admin-ops-store.js";
import { recordApiHealthSample, resetApiHealthStoreForTests } from "../api-health-store.js";
import {
  ingestAudioHealthEvents,
  resetAudioHealthStoreForTests,
} from "../audio-health-store.js";
import {
  collectSystemMetrics,
  resetSystemHealthStoreForTests,
  updateSystemHealthFromMetrics,
} from "../system-health-store.js";
import {
  enableSafeMode,
  resetSelfHealingControllerForTests,
} from "../self-healing-controller.js";
import { resetHealStabilityGuardForTests } from "../heal-stability-guard.js";
import { resetHealHysteresisForTests } from "../heal-hysteresis.js";

describe("self-healing system", () => {
  beforeEach(() => {
    resetAdminOpsStoreForTests();
    resetApiHealthStoreForTests();
    resetAudioHealthStoreForTests();
    resetSystemHealthStoreForTests();
    resetSelfHealingControllerForTests();
    resetHealStabilityGuardForTests();
    resetHealHysteresisForTests();
  });

  it("marks API unhealthy when error rate exceeds threshold", async () => {
    for (let i = 0; i < 10; i++) {
      recordApiHealthSample({
        route: "generate",
        success: i < 4,
        latencyMs: 400,
      });
    }

    const metrics = await collectSystemMetrics();
    const health = updateSystemHealthFromMetrics(metrics);

    assert.ok(metrics.apiErrorRate > 0.05);
    assert.equal(health.apiHealthy, false);
  });

  it("enableSafeMode disables streaming and API", () => {
    enableSafeMode({
      audioFailureRate: 0.08,
      fallbackRate: 0.1,
      avgTTFA: 1500,
      streamingStallRate: 0,
      apiErrorRate: 0,
      workerQueueDelayMs: 0,
      cacheHitRate: 0.5,
      dbLatencyMs: 50,
      redisHealthy: true,
    });

    const ops = getAdminOpsState();
    assert.equal(ops.safeMode, true);
    assert.equal(ops.disableStreaming, true);
    assert.equal(ops.disableApi, true);
    assert.equal(ops.forceEmergencyMode, true);
  });

  it("detects streaming stall rate from layer health", async () => {
    for (let i = 0; i < 12; i++) {
      ingestAudioHealthEvents([
        {
          event: i < 4 ? "audio_success" : "audio_failure",
          module: "lesson",
          layer: "streaming",
          device: "mid",
          network: "fast",
          timestamp: Date.now(),
        },
      ]);
    }

    const metrics = await collectSystemMetrics();
    assert.ok(metrics.streamingStallRate > 0.1);
  });

  it("respects manual admin lock for self-heal actor", () => {
    applyAdminOpsAction("enable_streaming", "admin-user");
    applyAdminOpsAction("disable_streaming", "self-heal");

    const ops = getAdminOpsState();
    assert.equal(ops.disableStreaming, false);
  });
});

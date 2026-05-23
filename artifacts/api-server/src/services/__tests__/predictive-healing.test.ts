import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  appendMetricSample,
  detectAnomaly,
  getMetricsHistory,
  isIncreasingTrend,
  isRisingFast,
  resetPredictiveTrendStoreForTests,
} from "../predictive-trend-store.js";
import {
  disableDegradedMode,
  enableDegradedMode,
  getPredictiveOpsState,
  resetPredictiveOpsStoreForTests,
  setDegradedEnteredAtForTests,
} from "../predictive-ops-store.js";
import {
  resetPredictiveHealingControllerForTests,
  runPredictiveHealTick,
} from "../predictive-healing-controller.js";
import { resetAdminOpsStoreForTests } from "../admin-ops-store.js";
import { resetHealStabilityGuardForTests } from "../heal-stability-guard.js";
import { resetHealHysteresisForTests } from "../heal-hysteresis.js";
import { resetAudioHealthStoreForTests, ingestAudioHealthEvents } from "../audio-health-store.js";
import { recordApiHealthSample, resetApiHealthStoreForTests } from "../api-health-store.js";
import { applyPredictiveStrategyAdjustments } from "../predictive-strategy.js";
import { resolveTtsStrategy, _resetTtsIntelligenceForTests } from "../ttsIntelligenceService.js";

describe("predictive healing", () => {
  beforeEach(() => {
    resetPredictiveTrendStoreForTests();
    resetPredictiveOpsStoreForTests();
    resetPredictiveHealingControllerForTests();
    resetAdminOpsStoreForTests();
    resetAudioHealthStoreForTests();
    resetApiHealthStoreForTests();
    resetHealStabilityGuardForTests();
    resetHealHysteresisForTests();
    _resetTtsIntelligenceForTests();
  });

  it("detects strictly increasing trends", () => {
    assert.equal(isIncreasingTrend([0.01, 0.02, 0.03]), true);
    assert.equal(isIncreasingTrend([0.03, 0.02, 0.04]), false);
  });

  it("detects anomalies above 1.5× average", () => {
    const history = [100, 110, 105, 108];
    assert.equal(detectAnomaly(200, history), true);
    assert.equal(detectAnomaly(120, history), false);
  });

  it("detects fast-rising stall rate", () => {
    assert.equal(isRisingFast([0.02, 0.03, 0.09]), true);
  });

  it("enableDegradedMode reduces API usage and boosts cache", () => {
    enableDegradedMode();
    const ops = getPredictiveOpsState();
    assert.equal(ops.degradedMode, true);
    assert.equal(ops.apiUsageFactor, 0.5);
    assert.ok(ops.layerWeights.cache > ops.layerWeights.api);
    assert.equal(ops.prefetchDepth, 2);
  });

  it("preemptively reduces API on increasing error trend after confirmation", () => {
    for (let i = 0; i < 3; i++) {
      recordApiHealthSample({
        route: "generate",
        success: i === 0,
        latencyMs: 400,
      });
      appendMetricSample({
        apiErrorRate: 0.02 + i * 0.015,
        ttfa: 500,
        streamingStallRate: 0.02,
        failureRate: 0.01,
      });
    }

    runPredictiveHealTick();
    runPredictiveHealTick();

    const ops = getPredictiveOpsState();
    assert.ok(ops.apiUsageFactor <= 0.5);
  });

  it("merges predictive weights into TTS strategy", () => {
    enableDegradedMode();
    const enriched = applyPredictiveStrategyAdjustments(resolveTtsStrategy());
    assert.equal(enriched.degradedMode, true);
    assert.ok(enriched.layerWeights.cache >= enriched.layerWeights.api);
    assert.equal(enriched.prefetchDepth, 2);
    assert.equal(enriched.preferredLayers[0], "cache");
  });

  it("disables degraded mode only after cooldown and stable metrics", () => {
    enableDegradedMode();
    setDegradedEnteredAtForTests(Date.now() - 130_000);

    for (let i = 0; i < 5; i++) {
      appendMetricSample({
        apiErrorRate: 0.01,
        ttfa: 500,
        streamingStallRate: 0.02,
        failureRate: 0.01,
      });
    }

    runPredictiveHealTick();
    assert.equal(getPredictiveOpsState().degradedMode, false);
  });

  it("prioritizes cache on high TTFA trend after two confirmed ticks", () => {
    for (const ttfa of [820, 900, 980, 990]) {
      ingestAudioHealthEvents([
        {
          event: "audio_start",
          module: "lesson",
          layer: "api",
          ttfaMs: ttfa,
          device: "mid",
          network: "fast",
          timestamp: Date.now(),
        },
      ]);
      runPredictiveHealTick();
    }

    const ops = getPredictiveOpsState();
    assert.ok(ops.layerWeights.cache >= ops.layerWeights.api);
    assert.ok(ops.prefetchDepth >= 2);
  });
});

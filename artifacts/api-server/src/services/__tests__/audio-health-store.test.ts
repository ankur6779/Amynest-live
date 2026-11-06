import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getAudioHealthDashboard,
  getAudioSloSnapshot,
  getSelfHealAudioSignals,
  ingestAudioHealthEvents,
  resetAudioHealthStoreForTests,
  SELF_HEAL_AUDIO_MIN_SAMPLES,
} from "../audio-health-store.js";

describe("audio-health-store", () => {
  beforeEach(() => {
    resetAudioHealthStoreForTests();
  });

  it("aggregates rolling metrics and healthy status", () => {
    ingestAudioHealthEvents([
      {
        event: "audio_start",
        module: "lesson",
        layer: "cache",
        ttfaMs: 900,
        device: "mid",
        network: "fast",
        timestamp: Date.now(),
      },
      {
        event: "audio_success",
        module: "lesson",
        layer: "cache",
        success: true,
        totalDurationMs: 4000,
        device: "mid",
        network: "fast",
        timestamp: Date.now(),
      },
    ]);

    const dash = getAudioHealthDashboard();
    assert.ok(dash.totalRequests > 0);
    assert.ok(dash.successRate > 0);
    assert.equal(dash.status, "healthy");
    assert.equal(dash.perModuleStats.find((m) => m.module === "lesson")?.success, 1);
  });

  it("flags failure rate alerts", () => {
    for (let i = 0; i < 10; i++) {
      ingestAudioHealthEvents([
        {
          event: "audio_failure",
          module: "phonics",
          layer: "api",
          success: false,
          errorType: "audio_start_timeout",
          device: "low",
          network: "slow",
          timestamp: Date.now(),
        },
      ]);
    }

    const dash = getAudioHealthDashboard();
    assert.ok(dash.failureRate > 0.05);
    assert.equal(dash.status, "failing");
    assert.ok(dash.alerts.some((a) => a.code === "system_failing"));
    assert.ok(dash.errorFeed.length > 0);
  });

  it("ignores single-user forged failures for self-heal actuation signals", () => {
    for (let i = 0; i < SELF_HEAL_AUDIO_MIN_SAMPLES + 5; i++) {
      ingestAudioHealthEvents([
        {
          event: "audio_failure",
          module: "lesson",
          layer: "api",
          device: "mid",
          network: "fast",
          timestamp: Date.now(),
          userId: "attacker",
        },
      ]);
    }

    const dash = getAudioHealthDashboard();
    assert.ok(dash.failureRate > 0.05);

    const signals = getSelfHealAudioSignals();
    assert.equal(signals.trusted, false);
    assert.equal(signals.failureRate, 0);
    assert.equal(signals.streamingStallRate, 0);
    assert.equal(signals.distinctFailureUsers, 1);
  });

  it("trusts multi-user failure quorum for self-heal actuation", () => {
    for (let user = 0; user < 3; user++) {
      for (let i = 0; i < 8; i++) {
        ingestAudioHealthEvents([
          {
            event: i < 2 ? "audio_success" : "audio_failure",
            module: "lesson",
            layer: "api",
            device: "mid",
            network: "fast",
            timestamp: Date.now(),
            userId: `parent-${user}`,
          },
        ]);
      }
    }

    const signals = getSelfHealAudioSignals();
    assert.equal(signals.trusted, true);
    assert.ok(signals.failureRate > 0.05);
    assert.ok(signals.distinctFailureUsers >= 2);
    assert.ok(signals.sampleCount >= SELF_HEAL_AUDIO_MIN_SAMPLES);
  });

  it("exposes TTFA p50/p95 SLO metrics", () => {
    const samples = [400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300];
    for (const ttfaMs of samples) {
      ingestAudioHealthEvents([
        {
          event: "audio_start",
          module: "coach",
          layer: "static",
          ttfaMs,
          device: "mid",
          network: "fast",
          timestamp: Date.now(),
        },
      ]);
    }

    const dash = getAudioHealthDashboard();
    assert.ok(dash.ttfaP50 > 0);
    assert.ok(dash.ttfaP95 >= dash.ttfaP50);
    assert.equal(dash.ttfaSlo.sampleCount, samples.length);
    assert.equal(dash.ttfaSlo.p95TargetMs, 1200);

    const slo = getAudioSloSnapshot();
    assert.equal(slo.ttfa.p95, dash.ttfaP95);
    assert.ok(slo.byModule.coach.sampleCount > 0);
    assert.ok(dash.trends24h.length === 24);
    const withTtfa = dash.trends24h.filter((b) => b.ttfaSampleCount > 0);
    assert.ok(withTtfa.length > 0);
    assert.ok(withTtfa.every((b) => b.ttfaP95 >= b.ttfaP50));
  });
});

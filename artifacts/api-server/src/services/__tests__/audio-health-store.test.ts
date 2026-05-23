import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getAudioHealthDashboard,
  ingestAudioHealthEvents,
  resetAudioHealthStoreForTests,
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
});

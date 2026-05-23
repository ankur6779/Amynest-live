import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  _resetTtsIntelligenceForTests,
  ingestTtsTelemetry,
  resolveTtsStrategy,
  type TtsTelemetryEvent,
} from "../ttsIntelligenceService.js";

function event(partial: Partial<TtsTelemetryEvent>): TtsTelemetryEvent {
  return {
    cacheKeyHash: "abc123",
    layer: "static",
    success: true,
    latency: 200,
    deviceClass: "mid",
    networkType: "fast",
    textLength: 40,
    ...partial,
  };
}

describe("ttsIntelligenceService", () => {
  beforeEach(() => {
    _resetTtsIntelligenceForTests();
  });

  it("aggregates layer preference from telemetry", () => {
    for (let i = 0; i < 10; i++) {
      ingestTtsTelemetry([event({ layer: "static", success: true, latency: 180 })]);
    }
    for (let i = 0; i < 6; i++) {
      ingestTtsTelemetry([event({ layer: "api", success: false, latency: 3000 })]);
    }

    const strategy = resolveTtsStrategy({ networkType: "fast" });
    assert.equal(strategy.preferredLayers[0], "static");
    assert.equal(strategy.apiDegraded, false);
  });

  it("marks api degraded on failure spike", () => {
    for (let i = 0; i < 15; i++) {
      ingestTtsTelemetry([event({ layer: "api", success: false, latency: 4000 })]);
    }

    const strategy = resolveTtsStrategy();
    assert.equal(strategy.apiDegraded, true);
    assert.ok((strategy.penalties.api ?? 0) >= 0.35);
  });

  it("stores transition probabilities", () => {
    ingestTtsTelemetry([
      event({
        fromKeyHash: "from-a",
        toKeyHash: "to-b",
        cacheKeyHash: "from-a",
      }),
      event({
        fromKeyHash: "from-a",
        toKeyHash: "to-b",
        cacheKeyHash: "to-b",
      }),
    ]);

    const strategy = resolveTtsStrategy();
    assert.ok(strategy.transitions["from-a"]?.["to-b"] === 2);
  });

  it("rejects invalid layer names", () => {
    const result = ingestTtsTelemetry([
      {
        cacheKeyHash: "x",
        layer: "invalid" as "api",
        success: true,
        latency: 1,
        deviceClass: "mid",
        networkType: "fast",
        textLength: 1,
      },
    ]);
    assert.equal(result.accepted, 0);
  });
});

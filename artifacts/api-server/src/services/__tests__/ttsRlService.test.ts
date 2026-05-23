import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  _resetTtsRlForTests,
  ingestRlTelemetry,
  resolveRlStrategy,
} from "../ttsRlService.js";

describe("ttsRlService", () => {
  beforeEach(() => {
    _resetTtsRlForTests();
  });

  it("aggregates Q-values from rewards", () => {
    for (let i = 0; i < 5; i++) {
      ingestRlTelemetry([
        {
          contextKey: "mid:fast:default:short:morning",
          layer: "cache",
          reward: 0.8,
          ttfaMs: 180,
          bufferingEvents: 0,
          success: true,
          streaming: false,
        },
      ]);
    }
    const strategy = resolveRlStrategy();
    assert.ok(strategy.qValues.cache > 0.5);
  });

  it("boosts streaming when api stream succeeds", () => {
    for (let i = 0; i < 8; i++) {
      ingestRlTelemetry([
        {
          contextKey: "x",
          layer: "api",
          reward: 0.9,
          ttfaMs: 150,
          bufferingEvents: 0,
          success: true,
          streaming: true,
        },
      ]);
    }
    const strategy = resolveRlStrategy();
    assert.ok(strategy.streamingBoost >= 0.05);
  });
});

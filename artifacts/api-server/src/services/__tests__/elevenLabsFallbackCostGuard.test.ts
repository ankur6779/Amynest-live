import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  clearTtsCostGuardForTests,
  TtsRateLimitedError,
} from "../ttsCostGuardService.js";
import {
  getTtsCostAnalyticsCounts,
  resetTtsCostAnalyticsForTests,
} from "../tts-cost-analytics-store.js";
import { synthesizeElevenLabsFallback } from "../elevenLabsFallbackService.js";

describe("elevenLabsFallback cost guard", () => {
  beforeEach(() => {
    clearTtsCostGuardForTests();
    resetTtsCostAnalyticsForTests();
  });

  it("throws before quota when fallback is disabled", async () => {
    await assert.rejects(
      () =>
        synthesizeElevenLabsFallback(
          "hello",
          { mode: "default" },
          { userId: "u-eleven", route: "tts/elevenlabs-fallback" },
        ),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.equal(err.message, "tts_elevenlabs_fallback_disabled");
        return true;
      },
    );
    assert.equal(getTtsCostAnalyticsCounts().tts_rate_limited, 0);
  });

  it("TtsRateLimitedError uses shared tts_rate_limited error code", () => {
    const err = new TtsRateLimitedError({
      ok: false,
      reason: "daily",
      limit: 50,
      used: 50,
      isPremium: false,
    });
    assert.equal(err.message, "tts_rate_limited");
  });
});

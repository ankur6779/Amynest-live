import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { checkAiRateLimit, clearAiRateLimits } from "../../utils/ai-rate-limit.js";
import {
  clearTtsCostGuardForTests,
  evaluateDailyTtsQuota,
  TtsRateLimitedError,
  ttsRateLimitResponseBody,
} from "../ttsCostGuardService.js";
import {
  getTtsCostAnalyticsCounts,
  recordTtsCostEvent,
  resetTtsCostAnalyticsForTests,
} from "../tts-cost-analytics-store.js";
import { FREE_FEATURE_LIMITS } from "../subscriptionService.js";

describe("ai-rate-limit options", () => {
  beforeEach(() => clearAiRateLimits());

  it("supports per-call max and window", () => {
    for (let i = 0; i < 3; i++) {
      const r = checkAiRateLimit("tts-test", { maxPerWindow: 3, windowMs: 60_000 });
      assert.equal(r.allowed, true);
    }
    const blocked = checkAiRateLimit("tts-test", { maxPerWindow: 3, windowMs: 60_000 });
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterMs > 0);
  });

  it("isolates buckets by max/window config", () => {
    assert.equal(
      checkAiRateLimit("u1", { maxPerWindow: 1, windowMs: 60_000 }).allowed,
      true,
    );
    assert.equal(
      checkAiRateLimit("u1", { maxPerWindow: 5, windowMs: 60_000 }).allowed,
      true,
    );
  });
});

describe("evaluateDailyTtsQuota", () => {
  it("allows reserve when under limit", () => {
    const r = evaluateDailyTtsQuota(10, 50, 1);
    assert.equal(r.allowed, true);
    if (r.allowed) assert.equal(r.nextUsed, 11);
  });

  it("blocks when reserve would exceed limit", () => {
    const r = evaluateDailyTtsQuota(50, 50, 1);
    assert.equal(r.allowed, false);
    if (!r.allowed) {
      assert.equal(r.used, 50);
      assert.equal(r.limit, 50);
    }
  });
});

describe("tts burst guard", () => {
  beforeEach(() => {
    clearTtsCostGuardForTests();
    resetTtsCostAnalyticsForTests();
  });

  it("blocks after free-tier burst limit", () => {
    const burstLimit = 10;
    for (let i = 0; i < burstLimit; i++) {
      const r = checkAiRateLimit("tts:burst:free-user", {
        maxPerWindow: burstLimit,
        windowMs: 60_000,
      });
      assert.equal(r.allowed, true, `attempt ${i + 1}`);
    }
    const blocked = checkAiRateLimit("tts:burst:free-user", {
      maxPerWindow: burstLimit,
      windowMs: 60_000,
    });
    assert.equal(blocked.allowed, false);
    recordTtsCostEvent("tts_rate_limited", {
      userId: "free-user",
      route: "tts/generate",
      reason: "burst",
    });
    assert.equal(getTtsCostAnalyticsCounts().tts_rate_limited, 1);
  });

  it("premium burst bucket allows more per minute", () => {
    const freeLimit = 10;
    const premiumLimit = 30;
    for (let i = 0; i < freeLimit; i++) {
      checkAiRateLimit("tts:burst:free-user", {
        maxPerWindow: freeLimit,
        windowMs: 60_000,
      });
    }
    assert.equal(
      checkAiRateLimit("tts:burst:free-user", {
        maxPerWindow: freeLimit,
        windowMs: 60_000,
      }).allowed,
      false,
    );

    for (let i = 0; i < premiumLimit; i++) {
      const r = checkAiRateLimit("tts:burst:premium-user", {
        maxPerWindow: premiumLimit,
        windowMs: 60_000,
      });
      assert.equal(r.allowed, true, `premium attempt ${i + 1}`);
    }
    assert.equal(
      checkAiRateLimit("tts:burst:premium-user", {
        maxPerWindow: premiumLimit,
        windowMs: 60_000,
      }).allowed,
      false,
    );
  });
});

describe("tts cost analytics", () => {
  beforeEach(() => resetTtsCostAnalyticsForTests());

  it("tracks generated, cache hit/miss, and rate limited events", () => {
    recordTtsCostEvent("tts_cache_hit", { userId: "u1", route: "tts/generate" });
    recordTtsCostEvent("tts_cache_miss", { userId: "u1", route: "tts/stream" });
    recordTtsCostEvent("tts_generated", { userId: "u1", route: "tts/stream" });
    recordTtsCostEvent("tts_rate_limited", {
      userId: "u1",
      route: "tts/pregenerate",
      reason: "daily",
    });

    const counts = getTtsCostAnalyticsCounts();
    assert.equal(counts.tts_cache_hit, 1);
    assert.equal(counts.tts_cache_miss, 1);
    assert.equal(counts.tts_generated, 1);
    assert.equal(counts.tts_rate_limited, 1);
  });
});

describe("TtsRateLimitedError response body", () => {
  it("returns structured 429 payload", () => {
    const err = new TtsRateLimitedError({
      ok: false,
      reason: "daily",
      limit: FREE_FEATURE_LIMITS.tts_generation,
      used: FREE_FEATURE_LIMITS.tts_generation,
      resetsAt: "2026-05-30T00:00:00.000Z",
      isPremium: false,
    });
    const body = ttsRateLimitResponseBody(err);
    assert.equal(body.error, "tts_rate_limited");
    assert.equal(body.reason, "daily");
    assert.equal(body.limit, 50);
    assert.equal(body.used, 50);
    assert.equal(body.resetsAt, "2026-05-30T00:00:00.000Z");
  });
});

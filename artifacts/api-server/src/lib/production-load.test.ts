import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { enqueueForUser, clearUserQueues } from "./per-user-queue.js";
import {
  enqueueAiJob,
  resetAiJobQueue,
  getQueueStats,
} from "../queue/ai-job-queue.js";
import { clearJobStore, updateJob } from "../queue/ai-job-store.js";
import { clearAiRateLimits } from "../utils/ai-rate-limit.js";
import { clearPromptCache } from "../utils/ai-prompt-cache.js";
import {
  checkRoutineGenerationRateLimit,
  clearRoutineRateLimits,
} from "./routine-rate-limit.js";
import {
  getCachedRoutine,
  routineCacheKey,
  setCachedRoutine,
  clearRoutineGenerationCache,
} from "./routine-generation-cache.js";

describe("enqueueForUser", () => {
  beforeEach(() => clearUserQueues());

  it("serializes tasks per user", async () => {
    const order: number[] = [];
    const delay = (n: number, ms: number) =>
      new Promise<void>((r) =>
        setTimeout(() => {
          order.push(n);
          r();
        }, ms),
      );

    await Promise.all([
      enqueueForUser("u1", () => delay(1, 30)),
      enqueueForUser("u1", () => delay(2, 10)),
    ]);
    assert.deepEqual(order, [1, 2]);
  });
});

describe("routine rate limit", () => {
  beforeEach(() => clearRoutineRateLimits());

  it("allows 5 then blocks", () => {
    for (let i = 0; i < 5; i++) {
      assert.equal(checkRoutineGenerationRateLimit("u2").allowed, true);
    }
    const blocked = checkRoutineGenerationRateLimit("u2");
    assert.equal(blocked.allowed, false);
    if (!blocked.allowed) {
      assert.ok(blocked.retryAfterMs > 0);
    }
  });
});

describe("ai job queue", () => {
  beforeEach(() => {
    resetAiJobQueue();
    clearJobStore();
    clearAiRateLimits();
    clearPromptCache();
  });

  it("enqueues jobs with unique ids", async () => {
    const a = await enqueueAiJob("openai.chat", "u1", { namespace: "t", messages: [] });
    const b = await enqueueAiJob("openai.chat", "u2", { namespace: "t", messages: [] });
    assert.ok(a.jobId);
    assert.ok(b.jobId);
    assert.notEqual(a.jobId, b.jobId);
    const stats = await getQueueStats();
    const pending =
      "pendingCount" in stats && typeof stats.pendingCount === "number"
        ? stats.pendingCount
        : 0;
    assert.ok(pending >= 0);
  });

  it("rejects when user already has processing + queued", async () => {
    const first = await enqueueAiJob("openai.chat", "busy-user", { x: 1 });
    assert.ok(first.jobId);
    updateJob(first.jobId, { status: "processing" });
    const second = await enqueueAiJob("openai.chat", "busy-user", { x: 2 });
    assert.ok(second.jobId);
    const third = await enqueueAiJob("openai.chat", "busy-user", { x: 3 });
    assert.equal(third.jobId, "");
    assert.ok(third.retryAfterMs);
  });
});

describe("routine cache", () => {
  beforeEach(() => clearRoutineGenerationCache());

  it("stores and returns by user+child+date", () => {
    const key = routineCacheKey({
      userId: "u",
      childId: 1,
      date: "2026-05-18",
      mood: "normal",
      hasSchool: true,
    });
    setCachedRoutine(key, {
      title: "Test",
      items: [{ activity: "Breakfast", startTime: "08:00", endTime: "08:30" }],
    } as never);
    assert.equal(getCachedRoutine(key)?.title, "Test");
  });
});

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  claimCoachActiveGeneration,
  clearCoachActiveGeneration,
  findCoachActiveGeneration,
  resetCoachActiveGenerationForTests,
} from "../coach-active-generation.js";
import { clearJobStore, createJob, updateJob } from "../../queue/ai-job-store.js";

describe("coach active generation idempotency", () => {
  beforeEach(() => {
    resetCoachActiveGenerationForTests();
    clearJobStore();
  });

  it("claims a new active generation slot", async () => {
    const job = createJob("ai-coach.initial_wins", "user-1", {});
    updateJob(job.id, { status: "queued" });

    const first = await claimCoachActiveGeneration("user-1", "screen_time", {
      jobId: job.id,
      sessionId: "sess-1",
      planCacheKey: "cache-abc",
    });

    assert.equal(first.reused, false);
    assert.equal(first.active.jobId, job.id);
  });

  it("reuses active jobId on duplicate claim for same userId+goalId", async () => {
    const job = createJob("ai-coach.initial_wins", "user-1", {});
    updateJob(job.id, { status: "processing" });

    await claimCoachActiveGeneration("user-1", "screen_time", {
      jobId: job.id,
      sessionId: "sess-1",
      planCacheKey: "cache-abc",
    });

    const second = await claimCoachActiveGeneration("user-1", "screen_time", {
      jobId: "other-job-id",
      sessionId: "sess-2",
      planCacheKey: "cache-xyz",
    });

    assert.equal(second.reused, true);
    assert.equal(second.active.jobId, job.id);
    assert.equal(second.active.sessionId, "sess-1");
  });

  it("allows a new generation after prior job is terminal", async () => {
    const job = createJob("ai-coach.initial_wins", "user-1", {});
    updateJob(job.id, { status: "processing" });

    await claimCoachActiveGeneration("user-1", "sleep", {
      jobId: job.id,
      sessionId: "sess-1",
      planCacheKey: "cache-1",
    });

    updateJob(job.id, { status: "completed", result: { raw: "{}" } });

    const found = await findCoachActiveGeneration("user-1", "sleep");
    assert.equal(found, null);

    const nextJob = createJob("ai-coach.initial_wins", "user-1", {});
    updateJob(nextJob.id, { status: "queued" });

    const next = await claimCoachActiveGeneration("user-1", "sleep", {
      jobId: nextJob.id,
      sessionId: "sess-2",
      planCacheKey: "cache-2",
    });

    assert.equal(next.reused, false);
    assert.equal(next.active.jobId, nextJob.id);
  });

  it("isolates active generation by goalId", async () => {
    const jobA = createJob("ai-coach.initial_wins", "user-1", {});
    updateJob(jobA.id, { status: "queued" });
    const jobB = createJob("ai-coach.initial_wins", "user-1", {});
    updateJob(jobB.id, { status: "queued" });

    await claimCoachActiveGeneration("user-1", "screen_time", {
      jobId: jobA.id,
      sessionId: "sess-a",
      planCacheKey: "cache-a",
    });
    const otherGoal = await claimCoachActiveGeneration("user-1", "sleep", {
      jobId: jobB.id,
      sessionId: "sess-b",
      planCacheKey: "cache-b",
    });

    assert.equal(otherGoal.reused, false);
    assert.equal(otherGoal.active.jobId, jobB.id);
  });

  it("clearCoachActiveGeneration removes stored slot", async () => {
    const job = createJob("ai-coach.initial_wins", "user-1", {});
    updateJob(job.id, { status: "queued" });

    await claimCoachActiveGeneration("user-1", "tantrums", {
      jobId: job.id,
      sessionId: "sess-1",
      planCacheKey: "cache-1",
    });

    await clearCoachActiveGeneration("user-1", "tantrums");
    const found = await findCoachActiveGeneration("user-1", "tantrums");
    assert.equal(found, null);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OpsScheduler } from "./engine.js";

describe("ops scheduler", () => {
  it("initializes and evaluates cron matches in timezone", () => {
    const scheduler = new OpsScheduler({
      backend: "cron",
      cron: "0 9 * * *",
      timezone: "UTC",
      holidayAware: false,
      retryMissedJobs: true,
      now: () => new Date("2026-07-28T09:00:00.000Z"),
    });
    assert.equal(scheduler.isReady(), false);
    scheduler.initialize();
    assert.equal(scheduler.isReady(), true);
    const job = scheduler.evaluate(new Date("2026-07-28T09:00:00.000Z"));
    assert.ok(job);
    assert.equal(job!.type, "GenerateDailyVideos");
    assert.equal(job!.trigger, "cron");
  });

  it("reports missed jobs as retry-eligible", () => {
    const scheduler = new OpsScheduler({
      backend: "docker",
      cron: "0 9 * * *",
      timezone: "UTC",
      retryMissedJobs: true,
      holidayAware: false,
    });
    scheduler.initialize();
    const missed = scheduler.evaluateMissedJob(
      new Date("2026-07-28T09:00:00.000Z"),
      new Date("2026-07-28T10:00:00.000Z"),
    );
    assert.equal(missed.missed, true);
    assert.equal(missed.shouldRetry, true);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildScheduledJob, cronMatches, describeTrigger } from "./engine.js";

describe("workflow scheduler", () => {
  it("matches timezone-aware cron expressions", () => {
    const at = new Date("2026-07-27T03:30:00.000Z"); // 09:00 Asia/Kolkata
    assert.equal(
      cronMatches({
        cron: "0 9 * * *",
        at,
        timezone: "Asia/Kolkata",
      }),
      true,
    );
    assert.equal(
      cronMatches({
        cron: "0 10 * * *",
        at,
        timezone: "Asia/Kolkata",
      }),
      false,
    );
  });

  it("builds jobs for coolify/docker/cloud triggers when cron matches", () => {
    const at = new Date("2026-07-27T03:30:00.000Z");
    const job = buildScheduledJob(
      {
        cron: "0 9 * * *",
        timezone: "Asia/Kolkata",
        trigger: "coolify",
        job: { type: "GenerateDailyVideos" },
      },
      at,
    );
    assert.ok(job);
    assert.equal(job?.trigger, "coolify");
    assert.match(describeTrigger("docker"), /Docker/);
    assert.match(describeTrigger("cloud"), /cloud/i);
  });
});

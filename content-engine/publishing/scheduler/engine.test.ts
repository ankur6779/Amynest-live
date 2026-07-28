import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSchedulePlan, resolveScheduledPublishAt } from "./engine.js";

describe("publishing scheduler", () => {
  it("supports immediate, scheduled, and draft modes", () => {
    const policy = {
      mode: "immediate" as const,
      timezone: "Asia/Kolkata",
      uploadOffsetMinutes: 0,
    };

    const immediate = buildSchedulePlan({
      policy,
      visibility: "public",
      uploadTime: "09:00",
      now: new Date("2026-07-27T01:00:00.000Z"),
    });
    assert.equal(immediate.mode, "immediate");
    assert.equal(immediate.visibility, "public");
    assert.ok(immediate.publishAt);

    const draft = buildSchedulePlan({
      policy,
      visibility: "public",
      modeOverride: "draft",
      uploadTime: "09:00",
    });
    assert.equal(draft.mode, "draft");
    assert.equal(draft.visibility, "draft");
    assert.equal(draft.publishAt, null);

    const scheduled = buildSchedulePlan({
      policy: { ...policy, mode: "scheduled" },
      visibility: "unlisted",
      uploadTime: "09:00",
      publishAt: "2026-07-28T03:30:00.000Z",
    });
    assert.equal(scheduled.mode, "scheduled");
    assert.equal(scheduled.visibility, "unlisted");
    assert.equal(scheduled.publishAt, "2026-07-28T03:30:00.000Z");
  });

  it("resolves timezone-aware publish timestamps", () => {
    const at = resolveScheduledPublishAt({
      uploadTime: "09:00",
      timezone: "Asia/Kolkata",
      offsetMinutes: 30,
      now: new Date("2026-07-27T01:00:00.000Z"),
    });
    assert.match(at, /^\d{4}-\d{2}-\d{2}T/);
    assert.ok(new Date(at).getTime() > Date.parse("2026-07-27T01:00:00.000Z"));
  });
});

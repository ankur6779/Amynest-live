import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateActivityIngest,
  isLikelyDuplicateTap,
  diversityMultiplier,
  ACTIVITY_COOLDOWN_MS,
  REPETITION_FULL_CAP,
  REPETITION_HARD_CAP,
  type RecentActivityEvent,
} from "./anti-spam.js";

const t = (offsetMs: number) =>
  new Date(Date.now() - offsetMs).toISOString();

const baseRecent = (
  activityId: string,
  count: number,
  spacingMs: number,
): RecentActivityEvent[] =>
  Array.from({ length: count }, (_, i) => ({
    activityId,
    section: "math" as const,
    correct: true,
    at: t(spacingMs * (count - i)),
  }));

describe("anti-spam", () => {
  it("credits a fresh activity", () => {
    const res = evaluateActivityIngest({
      activityId: "math_1",
      section: "math",
      correct: true,
      recent: [],
    });
    assert.equal(res.decision, "credit");
    assert.equal(res.xpMultiplier, 1);
  });

  it("ignores a duplicate within the cooldown", () => {
    const res = evaluateActivityIngest({
      activityId: "math_1",
      section: "math",
      correct: true,
      recent: [
        {
          activityId: "math_1",
          section: "math",
          correct: true,
          at: t(ACTIVITY_COOLDOWN_MS / 2),
        },
      ],
    });
    assert.equal(res.decision, "ignore");
    assert.equal(res.reason, "duplicate_within_cooldown");
  });

  it("diminishes credit after the repetition full cap", () => {
    const recent = baseRecent("math_1", REPETITION_FULL_CAP, ACTIVITY_COOLDOWN_MS + 1000);
    const res = evaluateActivityIngest({
      activityId: "math_1",
      section: "math",
      correct: true,
      recent,
    });
    assert.equal(res.decision, "diminish");
    assert.ok(res.xpMultiplier > 0 && res.xpMultiplier <= 0.5);
  });

  it("ignores beyond the hard cap", () => {
    const recent = baseRecent("math_1", REPETITION_HARD_CAP, ACTIVITY_COOLDOWN_MS + 1000);
    const res = evaluateActivityIngest({
      activityId: "math_1",
      section: "math",
      correct: true,
      recent,
    });
    assert.equal(res.decision, "ignore");
    assert.equal(res.reason, "repetition_hard_cap");
  });

  it("isLikelyDuplicateTap matches within cooldown", () => {
    const recent = [
      { activityId: "math_1", at: t(1_000) },
      { activityId: "math_2", at: t(1_000) },
    ];
    assert.equal(isLikelyDuplicateTap("math_1", recent), true);
    assert.equal(isLikelyDuplicateTap("math_3", recent), false);
  });

  it("diversity multiplier rewards multi-section play", () => {
    const recent: RecentActivityEvent[] = [
      { activityId: "a", section: "math", correct: true, at: t(10_000) },
      { activityId: "b", section: "phonics", correct: true, at: t(8_000) },
      { activityId: "c", section: "stories", correct: true, at: t(4_000) },
      { activityId: "d", section: "speech", correct: true, at: t(2_000) },
    ];
    assert.ok(diversityMultiplier(recent) > 1);
    assert.equal(diversityMultiplier([]), 1);
  });
});

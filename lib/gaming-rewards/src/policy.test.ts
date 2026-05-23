import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { unlockGameId, dailyLimitReached, computePointsEarned } from "./policy.ts";
import { getGameById } from "./catalog.ts";

describe("unlockGameId", () => {
  it("unlocks via streak without points", () => {
    const r = unlockGameId("odd-one-out", {
      pointsBalance: 0,
      unlocked: [],
      routineStreakDays: 5,
      isPremium: false,
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.via, "streak");
  });
});

describe("dailyLimitReached", () => {
  it("caps free users at 3", () => {
    const today = new Date().toISOString().slice(0, 10);
    const log = Array.from({ length: 3 }, () => ({
      id: "pattern-match",
      date: `${today}T12:00:00.000Z`,
      pointsEarned: 5,
      perfect: false,
    }));
    assert.equal(dailyLimitReached(log, false), true);
  });
});

describe("computePointsEarned", () => {
  it("awards max on perfect", () => {
    const g = getGameById("pattern-match")!;
    const { perfect, pointsEarned } = computePointsEarned(g, 10, 10);
    assert.equal(perfect, true);
    assert.equal(pointsEarned, g.rewardMax);
  });
});

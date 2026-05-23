import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { unlockGameId, dailyLimitReached } from "@workspace/gaming-rewards";

describe("gamingRewardsService policy (unit)", () => {
  it("premium unlocks without spending points", () => {
    const r = unlockGameId("speed-math", {
      pointsBalance: 0,
      unlocked: [],
      routineStreakDays: 0,
      isPremium: true,
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.via, "premium");
  });

  it("enforces free daily cap at 3 plays", () => {
    const today = new Date().toISOString().slice(0, 10);
    const log = Array.from({ length: 3 }, (_, i) => ({
      id: "pattern-match",
      date: `${today}T10:0${i}:00.000Z`,
      pointsEarned: 5,
      perfect: false,
    }));
    assert.equal(dailyLimitReached(log, false), true);
    assert.equal(dailyLimitReached(log, true), false);
  });
});

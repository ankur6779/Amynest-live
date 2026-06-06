import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getCoachGoalAccess } from "@workspace/coach-journey";
import { isInfantAgeMonths } from "../lib/infant-age.ts";

const MIN_FEEDING_PLAN_AGE = 6;

function isFeedingPlanAge(ageMonths: number): boolean {
  return ageMonths >= MIN_FEEDING_PLAN_AGE && isInfantAgeMonths(ageMonths);
}

describe("infant premium guards", () => {
  it("keeps all infant-problems coach topics free", () => {
    const lockedTopics = [
      "excessive-crying",
      "not-eating-solids",
      "feeding-issues",
      "frequent-night-waking",
    ];
    for (const goalId of lockedTopics) {
      assert.equal(
        getCoachGoalAccess({
          goalId,
          isPremium: false,
          completedGoalIds: [],
        }),
        "open",
        `${goalId} should be open for free users`,
      );
    }
  });

  it("allows sleep coach for babies under 24 months", () => {
    assert.equal(isInfantAgeMonths(0), true);
    assert.equal(isInfantAgeMonths(23), true);
    assert.equal(isInfantAgeMonths(24), false);
  });

  it("restricts feeding plan to 6–23 months", () => {
    assert.equal(isFeedingPlanAge(5), false);
    assert.equal(isFeedingPlanAge(6), true);
    assert.equal(isFeedingPlanAge(12), true);
    assert.equal(isFeedingPlanAge(23), true);
    assert.equal(isFeedingPlanAge(24), false);
  });

  it("rejects previous-stage ages (24+ months) for infant premium", () => {
    for (const age of [24, 30, 48]) {
      assert.equal(isInfantAgeMonths(age), false, `${age}m must not access infant premium`);
      assert.equal(isFeedingPlanAge(age), false, `${age}m must not access feeding plan`);
    }
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  COACH_JOURNEY_FREE_DAYS,
  computeCoachJourneyAccess,
  getCoachGoalAccess,
  isCoachExtendUnlocked,
  isFreeSampleCoachGoal,
  maxNewGoalsForJourneyDay,
  migrateLegacyCoachUsage,
  coachCategoryGoalCount,
} from "./index.ts";

describe("coach-journey", () => {
  it("keeps free users in an always-browseable free period", () => {
    const access = computeCoachJourneyAccess({
      isPremium: false,
      completedDays: [1, 2, 3],
      startedAt: new Date(Date.now() - 86400000),
    });
    assert.equal(access.isFreePeriod, true);
    assert.equal(access.isLocked, false);
    assert.equal(access.lockReason, "none");
  });

  it("grants the first goal in each category as try-free", () => {
    assert.equal(isFreeSampleCoachGoal("manage-tantrums"), true);
    assert.equal(isFreeSampleCoachGoal("handle-aggression"), false);
    assert.equal(isFreeSampleCoachGoal("baby-not-sleeping"), true);
    assert.equal(isFreeSampleCoachGoal("excessive-crying"), false);
    assert.equal(
      getCoachGoalAccess({
        goalId: "manage-tantrums",
        isPremium: false,
        completedGoalIds: [],
      }),
      "try-free",
    );
    assert.equal(
      getCoachGoalAccess({
        goalId: "handle-aggression",
        isPremium: false,
        completedGoalIds: [],
      }),
      "locked",
    );
  });

  it("opens every infant-problems topic for free users", () => {
    assert.equal(
      getCoachGoalAccess({
        goalId: "excessive-crying",
        isPremium: false,
        completedGoalIds: [],
      }),
      "open",
    );
    assert.equal(
      getCoachGoalAccess({
        goalId: "not-eating-solids",
        isPremium: false,
        completedGoalIds: [],
      }),
      "open",
    );
  });

  it("reopens completed free samples without premium", () => {
    assert.equal(
      getCoachGoalAccess({
        goalId: "manage-tantrums",
        isPremium: false,
        completedGoalIds: ["manage-tantrums"],
      }),
      "open",
    );
  });

  it("opens every goal for premium users", () => {
    assert.equal(
      getCoachGoalAccess({
        goalId: "handle-aggression",
        isPremium: true,
        completedGoalIds: [],
      }),
      "open",
    );
  });

  it("does not cap new goals by journey day", () => {
    assert.equal(maxNewGoalsForJourneyDay(1), Number.MAX_SAFE_INTEGER);
  });

  it("locks extend wins to premium", () => {
    const access = computeCoachJourneyAccess({
      isPremium: false,
      completedDays: [1],
      startedAt: new Date(),
    });
    assert.equal(
      isCoachExtendUnlocked({ isPremium: false, access, completedDays: [1] }),
      false,
    );
    assert.equal(isCoachExtendUnlocked({ isPremium: true, access }), true);
  });

  it("reports accurate infant category counts", () => {
    assert.equal(coachCategoryGoalCount("infant-problems"), 10);
  });

  it("migrates legacy two-topic usage", () => {
    const migrated = migrateLegacyCoachUsage([
      "manage-tantrums",
      "balance-screen-time",
    ]);
    assert.deepEqual(migrated.completedDays, [1, 2]);
    assert.equal(migrated.plansCompleted.length, 2);
    assert.equal(COACH_JOURNEY_FREE_DAYS, 3);
  });
});

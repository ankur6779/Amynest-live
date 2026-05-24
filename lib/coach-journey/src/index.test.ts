import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  COACH_JOURNEY_FREE_DAYS,
  computeCoachJourneyAccess,
  getCoachGoalAccess,
  isCoachExtendUnlocked,
  maxNewGoalsForJourneyDay,
  migrateLegacyCoachUsage,
} from "./index.ts";

describe("coach-journey", () => {
  it("grants free period for first 3 days", () => {
    const access = computeCoachJourneyAccess({
      isPremium: false,
      completedDays: [1],
      startedAt: new Date(),
    });
    assert.equal(access.isFreePeriod, true);
    assert.equal(access.isLocked, false);
    assert.equal(access.daysCompleted, 1);
    assert.equal(access.currentDay, 2);
  });

  it("locks after 3 completed days", () => {
    const access = computeCoachJourneyAccess({
      isPremium: false,
      completedDays: [1, 2, 3],
      startedAt: new Date(Date.now() - 86400000),
    });
    assert.equal(access.isFreePeriod, false);
    assert.equal(access.isLocked, true);
    assert.equal(access.lockReason, "completed");
  });

  it("locks after calendar cap expires", () => {
    const access = computeCoachJourneyAccess({
      isPremium: false,
      completedDays: [1],
      startedAt: new Date(Date.now() - 8 * 86400000),
    });
    assert.equal(access.isLocked, true);
    assert.equal(access.lockReason, "expired");
  });

  it("unlocks goals progressively by journey day", () => {
    const access = computeCoachJourneyAccess({
      isPremium: false,
      completedDays: [],
      startedAt: new Date(),
    });
    assert.equal(maxNewGoalsForJourneyDay(access.currentDay), 1);
    assert.equal(
      getCoachGoalAccess({
        goalId: "manage-tantrums",
        isPremium: false,
        access,
        completedGoalIds: [],
      }),
      "try-free",
    );
    assert.equal(
      getCoachGoalAccess({
        goalId: "manage-tantrums",
        isPremium: false,
        access,
        completedGoalIds: ["manage-tantrums"],
      }),
      "open",
    );
    assert.equal(
      getCoachGoalAccess({
        goalId: "balance-screen-time",
        isPremium: false,
        access,
        completedGoalIds: ["manage-tantrums"],
      }),
      "locked",
    );
  });

  it("opens all free goals on day 3", () => {
    const access = computeCoachJourneyAccess({
      isPremium: false,
      completedDays: [1, 2],
      startedAt: new Date(),
    });
    assert.equal(access.currentDay, 3);
    assert.equal(maxNewGoalsForJourneyDay(3), 13);
    assert.equal(
      getCoachGoalAccess({
        goalId: "parent-burnout",
        isPremium: false,
        access,
        completedGoalIds: ["manage-tantrums", "balance-screen-time"],
      }),
      "try-free",
    );
  });

  it("unlocks extend from day 2", () => {
    const access = computeCoachJourneyAccess({
      isPremium: false,
      completedDays: [],
      startedAt: new Date(),
    });
    assert.equal(
      isCoachExtendUnlocked({ isPremium: false, access, completedDays: [] }),
      false,
    );
    assert.equal(
      isCoachExtendUnlocked({
        isPremium: false,
        access,
        completedDays: [1],
      }),
      true,
    );
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

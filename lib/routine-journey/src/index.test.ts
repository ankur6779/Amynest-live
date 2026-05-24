import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ROUTINE_JOURNEY_FREE_GENERATIONS,
  canGenerateRoutine,
  computeRoutineJourneyAccess,
  migrateLegacyRoutineUsage,
} from "./index.ts";

describe("routine-journey", () => {
  it("grants free period for first 3 generations", () => {
    const access = computeRoutineJourneyAccess({
      isPremium: false,
      completedDays: [1],
      startedAt: new Date(),
    });
    assert.equal(access.isFreePeriod, true);
    assert.equal(access.isLocked, false);
    assert.equal(access.generationsUsed, 1);
    assert.equal(access.currentDay, 2);
    assert.equal(
      canGenerateRoutine({ isPremium: false, access }),
      true,
    );
  });

  it("locks after 3 completed generations", () => {
    const access = computeRoutineJourneyAccess({
      isPremium: false,
      completedDays: [1, 2, 3],
      startedAt: new Date(Date.now() - 86400000),
    });
    assert.equal(access.isFreePeriod, false);
    assert.equal(access.isLocked, true);
    assert.equal(access.lockReason, "completed");
    assert.equal(access.generationsUsed, ROUTINE_JOURNEY_FREE_GENERATIONS);
    assert.equal(
      canGenerateRoutine({ isPremium: false, access }),
      false,
    );
  });

  it("locks after calendar cap expires", () => {
    const access = computeRoutineJourneyAccess({
      isPremium: false,
      completedDays: [1],
      startedAt: new Date(Date.now() - 8 * 86400000),
    });
    assert.equal(access.isLocked, true);
    assert.equal(access.lockReason, "expired");
  });

  it("migrates legacy two-generation usage", () => {
    const migrated = migrateLegacyRoutineUsage(2);
    assert.deepEqual(migrated.completedDays, [1, 2]);
    assert.equal(migrated.generationsCompleted.length, 2);
  });
});

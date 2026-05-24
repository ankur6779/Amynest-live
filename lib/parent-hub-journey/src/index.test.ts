import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeHubJourneyAccess,
  HUB_JOURNEY_FREE_DAYS,
  isHubFeatureExempt,
  isHubJourneyFeatureLocked,
} from "./index.ts";

describe("parent-hub-journey", () => {
  it("grants free period for first 3 days", () => {
    const access = computeHubJourneyAccess({
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
    const access = computeHubJourneyAccess({
      isPremium: false,
      completedDays: [1, 2, 3],
      startedAt: new Date(Date.now() - 86400000),
    });
    assert.equal(access.isFreePeriod, false);
    assert.equal(access.isLocked, true);
    assert.equal(access.lockReason, "completed");
  });

  it("locks after calendar cap expires", () => {
    const access = computeHubJourneyAccess({
      isPremium: false,
      completedDays: [1],
      startedAt: new Date(Date.now() - 8 * 86400000),
    });
    assert.equal(access.isLocked, true);
    assert.equal(access.lockReason, "expired");
  });

  it("exempts PTM and emotional after lock", () => {
    const access = computeHubJourneyAccess({
      isPremium: false,
      completedDays: [1, 2, 3],
      startedAt: new Date(),
    });
    assert.equal(isHubFeatureExempt("hub_ptm_prep"), true);
    assert.equal(
      isHubJourneyFeatureLocked("hub_ptm_prep", access, []),
      false,
    );
    assert.equal(
      isHubJourneyFeatureLocked("hub_phonics", access, []),
      true,
    );
  });

  it("bonus unlocks open specific tiles", () => {
    const access = computeHubJourneyAccess({
      isPremium: false,
      completedDays: [1, 2, 3],
      startedAt: new Date(),
    });
    assert.equal(
      isHubJourneyFeatureLocked("hub_activities", access, ["hub_activities"]),
      false,
    );
  });

  it("premium never locks", () => {
    const access = computeHubJourneyAccess({
      isPremium: true,
      completedDays: [],
      startedAt: new Date(),
    });
    assert.equal(access.isLocked, false);
    assert.equal(HUB_JOURNEY_FREE_DAYS, 3);
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildPhonicsJourneyMeta,
  capPhonicsCatalog,
  computeHubJourneyAccess,
  HUB_JOURNEY_FREE_DAYS,
  isHubFeatureExempt,
  isHubJourneyFeatureLocked,
  isPhonicsSubItemUnlocked,
  phonicsItemLimitForJourneyDay,
  phonicsPremiumItemLimit,
  computePhonicsDripDay,
  buildPhonicsPremiumMeta,
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

  it("caps phonics catalog by journey day", () => {
    const all = Array.from({ length: 20 }, (_, i) => ({ id: i }));
    assert.equal(capPhonicsCatalog(all, 1).length, 4);
    assert.equal(capPhonicsCatalog(all, 2).length, 8);
    assert.equal(capPhonicsCatalog(all, 3).length, 10);
    assert.equal(phonicsItemLimitForJourneyDay(99), 10);
  });

  it("unlocks phonics sub-items cumulatively", () => {
    assert.equal(isPhonicsSubItemUnlocked("phonics_test", 1), false);
    assert.equal(isPhonicsSubItemUnlocked("phonics_progress", 2), true);
    assert.equal(isPhonicsSubItemUnlocked("phonics_test", 3), true);
  });

  it("builds phonics journey meta for free day 2", () => {
    const access = computeHubJourneyAccess({
      isPremium: false,
      completedDays: [1],
      startedAt: new Date(),
    });
    const meta = buildPhonicsJourneyMeta({
      isPremium: false,
      access,
      journeyDay: 2,
      totalCatalog: 26,
    });
    assert.equal(meta.itemLimit, 8);
    assert.equal(meta.lockedCount, 18);
    assert.equal(meta.unlocksTomorrow, 2);
    assert.equal(meta.isFreePeriod, true);
  });

  it("premium drip unlocks progressively", () => {
    assert.equal(phonicsPremiumItemLimit(1, 30), 6);
    assert.equal(phonicsPremiumItemLimit(2, 30), 10);
    assert.equal(phonicsPremiumItemLimit(3, 30), 15);
    assert.equal(phonicsPremiumItemLimit(6, 30), 27);
    const { dripDay } = computePhonicsDripDay([
      { playCount: 3, lastPlayedAt: "2026-05-20T10:00:00Z", firstPlayedAt: "2026-05-20T10:00:00Z" },
    ], new Date("2026-05-21T12:00:00Z"));
    assert.equal(dripDay, 2);
    const meta = buildPhonicsPremiumMeta({ dripDay: 2, activePracticeDays: 1, totalCatalog: 26 });
    assert.equal(meta.itemLimit, 10);
    assert.equal(meta.unlocksTomorrow, 5);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Subscription } from "@workspace/db";
import {
  computeInternalTrialExpiredFlag,
  isFalselyExpiredInternalTrial,
  isNaturallyCompletedTrialExpiry,
  MIN_NATURAL_INTERNAL_TRIAL_MS,
} from "../subscription-trial-expiry.js";

function sub(partial: Partial<Subscription> = {}): Subscription {
  const now = new Date();
  return {
    userId: "u1",
    plan: "free",
    status: "free",
    provider: "none",
    subscriptionState: "FREE",
    trialEndsAt: null,
    currentPeriodEnd: null,
    expiredAt: null,
    expiresAt: null,
    createdAt: now,
    updatedAt: now,
    cancelAtPeriodEnd: 0,
    ...partial,
  } as Subscription;
}

describe("subscription-trial-expiry", () => {
  it("instant heal EXPIRED without trialEndsAt is NOT natural", () => {
    const createdAt = new Date();
    const expiredAt = new Date(createdAt.getTime() + 5_000);
    const row = sub({
      subscriptionState: "EXPIRED",
      createdAt,
      expiredAt,
      trialEndsAt: null,
    });
    assert.equal(isNaturallyCompletedTrialExpiry(row), false);
    assert.equal(isFalselyExpiredInternalTrial(row), true);
    assert.equal(computeInternalTrialExpiredFlag(row, false), false);
  });

  it("aged poison EXPIRED (row age ≥1d, trialEndsAt wiped) is NOT natural", () => {
    // Pre-fix heal wiped trialEndsAt; row age alone must not claim Trial Ended.
    const createdAt = new Date(Date.now() - MIN_NATURAL_INTERNAL_TRIAL_MS * 2);
    const expiredAt = new Date();
    const row = sub({
      subscriptionState: "EXPIRED",
      createdAt,
      expiredAt,
      trialEndsAt: null,
    });
    assert.equal(isNaturallyCompletedTrialExpiry(row), false);
    assert.equal(isFalselyExpiredInternalTrial(row), true);
    assert.equal(computeInternalTrialExpiredFlag(row, false), false);
  });

  it("natural internal trial with preserved trialEndsAt sets internalTrialExpired", () => {
    const createdAt = new Date(Date.now() - MIN_NATURAL_INTERNAL_TRIAL_MS * 3);
    const trialEndsAt = new Date(createdAt.getTime() + MIN_NATURAL_INTERNAL_TRIAL_MS * 3);
    const expiredAt = new Date(trialEndsAt.getTime() + 60_000);
    const row = sub({
      subscriptionState: "EXPIRED",
      createdAt,
      trialEndsAt,
      expiredAt,
    });
    assert.equal(isNaturallyCompletedTrialExpiry(row), true);
    assert.equal(isFalselyExpiredInternalTrial(row), false);
    assert.equal(computeInternalTrialExpiredFlag(row, false), true);
  });

  it("RevenueCat EXPIRED never sets internalTrialExpired", () => {
    const createdAt = new Date(Date.now() - MIN_NATURAL_INTERNAL_TRIAL_MS * 2);
    const trialEndsAt = new Date(createdAt.getTime() + MIN_NATURAL_INTERNAL_TRIAL_MS);
    const expiredAt = new Date();
    const row = sub({
      provider: "revenuecat",
      subscriptionState: "EXPIRED",
      createdAt,
      trialEndsAt,
      expiredAt,
    });
    assert.equal(computeInternalTrialExpiredFlag(row, false), false);
    assert.equal(isFalselyExpiredInternalTrial(row), false);
  });

  it("paid subscriber never gets internalTrialExpired", () => {
    const createdAt = new Date(Date.now() - MIN_NATURAL_INTERNAL_TRIAL_MS * 2);
    const trialEndsAt = new Date(createdAt.getTime() + MIN_NATURAL_INTERNAL_TRIAL_MS);
    const expiredAt = new Date();
    const row = sub({
      subscriptionState: "EXPIRED",
      createdAt,
      trialEndsAt,
      expiredAt,
    });
    assert.equal(computeInternalTrialExpiredFlag(row, true), false);
  });

  it("missing timestamps never claim Trial Ended", () => {
    assert.equal(
      isNaturallyCompletedTrialExpiry(
        sub({ subscriptionState: "EXPIRED", expiredAt: null }),
      ),
      false,
    );
    assert.equal(computeInternalTrialExpiredFlag(sub({ subscriptionState: "EXPIRED" }), false), false);
  });
});

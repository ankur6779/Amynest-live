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
  it("instant heal EXPIRED is NOT a natural trial completion", () => {
    const createdAt = new Date();
    const expiredAt = new Date(createdAt.getTime() + 5_000);
    const row = sub({
      subscriptionState: "EXPIRED",
      createdAt,
      expiredAt,
    });
    assert.equal(isNaturallyCompletedTrialExpiry(row), false);
    assert.equal(isFalselyExpiredInternalTrial(row), true);
    assert.equal(computeInternalTrialExpiredFlag(row, false), false);
  });

  it("natural ≥1-day internal trial sets internalTrialExpired", () => {
    const createdAt = new Date(Date.now() - MIN_NATURAL_INTERNAL_TRIAL_MS - 60_000);
    const expiredAt = new Date();
    const row = sub({
      subscriptionState: "EXPIRED",
      createdAt,
      expiredAt,
    });
    assert.equal(isNaturallyCompletedTrialExpiry(row), true);
    assert.equal(isFalselyExpiredInternalTrial(row), false);
    assert.equal(computeInternalTrialExpiredFlag(row, false), true);
  });

  it("RevenueCat EXPIRED never sets internalTrialExpired", () => {
    const createdAt = new Date(Date.now() - MIN_NATURAL_INTERNAL_TRIAL_MS * 2);
    const expiredAt = new Date();
    const row = sub({
      provider: "revenuecat",
      subscriptionState: "EXPIRED",
      createdAt,
      expiredAt,
    });
    assert.equal(computeInternalTrialExpiredFlag(row, false), false);
    assert.equal(isFalselyExpiredInternalTrial(row), false);
  });

  it("paid subscriber never gets internalTrialExpired", () => {
    const createdAt = new Date(Date.now() - MIN_NATURAL_INTERNAL_TRIAL_MS * 2);
    const expiredAt = new Date();
    const row = sub({
      subscriptionState: "EXPIRED",
      createdAt,
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

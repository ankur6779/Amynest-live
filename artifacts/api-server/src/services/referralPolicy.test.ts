import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeEarnedMilestones,
  isReferralIdentityVerified,
  revenueCatCountsForReferralPaid,
  REFERRAL_REWARD_CAP,
  REFERRAL_VALID_THRESHOLD,
  REFERRAL_PAID_THRESHOLD,
} from "./referralPolicy.js";

describe("isReferralIdentityVerified", () => {
  it("accepts verified email", () => {
    assert.equal(
      isReferralIdentityVerified({ emailVerified: true, phoneNumber: null }),
      true,
    );
  });

  it("accepts phone sign-in", () => {
    assert.equal(
      isReferralIdentityVerified({ emailVerified: false, phoneNumber: "+919999999999" }),
      true,
    );
  });

  it("rejects unverified email-only", () => {
    assert.equal(
      isReferralIdentityVerified({ emailVerified: false, phoneNumber: null }),
      false,
    );
  });
});

describe("computeEarnedMilestones", () => {
  it("requires both valid and paid thresholds", () => {
    assert.equal(computeEarnedMilestones(3, 0), 0);
    assert.equal(computeEarnedMilestones(0, 1), 0);
    assert.equal(computeEarnedMilestones(3, 1), 1);
    assert.equal(computeEarnedMilestones(6, 2), 2);
  });

  it("caps at REFERRAL_REWARD_CAP", () => {
    const over = REFERRAL_VALID_THRESHOLD * (REFERRAL_REWARD_CAP + 2);
    const paidOver = REFERRAL_PAID_THRESHOLD * (REFERRAL_REWARD_CAP + 2);
    assert.equal(computeEarnedMilestones(over, paidOver), REFERRAL_REWARD_CAP);
  });
});

describe("revenueCatCountsForReferralPaid", () => {
  it("ignores trial initial purchases", () => {
    assert.equal(
      revenueCatCountsForReferralPaid({
        type: "INITIAL_PURCHASE",
        period_type: "TRIAL",
        price: 0,
      }),
      false,
    );
  });

  it("counts normal initial purchases", () => {
    assert.equal(
      revenueCatCountsForReferralPaid({
        type: "INITIAL_PURCHASE",
        period_type: "NORMAL",
        price: 9.99,
      }),
      true,
    );
  });

  it("counts renewals after trial", () => {
    assert.equal(
      revenueCatCountsForReferralPaid({ type: "RENEWAL", period_type: "NORMAL" }),
      true,
    );
  });
});

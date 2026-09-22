import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Subscription } from "@workspace/db";
import { shouldPreserveNonRcPremiumAgainstRevenueCat } from "../subscriptionStateService.js";

function sub(partial: Partial<Subscription> = {}): Subscription {
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return {
    userId: "user-1",
    plan: "monthly",
    status: "active",
    provider: "razorpay",
    subscriptionState: "ACTIVE",
    currentPeriodEnd: future,
    expiresAt: future,
    trialEndsAt: null,
    bonusExpiresAt: null,
    gracePeriodExpiresAt: null,
    revenuecatAppUserId: "rc-leftover",
    originalTransactionId: "txn-leftover",
    ...partial,
  } as Subscription;
}

describe("shouldPreserveNonRcPremiumAgainstRevenueCat", () => {
  it("preserves live Razorpay premium with leftover RC identity", () => {
    assert.equal(shouldPreserveNonRcPremiumAgainstRevenueCat(sub()), true);
  });

  it("preserves live manual premium", () => {
    assert.equal(
      shouldPreserveNonRcPremiumAgainstRevenueCat(sub({ provider: "manual" })),
      true,
    );
  });

  it("preserves live stripe premium", () => {
    assert.equal(
      shouldPreserveNonRcPremiumAgainstRevenueCat(sub({ provider: "stripe" })),
      true,
    );
  });

  it("does not preserve RevenueCat rows (handled by RC-local preserve path)", () => {
    assert.equal(
      shouldPreserveNonRcPremiumAgainstRevenueCat(sub({ provider: "revenuecat" })),
      false,
    );
  });

  it("does not preserve provider=none", () => {
    assert.equal(
      shouldPreserveNonRcPremiumAgainstRevenueCat(sub({ provider: "none" })),
      false,
    );
  });

  it("does not preserve when paid period already ended", () => {
    const past = new Date(Date.now() - 60_000);
    assert.equal(
      shouldPreserveNonRcPremiumAgainstRevenueCat(
        sub({
          subscriptionState: "EXPIRED",
          status: "free",
          currentPeriodEnd: past,
          expiresAt: past,
        }),
      ),
      false,
    );
  });

  it("preserves cancelled Razorpay until period end", () => {
    assert.equal(
      shouldPreserveNonRcPremiumAgainstRevenueCat(
        sub({
          subscriptionState: "CANCELLED",
          status: "active",
          cancelAtPeriodEnd: 1,
        }),
      ),
      true,
    );
  });

  it("does not preserve null local row", () => {
    assert.equal(shouldPreserveNonRcPremiumAgainstRevenueCat(null), false);
  });
});

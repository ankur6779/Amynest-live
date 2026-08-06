import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Subscription } from "@workspace/db";
import { shouldPreserveLocalEntitlementOnRestoreEmptyRc } from "../rcCustomerService.js";

function sub(partial: Partial<Subscription> = {}): Subscription {
  const now = new Date();
  return {
    userId: "u1",
    plan: "monthly",
    status: "active",
    provider: "revenuecat",
    subscriptionState: "ACTIVE",
    trialEndsAt: null,
    currentPeriodEnd: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    expiredAt: null,
    expiresAt: null,
    createdAt: now,
    updatedAt: now,
    cancelAtPeriodEnd: 0,
    ...partial,
  } as Subscription;
}

describe("shouldPreserveLocalEntitlementOnRestoreEmptyRc", () => {
  it("preserves active RevenueCat row with valid period", () => {
    assert.equal(shouldPreserveLocalEntitlementOnRestoreEmptyRc(sub()), true);
  });

  it("does not preserve expired RevenueCat row", () => {
    const past = new Date(Date.now() - 60_000);
    assert.equal(
      shouldPreserveLocalEntitlementOnRestoreEmptyRc(
        sub({ currentPeriodEnd: past, subscriptionState: "EXPIRED", status: "free" }),
      ),
      false,
    );
  });

  it("does not preserve non-RevenueCat providers", () => {
    assert.equal(
      shouldPreserveLocalEntitlementOnRestoreEmptyRc(sub({ provider: "razorpay" })),
      false,
    );
  });

  it("does not preserve missing local row", () => {
    assert.equal(shouldPreserveLocalEntitlementOnRestoreEmptyRc(null), false);
  });
});

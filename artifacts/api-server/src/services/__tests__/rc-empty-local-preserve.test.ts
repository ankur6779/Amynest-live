import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Subscription } from "@workspace/db";
import { shouldPreserveLocalEntitlementOnEmptyRc } from "../rcCustomerService.js";

function sub(partial: Partial<Subscription> = {}): Subscription {
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return {
    userId: "user-1",
    plan: "monthly",
    status: "active",
    provider: "revenuecat",
    subscriptionState: "ACTIVE",
    currentPeriodEnd: future,
    expiresAt: future,
    trialEndsAt: null,
    bonusExpiresAt: null,
    gracePeriodExpiresAt: null,
    ...partial,
  } as Subscription;
}

describe("shouldPreserveLocalEntitlementOnEmptyRc", () => {
  it("preserves paid RevenueCat row on reconciliation empty RC", () => {
    assert.equal(shouldPreserveLocalEntitlementOnEmptyRc(sub(), "reconciliation"), true);
  });

  it("preserves paid RevenueCat row on restore empty RC", () => {
    assert.equal(shouldPreserveLocalEntitlementOnEmptyRc(sub(), "restore"), true);
  });

  it("preserves paid RevenueCat row on manual_recovery empty RC", () => {
    assert.equal(shouldPreserveLocalEntitlementOnEmptyRc(sub(), "manual_recovery"), true);
  });

  it("does not preserve on webhook — EXPIRATION must apply", () => {
    assert.equal(shouldPreserveLocalEntitlementOnEmptyRc(sub(), "webhook"), false);
  });

  it("does not preserve non-RevenueCat providers", () => {
    assert.equal(
      shouldPreserveLocalEntitlementOnEmptyRc(sub({ provider: "razorpay" }), "reconciliation"),
      false,
    );
  });

  it("does not preserve when local paid period already ended", () => {
    const past = new Date(Date.now() - 60_000);
    assert.equal(
      shouldPreserveLocalEntitlementOnEmptyRc(
        sub({
          subscriptionState: "EXPIRED",
          status: "free",
          currentPeriodEnd: past,
          expiresAt: past,
        }),
        "reconciliation",
      ),
      false,
    );
  });

  it("does not preserve null local row", () => {
    assert.equal(shouldPreserveLocalEntitlementOnEmptyRc(null, "reconciliation"), false);
  });
});

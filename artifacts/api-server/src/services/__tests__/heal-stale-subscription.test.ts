import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Subscription } from "@workspace/db";
import { shouldSkipHealStaleDowngrade } from "../subscription-premium-gate.js";

function sub(partial: Partial<Subscription>): Subscription {
  return {
    userId: "user-1",
    plan: "yearly",
    status: "active",
    provider: "revenuecat",
    subscriptionState: "FREE",
    trialEndsAt: null,
    currentPeriodEnd: new Date(Date.now() + 86_400_000),
    ...partial,
  } as Subscription;
}

describe("shouldSkipHealStaleDowngrade", () => {
  it("skips RevenueCat and Razorpay rows", () => {
    assert.equal(shouldSkipHealStaleDowngrade(sub({ provider: "revenuecat" })), true);
    assert.equal(shouldSkipHealStaleDowngrade(sub({ provider: "razorpay" })), true);
  });

  it("allows heal for internal none-provider rows", () => {
    assert.equal(shouldSkipHealStaleDowngrade(sub({ provider: "none" })), false);
    assert.equal(shouldSkipHealStaleDowngrade(sub({ provider: "manual" })), false);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Subscription } from "@workspace/db";
import { healStaleSubscriptionRecord } from "../subscriptionService.js";

function sub(partial: Partial<Subscription> & Pick<Subscription, "userId">): Subscription {
  return {
    plan: "monthly",
    status: "active",
    provider: "revenuecat",
    subscriptionState: "FREE",
    trialEndsAt: null,
    currentPeriodEnd: new Date(Date.now() + 86_400_000),
    bonusExpiresAt: null,
    expiresAt: null,
    gracePeriodExpiresAt: null,
    cancelAtPeriodEnd: 0,
    expiredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  } as Subscription;
}

describe("healStaleSubscriptionRecord", () => {
  it("does not downgrade unmigrated revenuecat subscriptions on read", async () => {
    const row = sub({
      userId: "user-rc-1",
      subscriptionState: "FREE",
    });
    const dbExec = {
      update: () => {
        throw new Error("healStale must not write revenuecat rows");
      },
    };

    const next = await healStaleSubscriptionRecord(row, dbExec as never);
    assert.equal(next.provider, "revenuecat");
    assert.equal(next.status, "active");
    assert.equal(next.plan, "monthly");
  });

  it("does not downgrade expired revenuecat rows on read (webhook-owned)", async () => {
    const row = sub({
      userId: "user-rc-expired",
      subscriptionState: "EXPIRED",
      currentPeriodEnd: new Date(Date.now() - 86_400_000),
    });
    const dbExec = {
      update: () => {
        throw new Error("healStale must not write revenuecat rows");
      },
    };

    const next = await healStaleSubscriptionRecord(row, dbExec as never);
    assert.equal(next.provider, "revenuecat");
  });

  it("does not downgrade razorpay subscriptions on read", async () => {
    const row = sub({
      userId: "user-rz-1",
      provider: "razorpay",
      subscriptionState: "FREE",
    });
    const dbExec = {
      update: () => {
        throw new Error("healStale must not write razorpay rows");
      },
    };

    const next = await healStaleSubscriptionRecord(row, dbExec as never);
    assert.equal(next.provider, "razorpay");
    assert.equal(next.status, "active");
  });
});

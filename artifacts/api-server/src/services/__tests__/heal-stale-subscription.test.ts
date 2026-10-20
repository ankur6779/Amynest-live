import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Subscription } from "@workspace/db";
import { healStaleSubscriptionRecord } from "../subscriptionService.js";

describe("healStaleSubscriptionRecord", () => {
  it("writes constraint-complete FREE shape for stale ACTIVE rows", async () => {
    const updates: Array<Record<string, unknown>> = [];
    const dbExec = {
      update: () => ({
        set: (values: Record<string, unknown>) => ({
          where: () => ({
            returning: async () => [{ userId: "user_1", ...values }],
          }),
        }),
      }),
    };

    const stale = {
      userId: "user_1",
      plan: "monthly",
      status: "active",
      provider: "razorpay",
      providerCustomerId: "cust_1",
      providerSubscriptionId: "sub_1",
      subscriptionState: "ACTIVE",
      trialEndsAt: null,
      currentPeriodEnd: new Date(Date.now() - 86_400_000),
      expiresAt: new Date(Date.now() - 86_400_000),
      gracePeriodExpiresAt: null,
      cancelAtPeriodEnd: 0,
      cancelledAt: null,
      expiredAt: null,
      autoRenewStatus: true,
    } as Subscription;

    const originalUpdate = dbExec.update;
    dbExec.update = () => ({
      set: (values: Record<string, unknown>) => {
        updates.push(values);
        return originalUpdate().set(values);
      },
    });

    const healed = await healStaleSubscriptionRecord(stale, dbExec as never);
    assert.equal(updates.length, 1);
    assert.equal(updates[0]?.subscriptionState, "FREE");
    assert.equal(updates[0]?.status, "free");
    assert.equal(updates[0]?.provider, "none");
    assert.equal(updates[0]?.providerSubscriptionId, null);
    assert.equal(updates[0]?.cancelAtPeriodEnd, 0);
    assert.equal(healed.subscriptionState, "FREE");
  });
});

import assert from "node:assert/strict";
import { test } from "node:test";
import type { Subscription } from "@workspace/db";
import { healStaleSubscriptionRecord } from "../subscriptionService.js";

function sub(partial: Partial<Subscription> & { status: string }): Subscription {
  return {
    userId: "user-1",
    plan: "monthly",
    provider: "revenuecat",
    subscriptionState: "FREE",
    trialEndsAt: null,
    currentPeriodEnd: null,
    bonusExpiresAt: null,
    expiresAt: null,
    gracePeriodExpiresAt: null,
    cancelAtPeriodEnd: 0,
    expiredAt: null,
    updatedAt: new Date(),
    createdAt: new Date(),
    ...partial,
  } as Subscription;
}

test("healStaleSubscriptionRecord does not downgrade unmigrated RevenueCat premium", async () => {
  const row = sub({
    status: "active",
    provider: "revenuecat",
    subscriptionState: "FREE",
    currentPeriodEnd: new Date(Date.now() + 86_400_000),
  });

  const updates: Array<Record<string, unknown>> = [];
  const dbExec = {
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            updates.push(values);
            return [{ ...row, ...values }];
          },
        }),
      }),
    }),
  };

  const next = await healStaleSubscriptionRecord(row, dbExec as never);
  assert.equal(updates.length, 0);
  assert.equal(next.provider, "revenuecat");
  assert.equal(next.status, "active");
});

test("healStaleSubscriptionRecord still downgrades expired internal trial (provider none)", async () => {
  const row = sub({
    status: "trialing",
    provider: "none",
    subscriptionState: "TRIAL",
    trialEndsAt: new Date(Date.now() - 86_400_000),
  });

  const updates: Array<Record<string, unknown>> = [];
  const dbExec = {
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            updates.push(values);
            return [{ ...row, ...values }];
          },
        }),
      }),
    }),
  };

  const next = await healStaleSubscriptionRecord(row, dbExec as never);
  assert.equal(updates.length, 1);
  assert.equal(next.status, "free");
  assert.equal(next.provider, "none");
});

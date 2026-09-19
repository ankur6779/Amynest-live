import assert from "node:assert/strict";
import { test } from "node:test";
import type { Subscription } from "@workspace/db";
import { healStaleSubscriptionRecord } from "../subscriptionService.js";

function sub(partial: Partial<Subscription> & { userId: string }): Subscription {
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
    expiredAt: null,
    cancelAtPeriodEnd: 0,
    ...partial,
  } as Subscription;
}

function throwingDbExec(): Parameters<typeof healStaleSubscriptionRecord>[1] {
  return {
    update: () => {
      throw new Error("healStale must not write paid provider rows");
    },
  } as never;
}

test("healStale leaves revenuecat rows unchanged without provider sync", async () => {
  const row = sub({
    userId: "rc-user",
    status: "trialing",
    subscriptionState: "TRIAL",
    trialEndsAt: new Date(Date.now() - 86_400_000),
  });
  const result = await healStaleSubscriptionRecord(row, throwingDbExec());
  assert.equal(result, row);
});

test("healStale leaves razorpay rows unchanged without provider sync", async () => {
  const row = sub({
    userId: "rz-user",
    provider: "razorpay",
    status: "active",
    subscriptionState: "ACTIVE",
    currentPeriodEnd: new Date(Date.now() - 86_400_000),
  });
  const result = await healStaleSubscriptionRecord(row, throwingDbExec());
  assert.equal(result, row);
});

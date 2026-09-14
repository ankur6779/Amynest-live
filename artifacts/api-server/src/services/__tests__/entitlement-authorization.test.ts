import assert from "node:assert/strict";
import { test } from "node:test";
import type { Subscription } from "@workspace/db";
import {
  decidePremiumFromSubscription,
  isPremiumAuthorized,
} from "../entitlement-authorization.js";

type SubRow = {
  status: string;
  plan?: string;
  provider?: string;
  subscriptionState?: string;
  trialEndsAt?: Date | null;
  currentPeriodEnd?: Date | null;
  bonusExpiresAt?: Date | null;
  expiresAt?: Date | null;
  gracePeriodExpiresAt?: Date | null;
};

function sub(partial: SubRow): Subscription {
  return {
    plan: "monthly",
    provider: "revenuecat",
    subscriptionState: "FREE",
    trialEndsAt: null,
    currentPeriodEnd: null,
    bonusExpiresAt: null,
    expiresAt: null,
    gracePeriodExpiresAt: null,
    ...partial,
  } as Subscription;
}

test("missing subscription is DENY, never ALLOW", () => {
  const decision = decidePremiumFromSubscription(null);
  assert.equal(decision.decision, "DENY");
  assert.equal(decision.isPremium, false);
  assert.equal(isPremiumAuthorized(decision), false);
});

test("expired trial is DENY even if status is still trialing", () => {
  const decision = decidePremiumFromSubscription(
    sub({
      status: "trialing",
      subscriptionState: "TRIAL",
      trialEndsAt: new Date(Date.now() - 1),
    }),
  );
  assert.equal(decision.decision, "DENY");
  assert.equal(isPremiumAuthorized(decision), false);
});

test("trial exactly at expiry boundary is DENY", () => {
  const now = Date.now();
  const realNow = Date.now;
  Date.now = () => now;
  try {
    const decision = decidePremiumFromSubscription(
      sub({
        status: "trialing",
        subscriptionState: "TRIAL",
        trialEndsAt: new Date(now),
      }),
    );
    assert.equal(decision.decision, "DENY");
  } finally {
    Date.now = realNow;
  }
});

test("active store trial is ALLOW", () => {
  const decision = decidePremiumFromSubscription(
    sub({
      status: "trialing",
      subscriptionState: "TRIAL",
      trialEndsAt: new Date(Date.now() + 60_000),
    }),
  );
  assert.equal(decision.decision, "ALLOW");
  assert.equal(isPremiumAuthorized(decision), true);
});

test("capped internal 3-day trial is DENY for premium", () => {
  const decision = decidePremiumFromSubscription(
    sub({
      status: "trialing",
      provider: "none",
      subscriptionState: "TRIAL",
      trialEndsAt: new Date(Date.now() + 3 * 86_400_000),
    }),
  );
  assert.equal(decision.decision, "DENY");
  assert.equal(decision.isPremium, false);
});

test("EXPIRED V2 state is DENY even with a future currentPeriodEnd", () => {
  const decision = decidePremiumFromSubscription(
    sub({
      status: "active",
      subscriptionState: "EXPIRED",
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
    }),
  );
  assert.equal(decision.decision, "DENY");
});

test("paid active with future period is ALLOW", () => {
  const decision = decidePremiumFromSubscription(
    sub({
      status: "active",
      subscriptionState: "ACTIVE",
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
    }),
  );
  assert.equal(decision.decision, "ALLOW");
});

test("cancelled paid period still ALLOW until expiry", () => {
  const decision = decidePremiumFromSubscription(
    sub({
      status: "active",
      subscriptionState: "CANCELLED",
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
    }),
  );
  assert.equal(decision.decision, "ALLOW");
});

test("paid expired is DENY", () => {
  const decision = decidePremiumFromSubscription(
    sub({
      status: "canceled",
      subscriptionState: "EXPIRED",
      currentPeriodEnd: new Date(Date.now() - 1),
      expiredAt: new Date(),
    } as SubRow),
  );
  assert.equal(decision.decision, "DENY");
});

test("UNKNOWN decision is never authorized", () => {
  assert.equal(
    isPremiumAuthorized({
      decision: "UNKNOWN",
      isPremium: true,
      isPremiumSubscriber: true,
      subscriptionState: "ACTIVE",
      reason: "entitlement_lookup_failed",
    }),
    false,
  );
});

test("client-shaped isPremium true cannot authorize without ALLOW", () => {
  assert.equal(
    isPremiumAuthorized({
      decision: "DENY",
      isPremium: true,
      isPremiumSubscriber: false,
      subscriptionState: "EXPIRED",
      reason: "no_active_entitlement",
    }),
    false,
  );
});

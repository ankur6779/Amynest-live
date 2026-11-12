import assert from "node:assert/strict";
import { test } from "node:test";
import type { Subscription } from "@workspace/db";
import {
  isInternalTrialNow,
  isPremiumNow,
  isPremiumSubscriberNow,
  shouldPreserveActiveTrial,
} from "../subscription-premium-gate.js";

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

test("isPremiumNow rejects active without currentPeriodEnd", () => {
  assert.equal(
    isPremiumNow(sub({ status: "active", plan: "yearly", provider: "revenuecat" })),
    false,
  );
});

test("isPremiumNow accepts active with future currentPeriodEnd", () => {
  assert.equal(
    isPremiumNow(
      sub({
        status: "active",
        subscriptionState: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 86_400_000),
      }),
    ),
    true,
  );
});

test("isPremiumNow accepts unmigrated RevenueCat row with legacy active status", () => {
  assert.equal(
    isPremiumNow(
      sub({
        status: "active",
        subscriptionState: "FREE",
        currentPeriodEnd: new Date(Date.now() + 86_400_000),
      }),
    ),
    true,
  );
});

test("isPremiumNow accepts valid trialing window", () => {
  assert.equal(
    isPremiumNow(
      sub({
        status: "trialing",
        subscriptionState: "TRIAL",
        trialEndsAt: new Date(Date.now() + 86_400_000),
      }),
    ),
    true,
  );
});

test("isPremiumNow rejects expired trialing", () => {
  assert.equal(
    isPremiumNow(
      sub({
        status: "trialing",
        subscriptionState: "TRIAL",
        trialEndsAt: new Date(Date.now() - 86_400_000),
      }),
    ),
    false,
  );
});

test("isPremiumNow accepts manual grant with far-future period end", () => {
  assert.equal(
    isPremiumNow(
      sub({
        status: "active",
        provider: "manual",
        subscriptionState: "FREE",
        currentPeriodEnd: new Date("2099-12-31T23:59:59.000Z"),
      }),
    ),
    true,
  );
});

test("isPremiumNow accepts cancelled V2 state until paid period ends", () => {
  assert.equal(
    isPremiumNow(
      sub({
        status: "active",
        subscriptionState: "CANCELLED",
        currentPeriodEnd: new Date(Date.now() + 86_400_000),
      }),
    ),
    true,
  );
});

test("isPremiumNow accepts grace period until grace expiry", () => {
  assert.equal(
    isPremiumNow(
      sub({
        status: "past_due",
        subscriptionState: "GRACE_PERIOD",
        gracePeriodExpiresAt: new Date(Date.now() + 86_400_000),
      }),
    ),
    true,
  );
});

test("isPremiumNow rejects expired V2 state even with stale active status", () => {
  assert.equal(
    isPremiumNow(
      sub({
        status: "active",
        subscriptionState: "EXPIRED",
        currentPeriodEnd: new Date(Date.now() + 86_400_000),
      }),
    ),
    false,
  );
});

test("isPremiumNow rejects cancelled manual downgrade with expired state and current period set to now", () => {
  const now = new Date();
  assert.equal(
    isPremiumNow(
      sub({
        status: "canceled",
        plan: "free",
        provider: "none",
        subscriptionState: "EXPIRED",
        currentPeriodEnd: now,
        expiresAt: now,
        trialEndsAt: null,
      }),
    ),
    false,
  );
});

test("isPremiumNow rejects cancelled trial after trialEndsAt is cleared", () => {
  assert.equal(
    isPremiumNow(
      sub({
        status: "canceled",
        plan: "free",
        provider: "none",
        subscriptionState: "EXPIRED",
        currentPeriodEnd: new Date(Date.now() - 1),
        trialEndsAt: null,
      }),
    ),
    false,
  );
});

test("isPremiumNow rejects paused provider state", () => {
  assert.equal(
    isPremiumNow(
      sub({
        status: "past_due",
        provider: "razorpay",
        subscriptionState: "PAUSED",
        currentPeriodEnd: new Date(Date.now() + 86_400_000),
      }),
    ),
    false,
  );
});

test("isPremiumSubscriberNow accepts active paid provider period", () => {
  assert.equal(
    isPremiumSubscriberNow(
      sub({
        status: "active",
        provider: "razorpay",
        subscriptionState: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 86_400_000),
      }),
    ),
    true,
  );
});

test("isPremiumSubscriberNow accepts cancelled paid period before expiry", () => {
  assert.equal(
    isPremiumSubscriberNow(
      sub({
        status: "active",
        provider: "revenuecat",
        subscriptionState: "CANCELLED",
        expiresAt: new Date(Date.now() + 86_400_000),
      }),
    ),
    true,
  );
});

test("capped internal trial is non-premium but must be preserved by heal", () => {
  // trialEndsAt = now+3d ⇒ trial start ≈ now, which is after the 2026-07-26 cap → capped.
  const capped = sub({
    status: "trialing",
    provider: "none",
    subscriptionState: "TRIAL",
    trialEndsAt: new Date(Date.now() + 3 * 86_400_000),
  });
  assert.equal(isInternalTrialNow(capped), true);
  assert.equal(isPremiumNow(capped), false);
  assert.equal(shouldPreserveActiveTrial(capped), true);
});

test("expired internal trial is not preserved", () => {
  const expired = sub({
    status: "trialing",
    provider: "none",
    subscriptionState: "TRIAL",
    trialEndsAt: new Date(Date.now() - 60_000),
  });
  assert.equal(isInternalTrialNow(expired), false);
  assert.equal(shouldPreserveActiveTrial(expired), false);
});

test("isPremiumSubscriberNow rejects trial, grace, bonus, and manual grants", () => {
  const future = new Date(Date.now() + 86_400_000);
  const blocked = [
    sub({
      status: "trialing",
      provider: "revenuecat",
      subscriptionState: "TRIAL",
      trialEndsAt: future,
    }),
    sub({
      status: "past_due",
      provider: "revenuecat",
      subscriptionState: "GRACE_PERIOD",
      gracePeriodExpiresAt: future,
    }),
    sub({
      status: "free",
      provider: "none",
      subscriptionState: "FREE",
      bonusExpiresAt: future,
    }),
    sub({
      status: "active",
      provider: "manual",
      subscriptionState: "FREE",
      currentPeriodEnd: new Date("2099-12-31T23:59:59.000Z"),
    }),
  ];

  for (const row of blocked) {
    assert.equal(isPremiumSubscriberNow(row), false);
  }
});

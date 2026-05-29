import assert from "node:assert/strict";
import { test } from "node:test";
import type { Subscription } from "@workspace/db";
import { isPremiumNow } from "../subscription-premium-gate.js";

type SubRow = {
  status: string;
  plan?: string;
  provider?: string;
  trialEndsAt?: Date | null;
  currentPeriodEnd?: Date | null;
  bonusExpiresAt?: Date | null;
};

function sub(partial: SubRow): Subscription {
  return {
    plan: "monthly",
    provider: "revenuecat",
    trialEndsAt: null,
    currentPeriodEnd: null,
    bonusExpiresAt: null,
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
        currentPeriodEnd: new Date("2099-12-31T23:59:59.000Z"),
      }),
    ),
    true,
  );
});

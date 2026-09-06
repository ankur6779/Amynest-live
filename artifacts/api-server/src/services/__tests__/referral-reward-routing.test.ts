import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { resolve } from "node:path";
import type { Subscription } from "@workspace/db";
import {
  isPremiumNow,
  isPremiumSubscriberNow,
} from "../subscription-premium-gate.js";

const repoRoot = resolve(import.meta.dirname, "../../../../..");

function sub(partial: Partial<Subscription>): Subscription {
  return {
    userId: "u1",
    plan: "free",
    status: "free",
    provider: "none",
    subscriptionState: "FREE",
    trialEndsAt: null,
    currentPeriodEnd: null,
    bonusExpiresAt: null,
    expiresAt: null,
    gracePeriodExpiresAt: null,
    ...partial,
  } as Subscription;
}

describe("referral reward routing (gift vs bonus)", () => {
  it("routes store-paid subscribers to gifts, not bonus-only premium", () => {
    const bonusOnly = sub({
      bonusExpiresAt: new Date(Date.now() + 86_400_000),
    });
    assert.equal(isPremiumNow(bonusOnly), true);
    assert.equal(isPremiumSubscriberNow(bonusOnly), false);

    const storePaid = sub({
      status: "active",
      plan: "monthly",
      provider: "razorpay",
      subscriptionState: "ACTIVE",
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
    });
    assert.equal(isPremiumSubscriberNow(storePaid), true);
  });

  it("tryGrantReferralReward uses isPremiumSubscriberNow for gift vs bonus", () => {
    const source = readFileSync(
      resolve(repoRoot, "artifacts/api-server/src/services/referralService.ts"),
      "utf8",
    );
    const grantFn = source.slice(source.indexOf("export async function tryGrantReferralReward"));
    assert.match(grantFn, /isPremiumSubscriberNow\(sub\)/);
    assert.doesNotMatch(
      grantFn,
      /const isPaid\s*=\s*isPremiumNow\(sub\)/,
    );
  });
});

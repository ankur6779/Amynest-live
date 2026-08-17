import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Subscription } from "@workspace/db";
import {
  remainingDailySeconds,
  SPEECH_COACH_V2_PAID_DAILY_LIMIT_SECONDS,
  SPEECH_COACH_V2_TRIAL_DAILY_LIMIT_SECONDS,
} from "@workspace/speech-coach-v2";
import {
  isPaidSubscription,
  isTrialingSubscription,
  resolveSpeechCoachV2UsagePolicyFromSubscription,
} from "./speechCoachV2UsagePolicy.js";

function sub(partial: Partial<Subscription>): Subscription {
  return {
    plan: "free",
    provider: "none",
    status: "free",
    trialEndsAt: null,
    currentPeriodEnd: null,
    bonusExpiresAt: null,
    ...partial,
  } as Subscription;
}

describe("speechCoachV2UsagePolicy", () => {
  const now = Date.now();

  it("trial user gets 120 seconds daily limit", () => {
    const policy = resolveSpeechCoachV2UsagePolicyFromSubscription(
      sub({
        status: "trialing",
        trialEndsAt: new Date(now + 86_400_000),
      }),
      now,
    );
    assert.equal(policy.isTrial, true);
    assert.equal(policy.isPaid, false);
    assert.equal(policy.isFirstUseFree, false);
    assert.equal(policy.dailyLimitSeconds, SPEECH_COACH_V2_TRIAL_DAILY_LIMIT_SECONDS);
  });

  it("paid user gets 600 seconds daily limit", () => {
    const policy = resolveSpeechCoachV2UsagePolicyFromSubscription(
      sub({
        status: "active",
        subscriptionState: "ACTIVE",
        plan: "yearly",
        provider: "revenuecat",
        currentPeriodEnd: new Date(now + 86_400_000),
      }),
      now,
    );
    assert.equal(policy.isTrial, false);
    assert.equal(policy.isPaid, true);
    assert.equal(policy.isFirstUseFree, false);
    assert.equal(policy.dailyLimitSeconds, SPEECH_COACH_V2_PAID_DAILY_LIMIT_SECONDS);
  });

  it("expired trial user gets 0 seconds", () => {
    const policy = resolveSpeechCoachV2UsagePolicyFromSubscription(
      sub({
        status: "trialing",
        trialEndsAt: new Date(now - 86_400_000),
      }),
      now,
    );
    assert.equal(policy.dailyLimitSeconds, 0);
    assert.equal(policy.isFirstUseFree, false);
  });

  it("free user FromSubscription is not first-use until async peek", () => {
    const policy = resolveSpeechCoachV2UsagePolicyFromSubscription(sub({ status: "free" }), now);
    assert.equal(policy.dailyLimitSeconds, 0);
    assert.equal(policy.isFirstUseFree, false);
    assert.equal(policy.firstUseRemainingSeconds, 0);
  });

  it("trial user session terminates at 120 seconds", () => {
    const limit = SPEECH_COACH_V2_TRIAL_DAILY_LIMIT_SECONDS;
    assert.equal(remainingDailySeconds(119, limit), 1);
    assert.equal(remainingDailySeconds(120, limit), 0);
  });

  it("paid user session terminates at 600 seconds", () => {
    const limit = SPEECH_COACH_V2_PAID_DAILY_LIMIT_SECONDS;
    assert.equal(remainingDailySeconds(599, limit), 1);
    assert.equal(remainingDailySeconds(600, limit), 0);
  });

  it("trialing subscription is not paid", () => {
    const row = sub({ status: "trialing", trialEndsAt: new Date(now + 86_400_000) });
    assert.equal(isTrialingSubscription(row, now), true);
    assert.equal(isPaidSubscription(row, now), false);
  });
});

import type { Subscription } from "@workspace/db";
import {
  SPEECH_COACH_V2_PAID_DAILY_LIMIT_SECONDS,
  SPEECH_COACH_V2_TRIAL_DAILY_LIMIT_SECONDS,
} from "@workspace/speech-coach-v2";
import {
  getOrCreateSubscription,
  healStaleSubscriptionRecord,
  isPremiumNow,
} from "./subscriptionService.js";
import {
  SPEECH_COACH_V2_FIRST_USE_SECONDS,
  firstUseRemainingSeconds,
  peekSpeechCoachV2FirstUseUsed,
} from "./speechCoachV2FirstUse.js";

export interface SpeechCoachV2UsagePolicy {
  isTrial: boolean;
  isPaid: boolean;
  /** Paid/trial daily cap, or remaining lifetime first-use seconds for free. */
  dailyLimitSeconds: number;
  isFirstUseFree: boolean;
  firstUseUsedSeconds: number;
  firstUseRemainingSeconds: number;
  firstUseLifetimeLimitSeconds: number;
}

export function isTrialingSubscription(sub: Subscription, now = Date.now()): boolean {
  return (
    (sub.subscriptionState === "TRIAL" || sub.status === "trialing")
    && !!sub.trialEndsAt
    && sub.trialEndsAt.getTime() > now
  );
}

export function isPaidSubscription(sub: Subscription, now = Date.now()): boolean {
  if (isTrialingSubscription(sub, now)) return false;
  return isPremiumNow(sub);
}

/** Resolve Speech Coach V2 daily limit from subscription state (server-authoritative). */
export function resolveSpeechCoachV2UsagePolicyFromSubscription(
  sub: Subscription,
  now = Date.now(),
): SpeechCoachV2UsagePolicy {
  const isTrial = isTrialingSubscription(sub, now);
  const isPaid = isPaidSubscription(sub, now);

  let dailyLimitSeconds = 0;
  if (isPaid) {
    dailyLimitSeconds = SPEECH_COACH_V2_PAID_DAILY_LIMIT_SECONDS;
  } else if (isTrial) {
    dailyLimitSeconds = SPEECH_COACH_V2_TRIAL_DAILY_LIMIT_SECONDS;
  }

  return {
    isTrial,
    isPaid,
    dailyLimitSeconds,
    isFirstUseFree: false,
    firstUseUsedSeconds: 0,
    firstUseRemainingSeconds: 0,
    firstUseLifetimeLimitSeconds: SPEECH_COACH_V2_FIRST_USE_SECONDS,
  };
}

export async function resolveSpeechCoachV2UsagePolicy(
  userId: string,
): Promise<SpeechCoachV2UsagePolicy> {
  let sub = await getOrCreateSubscription(userId);
  sub = await healStaleSubscriptionRecord(sub);
  const base = resolveSpeechCoachV2UsagePolicyFromSubscription(sub);
  if (base.isPaid || base.isTrial) return base;

  const used = await peekSpeechCoachV2FirstUseUsed(userId);
  const remaining = firstUseRemainingSeconds(used);
  return {
    ...base,
    isFirstUseFree: true,
    dailyLimitSeconds: remaining,
    firstUseUsedSeconds: used,
    firstUseRemainingSeconds: remaining,
  };
}

export async function getDailySpeechCoachLimit(userId: string): Promise<number> {
  const policy = await resolveSpeechCoachV2UsagePolicy(userId);
  return policy.dailyLimitSeconds;
}

/**
 * Structured subscription / billing debug logs — never silent on purchase paths.
 */

import type { Entitlements } from "@/hooks/use-subscription";

export type SubscriptionDebugContext = {
  phase: string;
  source?: string;
  reason?: string;
  plan?: string;
  entitlement?: {
    isPremium?: boolean;
    isPremiumSubscriber?: boolean;
    isTrialing?: boolean;
    status?: string;
    provider?: string | null;
    subscriptionState?: string | null;
    internalTrialExpired?: boolean;
    trialEndsAt?: string | null;
  };
  billing?: {
    platform?: string;
    wrapperPresent?: boolean;
    available?: boolean;
    unavailableReason?: string | null;
  };
  revenueCat?: {
    appUserId?: string | null;
    responseOk?: boolean;
    error?: string;
  };
  purchase?: {
    ok?: boolean;
    userCancelled?: boolean;
    error?: string;
  };
  extra?: Record<string, string | number | boolean | null | undefined>;
};

export function entitlementDebugSlice(
  entitlements: Entitlements | null | undefined,
): SubscriptionDebugContext["entitlement"] {
  if (!entitlements) return undefined;
  return {
    isPremium: entitlements.isPremium,
    isPremiumSubscriber: entitlements.isPremiumSubscriber,
    isTrialing: entitlements.isTrialing,
    status: entitlements.status,
    provider: entitlements.provider,
    subscriptionState: entitlements.subscriptionState ?? null,
    internalTrialExpired: entitlements.internalTrialExpired,
    trialEndsAt: entitlements.trialEndsAt,
  };
}

/** Always emit a single structured line for conversion debugging. */
export function logSubscriptionDebug(ctx: SubscriptionDebugContext): void {
  const payload = {
    ts: new Date().toISOString(),
    ...ctx,
  };
  try {
    console.info("[amynest:subscription-debug]", JSON.stringify(payload));
  } catch {
    console.info("[amynest:subscription-debug]", ctx.phase, ctx);
  }
}

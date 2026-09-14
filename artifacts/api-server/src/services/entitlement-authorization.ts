/**
 * Authoritative entitlement authorization.
 *
 * Identity → Subscription → Entitlement → ALLOW | DENY | UNKNOWN
 *
 * UNKNOWN must never be treated as ALLOW. Callers that cannot verify
 * entitlement must deny premium functionality.
 */
import type { Subscription } from "@workspace/db";
import {
  getOrCreateSubscription,
  healStaleSubscriptionRecord,
  isPremiumNow,
  isPremiumSubscriberNow,
  repairFalseExpiredInternalTrial,
} from "./subscriptionService.js";

export type AuthzDecision = "ALLOW" | "DENY" | "UNKNOWN";

export type EntitlementDecision = {
  decision: AuthzDecision;
  isPremium: boolean;
  isPremiumSubscriber: boolean;
  subscriptionState: string;
  reason: string;
};

export function decidePremiumFromSubscription(
  sub: Subscription | null | undefined,
): EntitlementDecision {
  if (!sub) {
    return {
      decision: "DENY",
      isPremium: false,
      isPremiumSubscriber: false,
      subscriptionState: "FREE",
      reason: "missing_subscription",
    };
  }

  try {
    const isPremium = isPremiumNow(sub);
    const isPremiumSubscriber = isPremiumSubscriberNow(sub);
    return {
      decision: isPremium ? "ALLOW" : "DENY",
      isPremium,
      isPremiumSubscriber,
      subscriptionState: sub.subscriptionState ?? "FREE",
      reason: isPremium ? "premium_active" : "no_active_entitlement",
    };
  } catch {
    return {
      decision: "UNKNOWN",
      isPremium: false,
      isPremiumSubscriber: false,
      subscriptionState: "UNKNOWN",
      reason: "entitlement_evaluation_failed",
    };
  }
}

/**
 * Resolve the user's premium entitlement from the server subscription row.
 * Lookup / evaluation failure returns UNKNOWN (never ALLOW).
 */
export async function resolveEntitlementDecision(
  userId: string,
): Promise<EntitlementDecision> {
  if (!userId) {
    return {
      decision: "DENY",
      isPremium: false,
      isPremiumSubscriber: false,
      subscriptionState: "FREE",
      reason: "unauthenticated",
    };
  }

  try {
    let sub = await getOrCreateSubscription(userId);
    sub = await healStaleSubscriptionRecord(sub);
    sub = await repairFalseExpiredInternalTrial(sub);
    return decidePremiumFromSubscription(sub);
  } catch {
    return {
      decision: "UNKNOWN",
      isPremium: false,
      isPremiumSubscriber: false,
      subscriptionState: "UNKNOWN",
      reason: "entitlement_lookup_failed",
    };
  }
}

/** Premium is granted only on an explicit ALLOW. UNKNOWN and DENY are both denials. */
export function isPremiumAuthorized(decision: EntitlementDecision): boolean {
  return decision.decision === "ALLOW" && decision.isPremium === true;
}

export function premiumDenialBody(
  decision: EntitlementDecision,
  feature?: string,
): Record<string, unknown> {
  const unknown = decision.decision === "UNKNOWN";
  return {
    error: "premium_required",
    decision: unknown ? "UNKNOWN" : "DENY",
    feature,
    message: unknown
      ? "Entitlement could not be verified. Premium access is denied."
      : "Upgrade to use this premium feature.",
  };
}

/**
 * Unlock adapter — reads canonical premium from subscription entitlements.
 * Does NOT recompute entitlements. RevenueCat / server remain source of truth.
 */

import type { Entitlements } from "@/hooks/use-subscription";

/** Thin read of existing `isPremium` — no parallel entitlement rules. */
export function isPremiumUnlocked(
  entitlements: Pick<Entitlements, "isPremium"> | null | undefined,
): boolean {
  return entitlements?.isPremium === true;
}

export type PremiumSurfaceState = {
  unlocked: boolean;
  /** Echo of server plan when known */
  plan: Entitlements["plan"] | "unknown";
  status: Entitlements["status"] | "unknown";
  provider: Entitlements["provider"] | "unknown";
};

export function resolvePremiumSurfaceState(
  entitlements: Entitlements | null | undefined,
): PremiumSurfaceState {
  if (!entitlements) {
    return {
      unlocked: false,
      plan: "unknown",
      status: "unknown",
      provider: "unknown",
    };
  }
  return {
    unlocked: isPremiumUnlocked(entitlements),
    plan: entitlements.plan,
    status: entitlements.status,
    provider: entitlements.provider,
  };
}

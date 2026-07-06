import type { Entitlements } from "@/hooks/use-subscription";
import { getTrialStartedLocally } from "@/lib/subscription-funnel-storage";

/** Server-granted age trial (not Play / RevenueCat). */
export function isInternalTrial(entitlements: Entitlements | null | undefined): boolean {
  if (!entitlements?.isTrialing) return false;
  return entitlements.provider === "none" && !entitlements.isPremiumSubscriber;
}

/** Trial ended — prefer server flag, fall back to local marker after heal clears trialEndsAt. */
export function isExpiredInternalTrial(
  entitlements: Entitlements | null | undefined,
): boolean {
  if (!entitlements || entitlements.isPremiumSubscriber) return false;
  if (entitlements.isTrialing) return false;
  if (entitlements.internalTrialExpired) return true;
  if (entitlements.subscriptionState === "EXPIRED") return true;
  if (
    entitlements.provider === "none" &&
    !entitlements.isPremium &&
    !!getTrialStartedLocally()
  ) {
    return true;
  }
  return false;
}

export function pricingCheckoutHref(source: string, plan: "yearly" | "monthly" = "yearly"): string {
  return `/pricing?plan=${plan}&source=${encodeURIComponent(source)}`;
}

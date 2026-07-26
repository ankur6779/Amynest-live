import type { Entitlements } from "@/hooks/use-subscription";
import { isServerConfirmedExpiredTrial } from "@/lib/winback-eligibility";

/** Server-granted age trial (not Play / RevenueCat). */
export function isInternalTrial(entitlements: Entitlements | null | undefined): boolean {
  if (!entitlements?.isTrialing) return false;
  return entitlements.provider === "none" && !entitlements.isPremiumSubscriber;
}

/**
 * Trial ended — server-confirmed flags only.
 * LocalStorage must NOT participate (shared-device / account-switch false positives).
 * Aligns with winback `isServerConfirmedExpiredTrial`.
 */
export function isExpiredInternalTrial(
  entitlements: Entitlements | null | undefined,
): boolean {
  return isServerConfirmedExpiredTrial(entitlements);
}

export function pricingCheckoutHref(source: string, plan: "yearly" | "monthly" = "yearly"): string {
  return `/pricing?plan=${plan}&source=${encodeURIComponent(source)}`;
}

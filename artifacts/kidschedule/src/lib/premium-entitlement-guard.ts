import type { Entitlements } from "@/hooks/use-subscription";

export type PremiumMonetizationGateInput = {
  entitlements: Entitlements | null | undefined;
  /** When false, suppress prompts until /api/subscription resolves. */
  entitlementsResolved?: boolean;
};

/** True when upgrade prompts, value sheets, and upsell banners must be hidden. */
export function shouldSuppressPremiumMonetization(
  input: PremiumMonetizationGateInput,
): boolean {
  if (input.entitlementsResolved === false) return true;

  const e = input.entitlements;
  if (!e) return input.entitlementsResolved !== true;

  if (e.isPremiumSubscriber) return true;
  if (e.allPremiumAccess) return true;

  return false;
}

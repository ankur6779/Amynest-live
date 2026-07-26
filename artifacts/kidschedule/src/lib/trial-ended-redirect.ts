import type { Entitlements } from "@/hooks/use-subscription";
import { FF_TRIAL_ENDED_FULLSCREEN } from "@/lib/subscription-feature-flags";
import { wasTrialEndedScreenDismissedRecently } from "@/lib/subscription-funnel-storage";
import { shouldSuppressPremiumMonetization } from "@/lib/premium-entitlement-guard";
import { shouldShowTrialEndedPaywall } from "@/lib/trial-paywall-variant";

const SKIP_PATH_PREFIXES = [
  "/subscription-trial-ended",
  "/subscription-trial",
  "/pricing",
  "/onboarding",
  "/auth",
  "/verify",
  "/login",
  "/sign-in",
  "/sign-up",
] as const;

/**
 * Whether to force-navigate to the full-screen trial-ended conversion page.
 * Soft banners remain as fallback when this returns false (e.g. cooldown).
 *
 * Failsafe: unresolved / unknown billing → never redirect (never default to Trial Ended).
 */
export function shouldRedirectToTrialEndedFullscreen(
  entitlements: Entitlements | null | undefined,
  location: string,
  options?: { cooldownMs?: number; entitlementsResolved?: boolean },
): boolean {
  if (!FF_TRIAL_ENDED_FULLSCREEN) return false;
  // Unknown billing state → assume eligible for free trial, never Trial Ended.
  if (options?.entitlementsResolved === false) return false;
  if (
    !shouldShowTrialEndedPaywall(entitlements, {
      entitlementsResolved: options?.entitlementsResolved,
    })
  ) {
    return false;
  }
  if (
    shouldSuppressPremiumMonetization({
      entitlements,
      entitlementsResolved: options?.entitlementsResolved,
    })
  ) {
    return false;
  }
  if (wasTrialEndedScreenDismissedRecently(options?.cooldownMs)) return false;

  const path = location.split("?")[0] || location;
  for (const prefix of SKIP_PATH_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return false;
  }
  return true;
}

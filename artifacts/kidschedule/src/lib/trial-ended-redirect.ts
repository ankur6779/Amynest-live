import type { Entitlements } from "@/hooks/use-subscription";
import { isExpiredInternalTrial } from "@/lib/internal-trial";
import { FF_TRIAL_ENDED_FULLSCREEN } from "@/lib/subscription-feature-flags";
import { wasTrialEndedScreenDismissedRecently } from "@/lib/subscription-funnel-storage";

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
 */
export function shouldRedirectToTrialEndedFullscreen(
  entitlements: Entitlements | null | undefined,
  location: string,
  options?: { cooldownMs?: number },
): boolean {
  if (!FF_TRIAL_ENDED_FULLSCREEN) return false;
  if (!isExpiredInternalTrial(entitlements)) return false;
  if (entitlements?.isPremiumSubscriber) return false;
  if (wasTrialEndedScreenDismissedRecently(options?.cooldownMs)) return false;

  const path = location.split("?")[0] || location;
  for (const prefix of SKIP_PATH_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return false;
  }
  return true;
}

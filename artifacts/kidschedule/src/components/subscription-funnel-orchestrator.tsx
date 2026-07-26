import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { SubscriptionWinbackModal } from "@/components/subscription-winback-modal";
import { SubscriptionTrialBanner } from "@/components/subscription-trial-banner";
import { SubscriptionTrialExpiredBanner } from "@/components/subscription-trial-expired-banner";
import { SubscriptionPostActivationBanner } from "@/components/subscription-post-activation-banner";
import { useTrialState } from "@/hooks/use-trial-state";
import { useSubscription } from "@/hooks/use-subscription";
import {
  getTrialStartedLocally,
  markTrialStartedLocally,
} from "@/lib/subscription-funnel-storage";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";
import { shouldRedirectToTrialEndedFullscreen } from "@/lib/trial-ended-redirect";
import { shouldShowTrialEndedPaywall } from "@/lib/trial-paywall-variant";
import {
  entitlementDebugSlice,
  logSubscriptionDebug,
} from "@/lib/subscription-debug";

/**
 * Global subscription funnel UI: win-back modal, trial reminders,
 * expired-trial CTA, post-activation premium nudge, and trial-ended redirect.
 */
export function SubscriptionFunnelOrchestrator() {
  const [location, setLocation] = useLocation();
  const { isPremium, entitlements, entitlementsResolved } = useSubscription();
  const { checkTrialExpiry, isTrialing, isInternalTrial } = useTrialState();
  const convertedRef = useRef(false);
  const redirectedRef = useRef(false);

  useEffect(() => {
    checkTrialExpiry();
  }, [checkTrialExpiry, location]);

  useEffect(() => {
    if (isInternalTrial && !getTrialStartedLocally()) {
      markTrialStartedLocally();
    }
  }, [isInternalTrial]);

  useEffect(() => {
    if (convertedRef.current) return;
    if (!isPremium || isTrialing) return;
    if (!getTrialStartedLocally()) return;
    convertedRef.current = true;
    trackSubscriptionEvent({ event: "trial_converted", source: "entitlement_sync" });
  }, [isPremium, isTrialing]);

  useEffect(() => {
    if (redirectedRef.current) return;
    if (
      !shouldRedirectToTrialEndedFullscreen(entitlements, location, {
        entitlementsResolved,
      })
    ) {
      return;
    }
    redirectedRef.current = true;
    logSubscriptionDebug({
      phase: "trial_ended_redirect",
      source: "funnel_orchestrator",
      entitlement: entitlementDebugSlice(entitlements),
      extra: { from_route: location },
    });
    trackSubscriptionEvent({
      event: "paywall_opened",
      source: "trial_ended_redirect",
      plan: "yearly",
    });
    setLocation("/subscription-trial-ended");
  }, [entitlements, entitlementsResolved, location, setLocation]);

  const showFunnelBanners =
    location === "/dashboard" || location.startsWith("/parenting-hub");

  const showExpiredBanner =
    showFunnelBanners
    && shouldShowTrialEndedPaywall(entitlements, { entitlementsResolved });

  return (
    <>
      <SubscriptionWinbackModal />
      {showFunnelBanners ? (
        <>
          {showExpiredBanner ? (
            <SubscriptionTrialExpiredBanner />
          ) : (
            <SubscriptionTrialBanner />
          )}
          <SubscriptionPostActivationBanner />
        </>
      ) : null}
    </>
  );
}

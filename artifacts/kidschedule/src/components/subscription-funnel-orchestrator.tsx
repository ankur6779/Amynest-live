import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { SubscriptionWinbackModal } from "@/components/subscription-winback-modal";
import { SubscriptionTrialBanner } from "@/components/subscription-trial-banner";
import { SubscriptionTrialExpiredBanner } from "@/components/subscription-trial-expired-banner";
import { SubscriptionPostActivationBanner } from "@/components/subscription-post-activation-banner";
import { useTrialState } from "@/hooks/use-trial-state";
import { useSubscription } from "@/hooks/use-subscription";
import { isExpiredInternalTrial } from "@/lib/internal-trial";
import { getTrialStartedLocally, markTrialStartedLocally } from "@/lib/subscription-funnel-storage";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";

/**
 * Global subscription funnel UI: win-back modal, trial reminders,
 * expired-trial CTA, post-activation premium nudge.
 */
export function SubscriptionFunnelOrchestrator() {
  const [location] = useLocation();
  const { isPremium, entitlements } = useSubscription();
  const { checkTrialExpiry, isTrialing, isInternalTrial } = useTrialState();
  const convertedRef = useRef(false);

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

  const showFunnelBanners =
    location === "/dashboard" || location.startsWith("/parenting-hub");

  const showExpiredBanner =
    showFunnelBanners && isExpiredInternalTrial(entitlements);

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

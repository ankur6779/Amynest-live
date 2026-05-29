import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { SubscriptionWinbackModal } from "@/components/subscription-winback-modal";
import { SubscriptionTrialBanner } from "@/components/subscription-trial-banner";
import { useTrialState } from "@/hooks/use-trial-state";
import { useSubscription } from "@/hooks/use-subscription";
import { getTrialStartedLocally } from "@/lib/subscription-funnel-storage";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";

/**
 * Global subscription funnel UI: win-back modal, trial expiry checks,
 * trial→paid conversion analytics.
 */
export function SubscriptionFunnelOrchestrator() {
  const [location] = useLocation();
  const { isPremium } = useSubscription();
  const { checkTrialExpiry, isTrialing } = useTrialState();
  const convertedRef = useRef(false);

  useEffect(() => {
    checkTrialExpiry();
  }, [checkTrialExpiry, location]);

  useEffect(() => {
    if (convertedRef.current) return;
    if (!isPremium || isTrialing) return;
    if (!getTrialStartedLocally()) return;
    convertedRef.current = true;
    trackSubscriptionEvent({ event: "trial_converted", source: "entitlement_sync" });
  }, [isPremium, isTrialing]);

  const showTrialBanner =
    location === "/dashboard" || location.startsWith("/parenting-hub");

  return (
    <>
      <SubscriptionWinbackModal />
      {showTrialBanner ? <SubscriptionTrialBanner /> : null}
    </>
  );
}

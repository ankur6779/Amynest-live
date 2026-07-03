import { useEffect } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useSubscription } from "@/hooks/use-subscription";
import { getAnalyticsService } from "./analytics-service";

/** Wires auth fetch + subscription context into AnalyticsService. */
export function AnalyticsBootstrap(): null {
  const authFetch = useAuthFetch();
  const { entitlements } = useSubscription();

  useEffect(() => {
    getAnalyticsService().setAuthFetch(authFetch);
  }, [authFetch]);

  useEffect(() => {
    const state = entitlements
      ? entitlements.isPremium
        ? entitlements.isTrialActive
          ? "TRIAL"
          : "PREMIUM"
        : "FREE"
      : "FREE";
    getAnalyticsService().updateContext({
      subscriptionState: state,
    });
  }, [entitlements]);

  return null;
}

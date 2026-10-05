import { useEffect } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { useSubscription } from "@/hooks/use-subscription";
import { getAnalyticsService } from "./analytics-service";
import { setRetentionAuthFetch } from "@/lib/retention/retention-goal-bridge";

/** Wires auth fetch + subscription context into AnalyticsService. */
export function AnalyticsBootstrap(): null {
  const authFetch = useAuthFetch();
  const { isSignedIn } = useAuth();
  const { entitlements } = useSubscription();

  useEffect(() => {
    getAnalyticsService().setAuthFetch(isSignedIn ? authFetch : null);
    setRetentionAuthFetch(isSignedIn ? authFetch : null);
  }, [authFetch, isSignedIn]);

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

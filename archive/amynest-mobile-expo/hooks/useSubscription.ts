import { useEffect } from "react";
import { useAuth, useUser } from "@/lib/firebase-auth";
import { useRouter } from "expo-router";
import { useSubscriptionStore, selectIsPremium } from "@/store/useSubscriptionStore";
import { setSubscriptionAuthGetter } from "@/services/subscriptionApi";
import { useAppStore } from "@/store/useAppStore";
import { initializeRevenueCat, identifyUser, logoutRevenueCat } from "@/lib/revenuecat";

/**
 * Bootstraps subscription state from /api/subscription. Also keeps the
 * subscription store in sync with the unified app-data response when it
 * arrives, so we don't have two separate sources of truth.
 *
 * Mount once at the root layout.
 */
export function useSubscriptionBootstrap(): void {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const load = useSubscriptionStore((s) => s.load);
  const reset = useSubscriptionStore((s) => s.reset);
  const setEntitlements = useSubscriptionStore((s) => s.setEntitlements);
  const appData = useAppStore((s) => s.data);

  useEffect(() => {
    setSubscriptionAuthGetter(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
  }, [getToken]);

  // Initialise RevenueCat once at app start
  useEffect(() => {
    initializeRevenueCat();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      reset();
      void logoutRevenueCat();
      return;
    }
    if (user?.id) {
      void identifyUser(user.id);
    }
    void load();
  }, [isLoaded, isSignedIn, user?.id, load, reset]);

  // Mirror entitlements coming from /api/app-data so a single fetch updates both
  useEffect(() => {
    const sub = appData?.subscription as unknown;
    if (sub && typeof sub === "object") {
      // safe runtime: app-data ships the same shape as /api/subscription's entitlements
      setEntitlements(sub as Parameters<typeof setEntitlements>[0]);
    }
  }, [appData, setEntitlements]);
}

/**
 * Returns a guard function. Call `gate()` before invoking a premium feature.
 * Returns true if the action is allowed; otherwise navigates to the paywall
 * (with the trigger reason in the URL) and returns false.
 */
export function usePremiumGate() {
  const router = useRouter();
  const isPremium = useSubscriptionStore(selectIsPremium);
  return (reason: string = "feature"): boolean => {
    if (isPremium) return true;
    router.push({ pathname: "/paywall", params: { reason } });
    return false;
  };
}

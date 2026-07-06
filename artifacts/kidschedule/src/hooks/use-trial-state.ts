import { useCallback, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";
import { markTrialStartedLocally } from "@/lib/subscription-funnel-storage";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";
import { isInternalTrial } from "@/lib/internal-trial";

const SUBSCRIPTION_KEY = ["subscription"] as const;

export function useTrialState() {
  const { entitlements, isPremium, startTrial, refresh } = useSubscription();
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const expiryTrackedRef = useRef(false);

  const isTrialing = entitlements?.status === "trialing" && entitlements.isTrialing;
  const trialEndsAt = entitlements?.trialEndsAt ?? null;

  const canStartTrial = useMemo(() => {
    if (!entitlements) return false;
    if (isPremium && !isTrialing) return false;
    return entitlements.status === "free";
  }, [entitlements, isPremium, isTrialing]);

  const trialDaysRemaining = useMemo(() => {
    if (!trialEndsAt || !isTrialing) return null;
    const ms = new Date(trialEndsAt).getTime() - Date.now();
    if (ms <= 0) return 0;
    return Math.ceil(ms / (24 * 60 * 60 * 1000));
  }, [trialEndsAt, isTrialing]);

  const trialExpiringSoon =
    isTrialing && trialDaysRemaining !== null && trialDaysRemaining <= 1;

  const activateTrial = useCallback(
    async (source: string): Promise<boolean> => {
      if (!canStartTrial) return false;
      trackSubscriptionEvent({ event: "trial_started", source });
      const ok = await startTrial();
      if (ok) {
        markTrialStartedLocally();
        await refresh();
        void qc.invalidateQueries({ queryKey: ["feature-usage"] });
        trackSubscriptionEvent({ event: "trial_started", source, extra: { ok: true } });
      }
      return ok;
    },
    [canStartTrial, startTrial, refresh, qc],
  );

  const checkTrialExpiry = useCallback(() => {
    if (!trialEndsAt) return;
    const expired = new Date(trialEndsAt).getTime() <= Date.now();
    if (!expired) return;

    const stillTrialing =
      entitlements?.status === "trialing" || entitlements?.isTrialing === true;
    if (!stillTrialing) return;

    if (!expiryTrackedRef.current) {
      expiryTrackedRef.current = true;
      trackSubscriptionEvent({ event: "trial_expired", source: "client_expiry_check" });
    }
    void refresh();
  }, [entitlements, trialEndsAt, refresh]);

  return {
    isTrialing,
    isPremium,
    entitlements,
    trialEndsAt,
    trialDaysRemaining,
    trialExpiringSoon,
    canStartTrial,
    isInternalTrial: isInternalTrial(entitlements),
    activateTrial,
    checkTrialExpiry,
    authFetch,
    refreshSubscription: refresh,
    getApiUrl,
    subscriptionKey: SUBSCRIPTION_KEY,
  };
}

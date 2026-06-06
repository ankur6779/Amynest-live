import { useCallback, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useSubscription } from "@/hooks/use-subscription";
import { usePaywall } from "@/contexts/paywall-context";
import { handleSubscriptionGateError } from "@/lib/subscription-gate";
import {
  fetchInfantSleepCoachPlan,
  generateInfantSleepCoachPlan,
  type InfantSleepCoachPlan,
} from "@/lib/infant-care-api";

const FEATURE = "infant_sleep_coach";

export function useInfantSleepCoach(childId: number) {
  const authFetch = useAuthFetch();
  const { isPremium, entitlements, refresh } = useSubscription();
  const { openPaywall } = usePaywall();
  const [plan, setPlan] = useState<InfantSleepCoachPlan | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const featureUsage = entitlements?.usage.features?.[FEATURE as keyof typeof entitlements.usage.features];
  const locked = !isPremium && (featureUsage?.locked ?? false);
  const tryFree = !isPremium && !locked && (featureUsage?.remaining ?? 1) > 0;

  const loadCached = useCallback(async () => {
    try {
      const data = await fetchInfantSleepCoachPlan(childId);
      setPlan(data.plan);
      setGeneratedAt(data.generatedAt);
      return data.plan;
    } catch {
      return null;
    }
  }, [childId]);

  const generate = useCallback(
    async (forceRefresh = false) => {
      if (!isPremium && locked) {
        openPaywall("infant_sleep_coach");
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch("/api/infant-sleep/coach-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childId,
            forceRefresh,
            tzOffsetMin: new Date().getTimezoneOffset(),
          }),
        });
        if (res.status === 402) {
          const body = (await res.json().catch(() => ({}))) as { feature?: string };
          if (handleSubscriptionGateError(res.status, body, "infant_sleep_coach")) {
            openPaywall("infant_sleep_coach");
            return null;
          }
        }
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? `error_${res.status}`);
        }
        const { readResolvedApiJson } = await import("@/lib/poll-result");
        const data = await readResolvedApiJson<{
          plan: InfantSleepCoachPlan;
          generatedAt: string;
        }>(res, authFetch);
        if (!data?.plan) throw new Error("empty_plan");
        setPlan(data.plan);
        setGeneratedAt(data.generatedAt ?? new Date().toISOString());
        void refresh();
        return data.plan;
      } catch (e) {
        setError(e instanceof Error ? e.message : "generation_failed");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [authFetch, childId, isPremium, locked, openPaywall, refresh],
  );

  return {
    plan,
    generatedAt,
    loading,
    error,
    locked,
    tryFree,
    isPremium,
    loadCached,
    generate,
    generateDirect: generateInfantSleepCoachPlan,
    fetchDirect: fetchInfantSleepCoachPlan,
  };
}

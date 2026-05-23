import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { getApiUrl } from "@/lib/api";
import {
  getMaxFreeOpens,
  isFeatureQuotaExhausted,
} from "@/lib/feature-usage-limits";

/**
 * "First-Time Free + Preview Lock" model — for the Parent Hub only.
 *
 * Each Parent Hub tile is usable up to MAX_FREE_HUB_TILE_OPENS times for free
 * (lifetime, server-side useCount). After the quota is exhausted, free users
 * see the locked overlay; premium users keep full access. Premium status is
 * re-evaluated on every render and when subscription data refetches (e.g.
 * after purchase/restore or when the app returns to foreground after expiry).
 */

export interface FeatureStatus {
  featureId: string;
  hasUsedOnce: boolean;
  useCount: number;
  firstUsedAt: string | null;
  lastUsedAt: string | null;
}

interface StatusResponse {
  features: FeatureStatus[];
}

/** Build a user-scoped query key so cache state never leaks across accounts. */
const qkey = (userId: string | null) =>
  ["feature-usage", "status", userId ?? "anon"] as const;

export function useFeatureUsage() {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const { isPremium } = useSubscription();
  const { isSignedIn, userId } = useAuth();
  const QKEY = qkey(userId);

  /**
   * Features the user has opened during the *current* page-session. The
   * server-side useCount increments on each open, but we don't want the
   * section the user just opened to instantly blur out underneath them
   * — the lock should apply on the *next* attempt (page refresh / fresh
   * navigation back to the hub). A ref is intentional: mutating it does not
   * cause a re-render, so it can't fight the optimistic cache update.
   */
  const freshlyOpenedRef = useRef<Set<string>>(new Set<string>());

  // Reset the session-scoped "freshly opened" set whenever the auth identity
  // changes (sign-in / sign-out / account switch). Without this, the previous
  // user's unlocked-this-session features could briefly appear unlocked for
  // the next signed-in user before refetch completes.
  useEffect(() => {
    freshlyOpenedRef.current = new Set<string>();
  }, [userId]);

  const query = useQuery<StatusResponse>({
    queryKey: QKEY,
    enabled: !!isSignedIn,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await authFetch(getApiUrl("/api/feature-usage/status"));
      if (!res.ok) throw new Error(`feature-usage status ${res.status}`);
      return (await res.json()) as StatusResponse;
    },
  });

  const useCountMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of query.data?.features ?? []) {
      m.set(f.featureId, f.useCount ?? 0);
    }
    return m;
  }, [query.data]);

  const getUseCount = useCallback(
    (featureId: string): number => useCountMap.get(featureId) ?? 0,
    [useCountMap],
  );

  const trackMutation = useMutation({
    mutationFn: async (featureId: string) => {
      const res = await authFetch(getApiUrl("/api/feature-usage/track"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureId }),
      });
      if (!res.ok) throw new Error(`feature-usage track ${res.status}`);
      return res.json();
    },
    onMutate: async (featureId) => {
      await qc.cancelQueries({ queryKey: QKEY });
      const previous = qc.getQueryData<StatusResponse>(QKEY);
      if (previous) {
        qc.setQueryData<StatusResponse>(QKEY, {
          features: previous.features.map((f) =>
            f.featureId === featureId
              ? {
                  ...f,
                  hasUsedOnce: true,
                  useCount: (f.useCount ?? 0) + 1,
                  firstUsedAt: f.firstUsedAt ?? new Date().toISOString(),
                  lastUsedAt: new Date().toISOString(),
                }
              : f,
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(QKEY, ctx.previous);
    },
  });

  /** True when the free quota for this feature is fully consumed. */
  const hasUsedFeature = useCallback(
    (featureId: string): boolean =>
      isFeatureQuotaExhausted(getUseCount(featureId), featureId),
    [getUseCount],
  );

  /** Show "Try Free" badge — only before the first open. */
  const tryFreeFor = useCallback(
    (featureId: string): boolean =>
      !isPremium && getUseCount(featureId) === 0,
    [isPremium, getUseCount],
  );

  /**
   * True iff (quota exhausted) AND (not premium) AND (not freshly opened this
   * session). Premium users are never locked. When subscription expires,
   * isPremium flips false and locks re-apply from stored useCount.
   */
  const isFeatureLocked = useCallback(
    (featureId: string): boolean => {
      if (isPremium) return false;
      if (freshlyOpenedRef.current.has(featureId)) return false;
      return hasUsedFeature(featureId);
    },
    [isPremium, hasUsedFeature],
  );

  /**
   * Record one usage of a feature. Each open increments server useCount until
   * the per-feature free quota is reached. Premium users bypass locks but
   * usage is still tracked for analytics.
   */
  const markFeatureUsed = useCallback(
    (featureId: string) => {
      freshlyOpenedRef.current.add(featureId);
      const count = getUseCount(featureId);
      const max = getMaxFreeOpens(featureId);
      if (!isPremium && count >= max) return;
      trackMutation.mutate(featureId);
    },
    [trackMutation, getUseCount, isPremium],
  );

  return {
    isPremium,
    isLoaded: query.isFetched || !isSignedIn,
    getUseCount,
    tryFreeFor,
    hasUsedFeature,
    isFeatureLocked,
    markFeatureUsed,
  };
}

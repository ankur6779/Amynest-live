import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { getApiUrl } from "@/lib/api";

/**
 * "First-Time Free + Preview Lock" model — for the Parent Hub only.
 *
 * Each Parent Hub feature is usable ONCE for free (lifetime, server-side).
 * After the first use, free users see the locked overlay; premium users keep
 * full access. Status is fetched once per session (then optimistically updated
 * on `markFeatureUsed`) so the UI never blocks.
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
   * server-side `hasUsedOnce` flips to true on first open, but we don't want
   * the section the user just opened to instantly blur out underneath them
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

  const usedSet = useMemo(() => {
    const s = new Set<string>();
    for (const f of query.data?.features ?? []) {
      if (f.hasUsedOnce) s.add(f.featureId);
    }
    return s;
  }, [query.data]);

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

  /** True when the user has consumed their one free use of this feature. */
  const hasUsedFeature = useCallback(
    (featureId: string): boolean => usedSet.has(featureId),
    [usedSet],
  );

  /**
   * True iff (used once) AND (not premium) AND (not freshly opened this
   * session). Premium users are never locked. The freshly-opened guard
   * gives the user a continuous read of the feature they *just* unlocked
   * — the lock activates on their next visit.
   */
  const isFeatureLocked = useCallback(
    (featureId: string): boolean => {
      if (isPremium) return false;
      if (freshlyOpenedRef.current.has(featureId)) return false;
      return usedSet.has(featureId);
    },
    [isPremium, usedSet],
  );

  /**
   * Record one usage of a feature. Idempotent per first-time semantics — the
   * server returns `firstTime: true` only on the very first call. Premium
   * users don't need server tracking; we still log it so analytics stay
   * accurate, but the call is fire-and-forget.
   */
  const markFeatureUsed = useCallback(
    (featureId: string) => {
      // Mark as freshly opened first so the LockedBlock won't blur the
      // very content the user is currently using.
      freshlyOpenedRef.current.add(featureId);
      // Skip the network round-trip if the server already knows; the local
      // session is preserved by the ref above.
      if (usedSet.has(featureId) && !isPremium) return;
      trackMutation.mutate(featureId);
    },
    [trackMutation, usedSet, isPremium],
  );

  return {
    isPremium,
    isLoaded: query.isFetched || !isSignedIn,
    hasUsedFeature,
    isFeatureLocked,
    markFeatureUsed,
  };
}

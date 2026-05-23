import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useAuth } from "@/lib/firebase-auth";
import { useSubscriptionStore, selectIsPremium } from "@/store/useSubscriptionStore";

/**
 * Mobile twin of the web `useFeatureUsage` hook. Tracks per-Parent-Hub-feature
 * first-time-free state on the server. After one use, the feature is locked
 * for free users (premium users always get full access).
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
  const isPremium = useSubscriptionStore(selectIsPremium);
  const { isSignedIn, userId } = useAuth();
  const QKEY = qkey(userId);

  /**
   * Features opened during the *current* hub-session. Server-side
   * `hasUsedOnce` flips to true on first open, but the section/tile the user
   * just opened must NOT instantly blur — the lock should apply on their
   * next visit. A ref avoids triggering an extra render race against the
   * optimistic cache update.
   */
  const freshlyOpenedRef = useRef<Set<string>>(new Set<string>());

  // Wipe the session-scoped "freshly opened" set whenever the signed-in user
  // changes, so the previous account's unlocked-this-session features cannot
  // bleed into the new account's UI.
  useEffect(() => {
    freshlyOpenedRef.current = new Set<string>();
  }, [userId]);

  const query = useQuery<StatusResponse>({
    queryKey: QKEY,
    enabled: !!isSignedIn,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await authFetch("/api/feature-usage/status");
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
      const res = await authFetch("/api/feature-usage/track", {
        method: "POST",
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

  const hasUsedFeature = useCallback(
    (featureId: string): boolean => usedSet.has(featureId),
    [usedSet],
  );

  const isFeatureLocked = useCallback(
    (featureId: string): boolean => {
      if (isPremium) return false;
      if (freshlyOpenedRef.current.has(featureId)) return false;
      return usedSet.has(featureId);
    },
    [isPremium, usedSet],
  );

  const markFeatureUsed = useCallback(
    (featureId: string) => {
      // Stick the feature into the session-scoped "freshly opened" set so the
      // LockedBlock won't blur it out from under the user mid-use.
      freshlyOpenedRef.current.add(featureId);
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

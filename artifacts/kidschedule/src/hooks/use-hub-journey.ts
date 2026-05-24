import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { useSubscription } from "@/hooks/use-subscription";
import { getApiUrl } from "@/lib/api";
import type {
  ChildProgressSnapshot,
  HubJourneyAccess,
  PathStep,
  PeekAheadItem,
} from "@workspace/parent-hub-journey";
import { isHubJourneyFeatureLocked } from "@/lib/hub-journey-access";

export type { HubJourneyAccess, PathStep, PeekAheadItem, ChildProgressSnapshot };

export interface HubJourneyStatus {
  access: HubJourneyAccess;
  journeyDay: number;
  pathSteps: PathStep[];
  pathCompleted: boolean;
  peekAhead: PeekAheadItem[];
  peekAvailable: boolean;
  progress: ChildProgressSnapshot;
  bonusUnlocks: string[];
  articleOfDay: { id: string; title: string; summary: string } | null;
  child: { id: number; name: string; age: number; ageMonths: number };
}

const qkey = (userId: string | null, childId: number | null) =>
  ["hub-journey", "status", userId ?? "anon", childId ?? 0] as const;

export function useHubJourney(childId: number | null | undefined) {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const { isSignedIn, userId } = useAuth();
  const { isPremium } = useSubscription();
  const cid = childId ?? null;
  const QKEY = qkey(userId, cid);

  const query = useQuery<HubJourneyStatus>({
    queryKey: QKEY,
    enabled: !!isSignedIn && !!cid && cid > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const res = await authFetch(
        getApiUrl(`/api/hub-journey/status?childId=${cid}`),
      );
      if (!res.ok) throw new Error(`hub-journey status ${res.status}`);
      return (await res.json()) as HubJourneyStatus;
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (stepIds: string[]) => {
      const res = await authFetch(getApiUrl("/api/hub-journey/complete-path"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: cid, stepIds }),
      });
      if (!res.ok) throw new Error(`hub-journey complete ${res.status}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QKEY }),
  });

  const peekMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch(getApiUrl("/api/hub-journey/peek-ahead"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: cid }),
      });
      if (!res.ok) throw new Error(`hub-journey peek ${res.status}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QKEY }),
  });

  const status = query.data;
  const access = status?.access;
  const bonusUnlocks = status?.bonusUnlocks ?? [];

  const isHubFeatureLockedFn = useCallback(
    (featureId: string): boolean => {
      if (isPremium) return false;
      if (!featureId.startsWith("hub_")) return false;
      if (!access) return false;
      return isHubJourneyFeatureLocked(featureId, access, bonusUnlocks);
    },
    [isPremium, access, bonusUnlocks],
  );

  const isFreeJourneyPeriod = !!access?.isFreePeriod && !isPremium;
  const isJourneyLocked = !!access?.isLocked && !isPremium;

  return {
    status,
    isLoading: query.isLoading,
    isPremium,
    isFreeJourneyPeriod,
    isJourneyLocked,
    access,
    progress: status?.progress,
    pathSteps: status?.pathSteps ?? [],
    pathCompleted: status?.pathCompleted ?? false,
    peekAhead: status?.peekAhead ?? [],
    peekAvailable: status?.peekAvailable ?? false,
    journeyDay: status?.journeyDay ?? 1,
    bonusUnlocks,
    isHubFeatureLocked: isHubFeatureLockedFn,
    completePath: (stepIds: string[]) => completeMutation.mutateAsync(stepIds),
    peekAheadUnlock: () => peekMutation.mutateAsync(),
    refetch: () => qc.invalidateQueries({ queryKey: QKEY }),
    isCompleting: completeMutation.isPending,
  };
}

export { isHubFeatureExempt } from "@/lib/hub-journey-access";
import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { useSubscription } from "@/hooks/use-subscription";
import { getApiUrl } from "@/lib/api";
import { withActiveChildId } from "@/lib/coach-age-nav";
import {
  getCoachGoalAccess,
  type CoachGoalAccess,
  type CoachJourneyAccess,
  type CoachPlanRecord,
} from "@workspace/coach-journey";

export type { CoachJourneyAccess, CoachGoalAccess, CoachPlanRecord };

export interface CoachJourneyStatus {
  access: CoachJourneyAccess;
  journeyDay: number;
  completedGoalIds: string[];
  plansCompleted: CoachPlanRecord[];
  maxNewGoalsToday: number;
  extendUnlocked: boolean;
}

const LEGACY_STORAGE_PREFIX = "amynest_section_usage_v1";

function readLegacyBlockUsedIds(userId: string | null): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${LEGACY_STORAGE_PREFIX}:${userId ?? "anon"}:amy_coach`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { blockUsedIds?: string[]; blockUsedId?: string };
    if (Array.isArray(parsed.blockUsedIds)) return parsed.blockUsedIds;
    if (parsed.blockUsedId) return [parsed.blockUsedId];
    return [];
  } catch {
    return [];
  }
}

const qkey = (userId: string | null) =>
  ["coach-journey", "status", userId ?? "anon"] as const;

export function useCoachJourney() {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const { isSignedIn, userId } = useAuth();
  const { isPremium } = useSubscription();
  const legacySyncedRef = useRef(false);
  const QKEY = qkey(userId);

  const query = useQuery<CoachJourneyStatus>({
    queryKey: QKEY,
    enabled: !!isSignedIn,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const res = await authFetch(getApiUrl("/api/coach-journey/status"));
      if (!res.ok) throw new Error(`coach-journey status ${res.status}`);
      return (await res.json()) as CoachJourneyStatus;
    },
  });

  useEffect(() => {
    if (!isSignedIn || !userId || legacySyncedRef.current) return;
    if (isPremium) return;
    const legacyIds = readLegacyBlockUsedIds(userId);
    if (legacyIds.length === 0) return;
    legacySyncedRef.current = true;
    void (async () => {
      try {
        await authFetch(getApiUrl("/api/coach-journey/sync-legacy"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(withActiveChildId({ blockUsedIds: legacyIds })),
        });
        await qc.invalidateQueries({ queryKey: QKEY });
      } catch {
        legacySyncedRef.current = false;
      }
    })();
  }, [isSignedIn, userId, isPremium, authFetch, qc, QKEY]);

  const completeMutation = useMutation({
    mutationFn: async (payload: { goalId: string; sessionId: string }) => {
      const res = await authFetch(getApiUrl("/api/coach-journey/complete-plan"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withActiveChildId(payload)),
      });
      if (!res.ok) throw new Error(`coach-journey complete ${res.status}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QKEY }),
  });

  const status = query.data;
  const access = status?.access;
  const completedGoalIds = status?.completedGoalIds ?? [];

  const getGoalAccess = useCallback(
    (goalId: string): CoachGoalAccess => {
      if (isPremium) return "open";
      if (!access) return "locked";
      return getCoachGoalAccess({
        goalId,
        isPremium: false,
        access,
        completedGoalIds,
      });
    },
    [isPremium, access, completedGoalIds],
  );

  const isFreeJourneyPeriod = !!access?.isFreePeriod && !isPremium;
  const isJourneyLocked = !!access?.isLocked && !isPremium;
  const extendUnlocked = isPremium || (status?.extendUnlocked ?? false);

  const completePlan = useCallback(
    (goalId: string, sessionId: string) =>
      completeMutation.mutateAsync({ goalId, sessionId }),
    [completeMutation],
  );

  return {
    status,
    isLoading: query.isLoading,
    isPremium,
    isFreeJourneyPeriod,
    isJourneyLocked,
    access,
    journeyDay: status?.journeyDay ?? 1,
    completedGoalIds,
    maxNewGoalsToday: status?.maxNewGoalsToday ?? 1,
    extendUnlocked,
    getGoalAccess,
    completePlan,
    refetch: () => qc.invalidateQueries({ queryKey: QKEY }),
    isCompleting: completeMutation.isPending,
  };
}

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { useSubscription } from "@/hooks/use-subscription";
import { getApiUrl } from "@/lib/api";
import type {
  RoutineGenerationRecord,
  RoutineJourneyAccess,
} from "@workspace/routine-journey";

export type { RoutineJourneyAccess, RoutineGenerationRecord };

export interface RoutineJourneyStatus {
  access: RoutineJourneyAccess;
  journeyDay: number;
  generationsCompleted: RoutineGenerationRecord[];
  generationsRemaining: number;
}

const qkey = (userId: string | null) =>
  ["routine-journey", "status", userId ?? "anon"] as const;

export function useRoutineJourney() {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const { isSignedIn, userId } = useAuth();
  const { isPremium } = useSubscription();
  const legacySyncedRef = useRef(false);
  const QKEY = qkey(userId);

  const query = useQuery<RoutineJourneyStatus>({
    queryKey: QKEY,
    enabled: !!isSignedIn,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const res = await authFetch(getApiUrl("/api/routine-journey/status"));
      if (!res.ok) throw new Error(`routine-journey status ${res.status}`);
      return (await res.json()) as RoutineJourneyStatus;
    },
  });

  useEffect(() => {
    if (!isSignedIn || !userId || legacySyncedRef.current || isPremium) return;
    legacySyncedRef.current = true;
    void (async () => {
      try {
        await authFetch(getApiUrl("/api/routine-journey/sync-legacy"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        await qc.invalidateQueries({ queryKey: QKEY });
      } catch {
        legacySyncedRef.current = false;
      }
    })();
  }, [isSignedIn, userId, isPremium, authFetch, qc, QKEY]);

  const status = query.data;
  const access = status?.access;

  return {
    status,
    isLoading: query.isLoading,
    isPremium,
    isFreeJourneyPeriod: !!access?.isFreePeriod && !isPremium,
    isJourneyLocked: !!access?.isLocked && !isPremium,
    access,
    journeyDay: status?.journeyDay ?? 1,
    generationsCompleted: status?.generationsCompleted ?? [],
    generationsRemaining: status?.generationsRemaining ?? 3,
    refetch: () => qc.invalidateQueries({ queryKey: QKEY }),
  };
}

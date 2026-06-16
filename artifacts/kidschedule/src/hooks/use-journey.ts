import { parseApiJson } from "@/lib/safe-json-response";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { getApiUrl } from "@/lib/api";

export type JourneyTaskId =
  | "routine_generate"
  | "routine_task_complete"
  | "hub_explore"
  | "behavior_log"
  | "child_activity"
  | "amy_coach"
  | "weekly_review";

export interface JourneyTaskView {
  day: number;
  taskId: JourneyTaskId;
  titleKey: string;
  descriptionKey: string;
  ctaPath: string;
  ctaKey: string;
  completed: boolean;
}

export interface JourneyStatus {
  active: boolean;
  currentDay: number;
  totalDays: number;
  completedDays: number[];
  startedAt: string;
  completedAt: string | null;
  progressPct: number;
  todayTask: JourneyTaskView | null;
  reason?: string;
}

const qkey = (userId: string | null) =>
  ["journey", "status", userId ?? "anon"] as const;

export function useJourney() {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const { isSignedIn, userId } = useAuth();
  const QKEY = qkey(userId);

  const query = useQuery<JourneyStatus>({
    queryKey: QKEY,
    enabled: !!isSignedIn,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const res = await authFetch(getApiUrl("/api/journey/status"));
      if (!res.ok) throw new Error(`journey status ${res.status}`);
      return (await parseApiJson<JourneyStatus>(res));
    },
  });

  const refetch = () => qc.invalidateQueries({ queryKey: QKEY });

  return {
    status: query.data,
    isLoading: query.isLoading,
    isActive: query.data?.active === true,
    refetch,
  };
}

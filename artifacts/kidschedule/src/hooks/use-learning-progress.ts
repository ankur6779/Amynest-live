import { parseApiJson } from "@/lib/safe-json-response";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { getApiUrl } from "@/lib/api";
import type {
  LearningProgressProfile,
  UnlockResult,
  AiTutorContext,
  WeeklyParentReport,
  SectionKey,
  Phase3Status,
  RewardEvent,
} from "@workspace/learning-progress-engine";
import type { HubJourneyAccess } from "@workspace/parent-hub-journey";
import { HUB_CONTENT_QUOTAS } from "@workspace/parent-hub-journey";

export interface LearningProgressStatus {
  profile: LearningProgressProfile;
  unlocks: UnlockResult;
  hubAccess: HubJourneyAccess;
  quotas: typeof HUB_CONTENT_QUOTAS;
  aiTutorContext: AiTutorContext;
  isPremium: boolean;
  weeklyReport: WeeklyParentReport;
  journeyDay: number;
  phase3?: Phase3Status;
  rewardEvents?: RewardEvent[];
  sessionComplete?: boolean;
  child: { id: number; name: string; age: number; ageMonths: number };
}

const qkey = (userId: string | null, childId: number | null) =>
  ["learning-progress", "status", userId ?? "anon", childId ?? 0] as const;

export function useLearningProgress(childId: number | null | undefined) {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const { isSignedIn, userId } = useAuth();
  const cid = childId ?? null;
  const QKEY = qkey(userId, cid);

  const query = useQuery<LearningProgressStatus>({
    queryKey: QKEY,
    enabled: !!isSignedIn && !!cid && cid > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const res = await authFetch(
        getApiUrl(`/api/learning-progress/status?childId=${cid}`),
      );
      if (!res.ok) throw new Error(`learning-progress status ${res.status}`);
      return (await parseApiJson<LearningProgressStatus>(res));
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (args: {
      activityId: string;
      section: SectionKey;
      correct?: boolean;
    }) => {
      const res = await authFetch(
        getApiUrl("/api/learning-progress/complete-activity"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childId: cid,
            activityId: args.activityId,
            section: args.section,
            correct: args.correct ?? true,
          }),
        },
      );
      if (!res.ok) throw new Error(`complete-activity ${res.status}`);
      return (await parseApiJson<LearningProgressStatus>(res));
    },
    onSuccess: (data) => {
      qc.setQueryData(QKEY, data);
    },
  });

  const sessionStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      const res = await authFetch(
        getApiUrl("/api/learning-progress/session-step"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ childId: cid, stepId }),
        },
      );
      if (!res.ok) throw new Error(`session-step ${res.status}`);
      return (await parseApiJson<LearningProgressStatus>(res));
    },
    onSuccess: (data) => {
      qc.setQueryData(QKEY, data);
    },
  });

  return {
    status: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    profile: query.data?.profile,
    unlocks: query.data?.unlocks,
    phase3: query.data?.phase3,
    aiTutorContext: query.data?.aiTutorContext,
    weeklyReport: query.data?.weeklyReport,
    isPremium: query.data?.isPremium ?? false,
    journeyDay: query.data?.journeyDay ?? 1,
    child: query.data?.child,
    completeActivity: completeMutation.mutateAsync,
    completeSessionStep: sessionStepMutation.mutateAsync,
    isCompleting: completeMutation.isPending || sessionStepMutation.isPending,
    lastRewardEvents: completeMutation.data?.rewardEvents ?? sessionStepMutation.data?.rewardEvents,
    sessionComplete: sessionStepMutation.data?.sessionComplete ?? false,
  };
}

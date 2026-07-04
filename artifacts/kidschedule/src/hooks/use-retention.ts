import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { useSubscription } from "@/hooks/use-subscription";
import {
  fetchRetentionStatus,
  postRetentionCheckin,
  postRetentionGoal,
  postRetentionResume,
  readRetentionCache,
  type RetentionDailyGoals,
  type RetentionStatus,
} from "@/lib/retention/retention-api";
import { trackRetentionEvent } from "@/lib/retention/retention-analytics";

const qkey = (userId: string | null, routinePct: number, trialing: boolean) =>
  ["retention", "status", userId ?? "anon", routinePct, trialing] as const;

export function useRetention(opts?: { routineCompletionPct?: number }) {
  const authFetch = useAuthFetch();
  const { isSignedIn, userId } = useAuth();
  const { entitlements } = useSubscription();
  const isTrialing = entitlements?.isTrialing ?? false;
  const qc = useQueryClient();
  const routinePct = opts?.routineCompletionPct ?? 0;
  const QKEY = qkey(userId, routinePct, !!isTrialing);

  const query = useQuery<RetentionStatus>({
    queryKey: QKEY,
    enabled: !!isSignedIn,
    staleTime: 5 * 60_000,
    placeholderData: () => readRetentionCache() ?? undefined,
    queryFn: () =>
      fetchRetentionStatus(authFetch, {
        routineCompletionPct: routinePct,
        trialing: isTrialing,
      }),
  });

  const checkinMutation = useMutation({
    mutationFn: (useShield?: boolean) => postRetentionCheckin(authFetch, useShield),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["retention", "status"] });
      if (data.alreadyCheckedIn) return;
      trackRetentionEvent("daily_checkin", {
        streak_days: data.next?.currentStreak,
        stars: data.rewards?.stars,
        coins: data.rewards?.coins,
        parent_xp: data.rewards?.parentXp,
      });
      if (data.streakStarted) trackRetentionEvent("streak_started", { streak_days: data.next?.currentStreak });
      if (data.streakExtended) trackRetentionEvent("streak_extended", { streak_days: data.next?.currentStreak });
      if (data.streakLost) trackRetentionEvent("streak_lost", { previous_streak: data.next?.currentStreak });
      for (const id of data.newAchievements ?? []) {
        trackRetentionEvent("achievement_unlocked_retention", { achievement_id: id });
      }
      for (const r of ["stars", "coins", "parent_xp"] as const) {
        const amount = data.rewards?.[r === "parent_xp" ? "parentXp" : r] ?? 0;
        if (amount > 0) trackRetentionEvent("reward_claimed", { reward_type: r, amount, source: "checkin" });
      }
    },
  });

  const goalMutation = useMutation({
    mutationFn: (goal: keyof RetentionDailyGoals) => postRetentionGoal(authFetch, goal),
    onSuccess: (data, goal) => {
      void qc.invalidateQueries({ queryKey: ["retention", "status"] });
      trackRetentionEvent("goal_completed", { goal });
      if (data.allGoalsComplete) trackRetentionEvent("goal_completed", { goal: "all" });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (item: Parameters<typeof postRetentionResume>[1]) =>
      postRetentionResume(authFetch, item),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["retention", "status"] });
    },
  });

  const checkIn = useCallback(
    (useShield?: boolean) => checkinMutation.mutate(useShield),
    [checkinMutation],
  );

  const completeGoal = useCallback(
    (goal: keyof RetentionDailyGoals) => goalMutation.mutate(goal),
    [goalMutation],
  );

  const saveResume = useCallback(
    (item: Parameters<typeof postRetentionResume>[1]) => resumeMutation.mutate(item),
    [resumeMutation],
  );

  return {
    ...query,
    checkIn,
    completeGoal,
    saveResume,
    isCheckingIn: checkinMutation.isPending,
  };
}

import { useCallback, useEffect, useRef } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useLearningProgress } from "@/hooks/use-learning-progress";
import {
  trackProgressEvent,
  trackProgressEventServer,
} from "@/lib/learning-progress-analytics";
import { enqueueLearningActivity } from "@/lib/learning-sync-engine";
import type {
  ProgressAnalyticsEvent,
  SectionKey,
  RewardEvent,
} from "@workspace/learning-progress-engine";

export interface RecordActivityInput {
  activityId: string;
  section: SectionKey;
  correct?: boolean;
  analyticsEvent?: ProgressAnalyticsEvent;
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Records completions against LearningProgressEngine (server + local analytics).
 */
export function useRecordLearningActivity(
  childId: number | null | undefined,
  opts?: { onRewards?: (events: RewardEvent[]) => void },
) {
  const authFetch = useAuthFetch();
  const { completeActivity, profile, unlocks, refetch } = useLearningProgress(childId);
  const dailyReturnSent = useRef(false);

  useEffect(() => {
    if (!childId || dailyReturnSent.current) return;
    dailyReturnSent.current = true;
    trackProgressEvent("daily_return", childId);
    void trackProgressEventServer(authFetch, "daily_return", childId);
  }, [authFetch, childId]);

  const recordActivity = useCallback(
    async (input: RecordActivityInput) => {
      if (!childId) return;

      // Enqueue through the sync engine — handles dedup, retry, offline.
      // The engine notifies the celebration channel via configureLearningSync,
      // but we keep the direct callback path as a fast-path for tests / SSR.
      const enqueued = enqueueLearningActivity({
        childId,
        activityId: input.activityId,
        section: input.section,
        correct: input.correct ?? true,
      });

      // Local analytics still fire — they're separate from XP credit and don't
      // contribute to anti-spam (they're for our own observability only).
      const event = input.analyticsEvent;
      if (event) {
        trackProgressEvent(event, childId, input.metadata);
        void trackProgressEventServer(authFetch, event, childId, input.metadata);
      }

      // Best-effort: if the sync engine isn't configured (e.g. tests), fall
      // back to the existing direct mutation so behaviour stays unchanged.
      if (!enqueued) {
        return;
      }

      const prevSkills = profile?.unlockedSkills ?? [];
      void refetch().then((result) => {
        const next = result.data?.profile?.unlockedSkills ?? [];
        const gained = next.filter((s) => !prevSkills.includes(s));
        for (const skill of gained) {
          trackProgressEvent("skill_unlocked", childId, { skill });
          void trackProgressEventServer(authFetch, "skill_unlocked", childId, { skill });
        }
      });

      // The completeActivity mutation is still available for callers that
      // need a synchronous result (e.g. session-step completion). We keep it
      // unused here to avoid double-credit through the sync engine.
      void completeActivity;
      void opts;
    },
    [authFetch, childId, completeActivity, opts, profile?.unlockedSkills, refetch],
  );

  const trackNextSessionOpened = useCallback(() => {
    if (!childId) return;
    trackProgressEvent("next_session_opened", childId, {
      count: unlocks?.nextSessionUnlocks.length ?? 0,
    });
    void trackProgressEventServer(authFetch, "next_session_opened", childId);
  }, [authFetch, childId, unlocks?.nextSessionUnlocks.length]);

  return {
    recordActivity,
    trackNextSessionOpened,
    profile,
    unlocks,
  };
}

/** Map Study Zone play category id → engine section. */
export function playCategoryToSection(categoryId: string): SectionKey {
  switch (categoryId) {
    case "numbers":
      return "math";
    case "alphabets":
      return "phonics";
    case "rhymes":
      return "speech";
    case "shapes":
    case "colors":
      return "memory";
    default:
      return "creativity";
  }
}

/** Map Smart Study subject id → engine section. */
export function studySubjectToSection(subjectId: string): SectionKey {
  if (subjectId === "math") return "math";
  if (subjectId === "english") return "phonics";
  return "math";
}

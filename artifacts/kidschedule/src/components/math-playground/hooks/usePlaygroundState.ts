import { useCallback, useState } from "react";
import {
  buildParentRetentionSnapshot,
  defaultLearningState,
  recordPlaygroundSession,
  recordPlaygroundSessionV4,
  type ParentRetentionSnapshot,
  type PlaygroundEngagementState,
  type PlaygroundPersistedState,
  type PlaygroundRewardState,
  type PlaygroundSessionRecord,
  type PlaygroundSessionRecordV4,
} from "@workspace/math-playground";
import { recordEngagementOutcome } from "@workspace/math-playground-engagement";
import {
  loadPlaygroundState,
  saveParentSnapshot,
  savePlaygroundState,
  updateEngagementState,
} from "../lib/storage";
import { trackParentSnapshotGenerated } from "../lib/playground-analytics";

export function usePlaygroundState(childId: number) {
  const [state, setState] = useState(() => loadPlaygroundState(childId));

  const persistState = useCallback((next: PlaygroundPersistedState) => {
    savePlaygroundState(next);
    setState(next);
  }, []);

  const persistRewards = useCallback(
    (updater: (prev: PlaygroundRewardState) => PlaygroundRewardState) => {
      setState((prev) => {
        const next: PlaygroundPersistedState = {
          ...prev,
          version: 3,
          rewards: updater(prev.rewards),
        };
        savePlaygroundState(next);
        return next;
      });
    },
    [],
  );

  const recordSession = useCallback((record: PlaygroundSessionRecord) => {
    setState((prev) => {
      const learning = recordPlaygroundSession(
        prev.learning ?? defaultLearningState(),
        record,
      );
      const next: PlaygroundPersistedState = { ...prev, version: 3, learning };
      savePlaygroundState(next);
      return next;
    });
  }, []);

  const recordSessionV4 = useCallback((record: PlaygroundSessionRecordV4) => {
    setState((prev) => {
      const learning = recordPlaygroundSessionV4(
        prev.learning ?? defaultLearningState(),
        record,
      );
      const next: PlaygroundPersistedState = { ...prev, version: 3, learning };
      savePlaygroundState(next);
      return next;
    });
  }, []);

  const recordEngagement = useCallback(
    (outcome: "success" | "failure" | "interaction") => {
      setState((prev) => {
        const engagement = recordEngagementOutcome(
          prev.engagement ?? {
            consecutiveSuccesses: 0,
            consecutiveFailures: 0,
            lastInteractionAt: Date.now(),
            sessionStartedAt: Date.now(),
          },
          outcome,
        );
        const next: PlaygroundPersistedState = { ...prev, version: 3, engagement };
        savePlaygroundState(next);
        return next;
      });
    },
    [],
  );

  const generateParentSnapshot = useCallback(
    (ageYears: number): ParentRetentionSnapshot => {
      let snapshot!: ParentRetentionSnapshot;
      setState((prev) => {
        const learning = prev.learning ?? defaultLearningState();
        snapshot = buildParentRetentionSnapshot(learning, prev.rewards, ageYears);
        const next: PlaygroundPersistedState = {
          ...prev,
          version: 3,
          lastParentSnapshot: snapshot,
        };
        savePlaygroundState(next);
        return next;
      });
      trackParentSnapshotGenerated(childId, {
        confidenceStars: snapshot.mathConfidenceStars,
        recommendedActivityId: snapshot.recommendedActivityId,
        trend: snapshot.recommendedTrend,
      });
      return snapshot;
    },
    [childId],
  );

  const setPreferredPlayMode = useCallback(
    (mode: PlaygroundPersistedState["preferredPlayMode"]) => {
      setState((prev) => {
        const next: PlaygroundPersistedState = { ...prev, version: 3, preferredPlayMode: mode };
        savePlaygroundState(next);
        return next;
      });
    },
    [],
  );

  const saveEngagement = useCallback(
    (engagement: PlaygroundEngagementState) => {
      updateEngagementState(childId, engagement);
      setState((prev) => ({ ...prev, version: 3, engagement }));
    },
    [childId],
  );

  const saveSnapshot = useCallback(
    (snapshot: ParentRetentionSnapshot) => {
      saveParentSnapshot(childId, snapshot);
      setState((prev) => ({ ...prev, version: 3, lastParentSnapshot: snapshot }));
    },
    [childId],
  );

  return {
    state,
    rewards: state.rewards,
    learning: state.learning ?? defaultLearningState(),
    engagement: state.engagement,
    lastParentSnapshot: state.lastParentSnapshot,
    preferredPlayMode: state.preferredPlayMode,
    persistRewards,
    persistState,
    recordSession,
    recordSessionV4,
    recordEngagement,
    generateParentSnapshot,
    setPreferredPlayMode,
    saveEngagement,
    saveSnapshot,
  };
}

export type PlaygroundStateApi = ReturnType<typeof usePlaygroundState>;

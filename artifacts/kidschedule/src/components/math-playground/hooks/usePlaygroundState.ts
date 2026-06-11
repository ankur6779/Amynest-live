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
import { refreshPlaygroundIntelligence } from "@workspace/math-playground-reporting";
import {
  loadPlaygroundState,
  saveParentSnapshot,
  savePlaygroundState,
  updateEngagementState,
} from "../lib/storage";
import {
  trackAssessmentCompleted,
  trackLearningGapDetected,
  trackParentSnapshotGenerated,
  trackWorksheetGenerated,
} from "../lib/playground-analytics";

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
          version: 4,
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
      const next: PlaygroundPersistedState = { ...prev, version: 4, learning };
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
      const next: PlaygroundPersistedState = { ...prev, version: 4, learning };
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
        const next: PlaygroundPersistedState = { ...prev, version: 4, engagement };
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
          version: 4,
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

  const refreshIntelligence = useCallback(
    (ageYears: number, childDisplayName: string, afterSessionComplete = false) => {
      let result!: ReturnType<typeof refreshPlaygroundIntelligence>;
      setState((prev) => {
        result = refreshPlaygroundIntelligence({
          state: prev,
          ageYears,
          childDisplayName,
          afterSessionComplete,
        });
        const next: PlaygroundPersistedState = {
          ...prev,
          version: 4,
          intelligence: result.intelligence,
        };
        savePlaygroundState(next);
        return next;
      });

      if (result.gapsDetected > 0) {
        trackLearningGapDetected(childId, result.gapsDetected);
      }
      if (result.parentReportGenerated) {
        trackAssessmentCompleted(childId, {
          type: "parent_report",
          sessions: result.intelligence.schoolReadiness?.sessionCount ?? 0,
        });
      }
      if (result.worksheetGenerated && result.intelligence.generatedWorksheets?.[0]) {
        const ws = result.intelligence.generatedWorksheets[0].worksheet;
        trackWorksheetGenerated(childId, { category: ws.category, level: ws.level });
      }

      return result;
    },
    [childId],
  );

  const setPreferredPlayMode = useCallback(
    (mode: PlaygroundPersistedState["preferredPlayMode"]) => {
      setState((prev) => {
        const next: PlaygroundPersistedState = { ...prev, version: 4, preferredPlayMode: mode };
        savePlaygroundState(next);
        return next;
      });
    },
    [],
  );

  const saveEngagement = useCallback(
    (engagement: PlaygroundEngagementState) => {
      updateEngagementState(childId, engagement);
      setState((prev) => ({ ...prev, version: 4, engagement }));
    },
    [childId],
  );

  const saveSnapshot = useCallback(
    (snapshot: ParentRetentionSnapshot) => {
      saveParentSnapshot(childId, snapshot);
      setState((prev) => ({ ...prev, version: 4, lastParentSnapshot: snapshot }));
    },
    [childId],
  );

  return {
    state,
    rewards: state.rewards,
    learning: state.learning ?? defaultLearningState(),
    engagement: state.engagement,
    intelligence: state.intelligence,
    lastParentSnapshot: state.lastParentSnapshot,
    preferredPlayMode: state.preferredPlayMode,
    persistRewards,
    persistState,
    recordSession,
    recordSessionV4,
    recordEngagement,
    generateParentSnapshot,
    refreshIntelligence,
    setPreferredPlayMode,
    saveEngagement,
    saveSnapshot,
  };
}

export type PlaygroundStateApi = ReturnType<typeof usePlaygroundState>;

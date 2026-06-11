import { useCallback, useRef, useState } from "react";
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
  const stateRef = useRef(state);
  stateRef.current = state;

  const commitState = useCallback((next: PlaygroundPersistedState) => {
    stateRef.current = next;
    savePlaygroundState(next);
    setState(next);
    return next;
  }, []);

  const persistState = useCallback(
    (next: PlaygroundPersistedState) => commitState(next),
    [commitState],
  );

  const persistRewards = useCallback(
    (updater: (prev: PlaygroundRewardState) => PlaygroundRewardState) => {
      const prev = stateRef.current;
      return commitState({
        ...prev,
        version: 4,
        rewards: updater(prev.rewards),
      });
    },
    [commitState],
  );

  const recordSession = useCallback(
    (record: PlaygroundSessionRecord) => {
      const prev = stateRef.current;
      const learning = recordPlaygroundSession(
        prev.learning ?? defaultLearningState(),
        record,
      );
      return commitState({ ...prev, version: 4, learning });
    },
    [commitState],
  );

  const recordSessionV4 = useCallback(
    (record: PlaygroundSessionRecordV4) => {
      const prev = stateRef.current;
      const learning = recordPlaygroundSessionV4(
        prev.learning ?? defaultLearningState(),
        record,
      );
      return commitState({ ...prev, version: 4, learning });
    },
    [commitState],
  );

  const recordEngagement = useCallback(
    (outcome: "success" | "failure" | "interaction") => {
      const prev = stateRef.current;
      const engagement = recordEngagementOutcome(
        prev.engagement ?? {
          consecutiveSuccesses: 0,
          consecutiveFailures: 0,
          lastInteractionAt: Date.now(),
          sessionStartedAt: Date.now(),
        },
        outcome,
      );
      return commitState({ ...prev, version: 4, engagement });
    },
    [commitState],
  );

  const generateParentSnapshot = useCallback(
    (ageYears: number): ParentRetentionSnapshot => {
      const prev = stateRef.current;
      const learning = prev.learning ?? defaultLearningState();
      const snapshot = buildParentRetentionSnapshot(learning, prev.rewards, ageYears);
      commitState({ ...prev, version: 4, lastParentSnapshot: snapshot });
      trackParentSnapshotGenerated(childId, {
        confidenceStars: snapshot.mathConfidenceStars,
        recommendedActivityId: snapshot.recommendedActivityId,
        trend: snapshot.recommendedTrend,
      });
      return snapshot;
    },
    [childId, commitState],
  );

  const refreshIntelligence = useCallback(
    (ageYears: number, childDisplayName: string, afterSessionComplete = false) => {
      const prev = stateRef.current;
      const result = refreshPlaygroundIntelligence({
        state: prev,
        ageYears,
        childDisplayName,
        afterSessionComplete,
      });
      commitState({ ...prev, version: 4, intelligence: result.intelligence });

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
    [childId, commitState],
  );

  const setPreferredPlayMode = useCallback(
    (mode: PlaygroundPersistedState["preferredPlayMode"]) => {
      const prev = stateRef.current;
      return commitState({ ...prev, version: 4, preferredPlayMode: mode });
    },
    [commitState],
  );

  const saveEngagement = useCallback(
    (engagement: PlaygroundEngagementState) => {
      updateEngagementState(childId, engagement);
      const prev = stateRef.current;
      return commitState({ ...prev, version: 4, engagement });
    },
    [childId, commitState],
  );

  const saveSnapshot = useCallback(
    (snapshot: ParentRetentionSnapshot) => {
      saveParentSnapshot(childId, snapshot);
      const prev = stateRef.current;
      return commitState({ ...prev, version: 4, lastParentSnapshot: snapshot });
    },
    [childId, commitState],
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

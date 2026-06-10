import { useCallback, useState } from "react";
import {
  defaultLearningState,
  recordPlaygroundSession,
  type PlaygroundRewardState,
  type PlaygroundSessionRecord,
} from "@workspace/math-playground";
import { loadPlaygroundState, savePlaygroundState } from "../lib/storage";

export function usePlaygroundState(childId: number) {
  const [state, setState] = useState(() => loadPlaygroundState(childId));

  const persistRewards = useCallback(
    (updater: (prev: PlaygroundRewardState) => PlaygroundRewardState) => {
      setState((prev) => {
        const nextRewards = updater(prev.rewards);
        const next = { ...prev, version: 2 as const, rewards: nextRewards };
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
      const next = { ...prev, version: 2 as const, learning };
      savePlaygroundState(next);
      return next;
    });
  }, []);

  return {
    rewards: state.rewards,
    learning: state.learning ?? defaultLearningState(),
    persistRewards,
    recordSession,
  };
}

export type PlaygroundStateApi = ReturnType<typeof usePlaygroundState>;

import {
  defaultLearningState,
  defaultRewardState,
  syncRewardProgress,
  type PlaygroundPersistedState,
} from "@workspace/math-playground";

const LS_PREFIX = "amynest_math_playground_v2";

export function loadPlaygroundState(childId: number): PlaygroundPersistedState {
  try {
    const v2 = localStorage.getItem(`${LS_PREFIX}_${childId}`);
    const v1 = localStorage.getItem(`amynest_math_playground_v1_${childId}`);
    const raw = v2 ?? v1;
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlaygroundPersistedState>;
      return {
        version: 2,
        childId,
        rewards: syncRewardProgress({ ...defaultRewardState(), ...parsed.rewards }),
        learning: { ...defaultLearningState(), ...parsed.learning },
      };
    }
  } catch {
    /* ignore */
  }
  return {
    version: 2,
    childId,
    rewards: defaultRewardState(),
    learning: defaultLearningState(),
  };
}

export function savePlaygroundState(state: PlaygroundPersistedState): void {
  try {
    localStorage.setItem(`${LS_PREFIX}_${state.childId}`, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

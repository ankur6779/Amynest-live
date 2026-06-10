import {
  defaultEngagementState,
  defaultLearningState,
  defaultRewardState,
  syncRewardProgress,
  type PlaygroundEngagementState,
  type PlaygroundPersistedState,
  type ParentRetentionSnapshot,
} from "@workspace/math-playground";

const LS_PREFIX_V2 = "amynest_math_playground_v2";
const LS_PREFIX_V3 = "amynest_math_playground_v3";
const LS_PREFIX_V1 = "amynest_math_playground_v1";

function normalizeV3(
  childId: number,
  parsed: Partial<PlaygroundPersistedState>,
): PlaygroundPersistedState {
  return {
    version: 3,
    childId,
    rewards: syncRewardProgress({ ...defaultRewardState(), ...parsed.rewards }),
    learning: { ...defaultLearningState(), ...parsed.learning },
    preferredPlayMode: parsed.preferredPlayMode,
    lastParentSnapshot: parsed.lastParentSnapshot,
    engagement: parsed.engagement ?? defaultEngagementState(),
  };
}

export function loadPlaygroundState(childId: number): PlaygroundPersistedState {
  try {
    const v3 = localStorage.getItem(`${LS_PREFIX_V3}_${childId}`);
    if (v3) {
      const parsed = JSON.parse(v3) as Partial<PlaygroundPersistedState>;
      return normalizeV3(childId, parsed);
    }

    const v2 = localStorage.getItem(`${LS_PREFIX_V2}_${childId}`);
    const v1 = localStorage.getItem(`${LS_PREFIX_V1}_${childId}`);
    const raw = v2 ?? v1;
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlaygroundPersistedState>;
      const migrated = normalizeV3(childId, parsed);
      savePlaygroundState(migrated);
      return migrated;
    }
  } catch {
    /* ignore */
  }

  return {
    version: 3,
    childId,
    rewards: defaultRewardState(),
    learning: defaultLearningState(),
    engagement: defaultEngagementState(),
  };
}

export function savePlaygroundState(state: PlaygroundPersistedState): void {
  try {
    const toSave: PlaygroundPersistedState = {
      ...state,
      version: 3,
      engagement: state.engagement ?? defaultEngagementState(),
    };
    localStorage.setItem(`${LS_PREFIX_V3}_${state.childId}`, JSON.stringify(toSave));
  } catch {
    /* ignore */
  }
}

export function saveParentSnapshot(
  childId: number,
  snapshot: ParentRetentionSnapshot,
): PlaygroundPersistedState | null {
  try {
    const current = loadPlaygroundState(childId);
    const next: PlaygroundPersistedState = {
      ...current,
      version: 3,
      lastParentSnapshot: snapshot,
    };
    savePlaygroundState(next);
    return next;
  } catch {
    return null;
  }
}

export function updateEngagementState(
  childId: number,
  engagement: PlaygroundEngagementState,
): PlaygroundPersistedState | null {
  try {
    const current = loadPlaygroundState(childId);
    const next: PlaygroundPersistedState = {
      ...current,
      version: 3,
      engagement,
    };
    savePlaygroundState(next);
    return next;
  } catch {
    return null;
  }
}

/** Test / debug helper — reads legacy v2 key without migrating. */
export function _readLegacyV2State(childId: number): PlaygroundPersistedState | null {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX_V2}_${childId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlaygroundPersistedState>;
    return {
      version: 2,
      childId,
      rewards: syncRewardProgress({ ...defaultRewardState(), ...parsed.rewards }),
      learning: { ...defaultLearningState(), ...parsed.learning },
    };
  } catch {
    return null;
  }
}

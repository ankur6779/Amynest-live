import type { PhonicsStoryProgressPayload } from "@workspace/phonics-v3-progress";
import { defaultStoryProgressPayload } from "@workspace/phonics-v3-progress";

const STORAGE_PREFIX = "amynest:phonics-v3-stories:";

export type PhonicsStoryProgressState = PhonicsStoryProgressPayload;

export function defaultStoryProgressState(): PhonicsStoryProgressState {
  return defaultStoryProgressPayload();
}

export function loadStoryProgressLocal(childId: number): PhonicsStoryProgressState {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${childId}`);
    if (!raw) return defaultStoryProgressState();
    return { ...defaultStoryProgressState(), ...JSON.parse(raw) };
  } catch {
    return defaultStoryProgressState();
  }
}

export function saveStoryProgressLocal(
  childId: number,
  state: PhonicsStoryProgressState,
): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${childId}`, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

export function recordStoryCompleteLocal(
  state: PhonicsStoryProgressState,
  storyId: string,
): PhonicsStoryProgressState {
  const id = storyId.trim();
  const prev = state.completed[id];
  return {
    ...state,
    completed: {
      ...state.completed,
      [id]: {
        completedAt: Date.now(),
        readCount: (prev?.readCount ?? 0) + 1,
      },
    },
  };
}

import type { FirstExperienceState } from "./types";

const KEY = "amynest_first_experience_v1";

export function createEmptyFirstExperienceState(): FirstExperienceState {
  return {
    version: 1,
    step: "welcome",
    childName: "",
    ageBand: null,
    todayContext: null,
    nextThing: null,
    completedAt: null,
    valueEarned: false,
    completionKind: null,
    startedAt: new Date().toISOString(),
  };
}

export function loadFirstExperienceState(): FirstExperienceState {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return createEmptyFirstExperienceState();
    const parsed = JSON.parse(raw) as FirstExperienceState;
    if (!parsed || parsed.version !== 1) return createEmptyFirstExperienceState();
    const merged: FirstExperienceState = {
      ...createEmptyFirstExperienceState(),
      ...parsed,
      version: 1,
    };
    // Value already earned → resume at keep (identity protects value).
    if (merged.valueEarned && merged.nextThing && merged.step !== "keep") {
      return { ...merged, step: "keep" };
    }
    return merged;
  } catch {
    return createEmptyFirstExperienceState();
  }
}

export function saveFirstExperienceState(state: FirstExperienceState): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export function clearFirstExperienceState(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function hasFirstExperienceValue(): boolean {
  try {
    const state = loadFirstExperienceState();
    return Boolean(state.valueEarned && state.nextThing);
  } catch {
    return false;
  }
}

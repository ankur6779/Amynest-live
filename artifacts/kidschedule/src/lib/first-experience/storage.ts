import type { FirstExperienceState } from "./types";

const SESSION_KEY = "amynest_first_experience_v1";
const GUEST_KEY = "amynest_guest_plan_v1";

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
    activeBlockIndex: null,
  };
}

function normalize(parsed: Partial<FirstExperienceState> | null | undefined): FirstExperienceState {
  const merged: FirstExperienceState = {
    ...createEmptyFirstExperienceState(),
    ...parsed,
    version: 1,
  };
  if (merged.nextThing) {
    merged.nextThing = {
      ...merged.nextThing,
      blocks: Array.isArray(merged.nextThing.blocks) ? merged.nextThing.blocks : [],
    };
  }
  return merged;
}

function readJson(key: string): FirstExperienceState | null {
  try {
    const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
    if (!raw) return null;
    return normalize(JSON.parse(raw) as FirstExperienceState);
  } catch {
    return null;
  }
}

export function loadFirstExperienceState(): FirstExperienceState {
  const fromSession = readJson(SESSION_KEY);
  if (fromSession) {
    if (fromSession.valueEarned && fromSession.nextThing && fromSession.step !== "keep" && fromSession.step !== "plan-home") {
      return { ...fromSession, step: "plan-home" };
    }
    return fromSession;
  }
  const guest = readJson(GUEST_KEY);
  if (guest?.nextThing) {
    return {
      ...guest,
      step: guest.step === "welcome" ? "plan-home" : guest.step,
    };
  }
  return createEmptyFirstExperienceState();
}

export function saveFirstExperienceState(state: FirstExperienceState): void {
  const serialized = JSON.stringify(state);
  try {
    sessionStorage.setItem(SESSION_KEY, serialized);
  } catch {
    /* ignore quota */
  }
  try {
    localStorage.setItem(GUEST_KEY, serialized);
  } catch {
    /* ignore quota */
  }
}

export function clearFirstExperienceState(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(GUEST_KEY);
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

export function hasGuestPlanBlocks(): boolean {
  try {
    const state = loadFirstExperienceState();
    return (state.nextThing?.blocks?.length ?? 0) >= 4;
  } catch {
    return false;
  }
}

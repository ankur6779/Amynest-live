import type { SmartStudyLesson } from "./types.js";
import type { ContentBankLessonVisibility } from "./lesson-visibility.js";
import { extractCompletedSmartStudyIds } from "./lesson-visibility.js";
import { getUnseenLessons } from "./recommendations.js";

/** Minimum time before the next login may advance the fresh lesson (24h). */
export const FRESH_LESSON_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface FreshLessonProgressState {
  currentFreshLessonId: string | null;
  currentFreshLessonAssignedAt: string | null;
  freshLessonSequence: string[];
}

export type FreshLessonProgressEvent = "assigned" | "reopened" | "advanced";

export function emptyFreshLessonState(): FreshLessonProgressState {
  return {
    currentFreshLessonId: null,
    currentFreshLessonAssignedAt: null,
    freshLessonSequence: [],
  };
}

export function shouldAdvanceFreshLesson(
  state: FreshLessonProgressState,
  nowMs: number = Date.now(),
): boolean {
  if (!state.currentFreshLessonId || !state.currentFreshLessonAssignedAt) return true;
  const assigned = Date.parse(state.currentFreshLessonAssignedAt);
  if (Number.isNaN(assigned)) return true;
  return nowMs - assigned >= FRESH_LESSON_WINDOW_MS;
}

/**
 * Stable progression order: unseen lessons first (catalog id order), then
 * least-recently-viewed revisits.
 */
export function buildFreshLessonSequence(
  unlockedLessons: SmartStudyLesson[],
  visibility: ContentBankLessonVisibility,
  completedActivityIds: string[],
): string[] {
  if (unlockedLessons.length === 0) return [];
  const unseen = getUnseenLessons(unlockedLessons, visibility, completedActivityIds);
  const unseenIds = new Set(unseen.map((l) => l.id));
  const unseenSorted = [...unseen].sort((a, b) => a.id.localeCompare(b.id));

  const revisit = unlockedLessons.filter((l) => !unseenIds.has(l.id));
  const revisitSorted = [...revisit].sort((a, b) => {
    const ta = visibility.viewed[a.id];
    const tb = visibility.viewed[b.id];
    if (!ta && !tb) return a.id.localeCompare(b.id);
    if (!ta) return -1;
    if (!tb) return 1;
    if (ta !== tb) return ta.localeCompare(tb);
    return a.id.localeCompare(b.id);
  });

  return [...unseenSorted, ...revisitSorted].map((l) => l.id);
}

export function nextLessonIdInSequence(
  sequence: string[],
  currentId: string | null,
): string | null {
  if (sequence.length === 0) return null;
  if (!currentId) return sequence[0] ?? null;
  const idx = sequence.indexOf(currentId);
  if (idx < 0) return sequence[0] ?? null;
  if (idx + 1 < sequence.length) return sequence[idx + 1]!;
  return currentId;
}

export function assignFreshLesson(
  sequence: string[],
  lessonId: string,
  assignedAtIso: string,
): FreshLessonProgressState {
  return {
    currentFreshLessonId: lessonId,
    currentFreshLessonAssignedAt: assignedAtIso,
    freshLessonSequence: sequence,
  };
}

export function advanceFreshLesson(
  state: FreshLessonProgressState,
  sequence: string[],
  assignedAtIso: string,
): { state: FreshLessonProgressState; advanced: boolean } {
  const nextId = nextLessonIdInSequence(sequence, state.currentFreshLessonId);
  if (!nextId || nextId === state.currentFreshLessonId) {
    return {
      state: { ...state, freshLessonSequence: sequence },
      advanced: false,
    };
  }
  return {
    state: assignFreshLesson(sequence, nextId, assignedAtIso),
    advanced: true,
  };
}

export interface ResolveFreshLessonInput {
  state: FreshLessonProgressState;
  sequence: string[];
  nowMs?: number;
}

export interface ResolveFreshLessonResult {
  state: FreshLessonProgressState;
  lessonId: string | null;
  event: FreshLessonProgressEvent;
}

/**
 * Login-driven fresh lesson resolver.
 * - Same lesson within 24h of assignment (completion does not advance).
 * - After 24h on login: advance exactly one step in sequence (never skip days).
 */
export function resolveFreshLessonOnLogin(
  input: ResolveFreshLessonInput,
): ResolveFreshLessonResult {
  const nowMs = input.nowMs ?? Date.now();
  const assignedAtIso = new Date(nowMs).toISOString();
  const sequence = input.sequence;
  let state: FreshLessonProgressState = {
    ...input.state,
    freshLessonSequence: sequence,
  };

  if (sequence.length === 0) {
    return { state: emptyFreshLessonState(), lessonId: null, event: "reopened" };
  }

  if (!state.currentFreshLessonId) {
    const id = sequence[0]!;
    state = assignFreshLesson(sequence, id, assignedAtIso);
    return { state, lessonId: id, event: "assigned" };
  }

  if (!sequence.includes(state.currentFreshLessonId)) {
    const id = sequence[0]!;
    state = assignFreshLesson(sequence, id, assignedAtIso);
    return { state, lessonId: id, event: "assigned" };
  }

  if (shouldAdvanceFreshLesson(state, nowMs)) {
    const { state: nextState, advanced } = advanceFreshLesson(state, sequence, assignedAtIso);
    return {
      state: nextState,
      lessonId: nextState.currentFreshLessonId,
      event: advanced ? "advanced" : "reopened",
    };
  }

  return {
    state,
    lessonId: state.currentFreshLessonId,
    event: "reopened",
  };
}

export function getCurrentFreshLessonId(state: FreshLessonProgressState): string | null {
  return state.currentFreshLessonId;
}

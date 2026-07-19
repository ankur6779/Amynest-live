/**
 * Persist unfinished 10-step reading lessons so "Continue Learning"
 * resumes the exact activity (offline-safe, no extra API calls).
 */

import type {
  LessonStepResult,
  ReadingLessonState,
  ReadingLessonTarget,
} from "./reading-lesson-engine";

const STORAGE_PREFIX = "amynest:phonics-lesson-resume:";

export type LessonResumeSnapshot = {
  version: 1;
  grapheme: string;
  letterGroupIndex: number;
  focusWord: string;
  stepIndex: number;
  results: LessonStepResult[];
  starsEarned: number;
  updatedAt: number;
};

function storageKey(childId: number): string {
  return `${STORAGE_PREFIX}${childId}`;
}

export function loadLessonResume(childId: number): LessonResumeSnapshot | null {
  if (typeof window === "undefined" || !Number.isFinite(childId) || childId <= 0) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(storageKey(childId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LessonResumeSnapshot;
    if (
      !parsed ||
      parsed.version !== 1 ||
      typeof parsed.grapheme !== "string" ||
      typeof parsed.stepIndex !== "number" ||
      parsed.stepIndex < 0
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeSnapshot(childId: number, state: ReadingLessonState): void {
  const snapshot: LessonResumeSnapshot = {
    version: 1,
    grapheme: state.target.grapheme,
    letterGroupIndex: state.target.letterGroupIndex,
    focusWord: state.target.focusWord,
    stepIndex: state.stepIndex,
    results: state.results,
    starsEarned: state.starsEarned,
    updatedAt: Date.now(),
  };
  try {
    window.localStorage.setItem(storageKey(childId), JSON.stringify(snapshot));
  } catch {
    /* quota */
  }
}

/** Persist unfinished lesson progress (including step 0 once opened). */
export function saveLessonResume(
  childId: number,
  state: ReadingLessonState,
): void {
  if (typeof window === "undefined" || !Number.isFinite(childId) || childId <= 0) {
    return;
  }
  if (state.complete) {
    clearLessonResume(childId);
    return;
  }
  writeSnapshot(childId, state);
}

/** Alias kept for call sites that force-save on cancel/open. */
export function saveLessonResumeForce(
  childId: number,
  state: ReadingLessonState,
): void {
  saveLessonResume(childId, state);
}

export function clearLessonResume(childId: number): void {
  if (typeof window === "undefined" || !Number.isFinite(childId) || childId <= 0) {
    return;
  }
  try {
    window.localStorage.removeItem(storageKey(childId));
  } catch {
    /* ignore */
  }
}

export function hasActiveLessonResume(
  childId: number,
  opts?: { grapheme?: string; letterGroupIndex?: number },
): boolean {
  const snap = loadLessonResume(childId);
  if (!snap) return false;
  if (opts?.grapheme && snap.grapheme !== opts.grapheme.trim().toLowerCase()) {
    return false;
  }
  if (
    opts?.letterGroupIndex != null &&
    snap.letterGroupIndex !== opts.letterGroupIndex
  ) {
    return false;
  }
  return !Number.isNaN(snap.stepIndex);
}

export function resumeMatchesTarget(
  snap: LessonResumeSnapshot | null,
  target: ReadingLessonTarget,
): boolean {
  if (!snap) return false;
  return (
    snap.grapheme === target.grapheme &&
    snap.letterGroupIndex === target.letterGroupIndex &&
    snap.focusWord === target.focusWord &&
    snap.stepIndex >= 0 &&
    snap.stepIndex < 10
  );
}

export function applyResumeToState(
  target: ReadingLessonTarget,
  snap: LessonResumeSnapshot | null,
): ReadingLessonState {
  if (!resumeMatchesTarget(snap, target) || !snap) {
    return {
      target,
      stepIndex: 0,
      results: [],
      complete: false,
      starsEarned: 0,
    };
  }
  return {
    target,
    stepIndex: Math.min(9, Math.max(0, snap.stepIndex)),
    results: Array.isArray(snap.results) ? snap.results : [],
    complete: false,
    starsEarned: snap.starsEarned ?? 0,
  };
}

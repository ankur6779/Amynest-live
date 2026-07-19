/**
 * Daily Learning Session — Amy-guided flow (UX orchestration only).
 * Does not change SATPIN, lesson engine, coach scoring, or mastery math.
 */

export const DAILY_SESSION_STEPS = [
  "lesson",
  "words",
  "coach",
  "story",
] as const;

export type DailySessionStepId = (typeof DAILY_SESSION_STEPS)[number];

export type DailySessionPhase = DailySessionStepId | "complete" | "idle";

export type DailySessionPlanItem = {
  id: DailySessionStepId;
  label: string;
  done: boolean;
};

export type DailySessionSummary = {
  soundsLearned: number;
  wordsRead: number;
  storiesCompleted: number;
  starsEarned: number;
  minutesSpent: number;
  coachCompleted: boolean;
};

export type DailySessionState = {
  version: 1;
  dateKey: string;
  childId: number;
  phase: DailySessionPhase;
  stepIndex: number;
  grapheme: string;
  letterGroupIndex: number;
  focusWord: string;
  practiceWords: string[];
  wordsCompleted: string[];
  coachCompleted: boolean;
  storyCompleted: boolean;
  lessonCompleted: boolean;
  soundsLearned: number;
  starsEarned: number;
  startedAt: number;
  completedAt: number | null;
  active: boolean;
};

const STORAGE_PREFIX = "amynest:phonics-daily-session:";

export function localDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function storageKey(childId: number): string {
  return `${STORAGE_PREFIX}${childId}`;
}

export function stepMeta(stepId: DailySessionStepId): {
  label: string;
  shortLabel: string;
  emoji: string;
} {
  switch (stepId) {
    case "lesson":
      return { label: "Learn new sound", shortLabel: "Lesson", emoji: "📘" };
    case "words":
      return { label: "Read 3 words", shortLabel: "Word Practice", emoji: "📖" };
    case "coach":
      return { label: "AI speaking practice", shortLabel: "Coach", emoji: "🎙️" };
    case "story":
      return { label: "Story", shortLabel: "Story", emoji: "📚" };
  }
}

export function defaultDailySessionState(
  childId: number,
  opts: {
    grapheme: string;
    letterGroupIndex: number;
    focusWord: string;
    practiceWords: string[];
    dateKey?: string;
  },
): DailySessionState {
  return {
    version: 1,
    dateKey: opts.dateKey ?? localDateKey(),
    childId,
    phase: "idle",
    stepIndex: 0,
    grapheme: opts.grapheme.trim().toLowerCase(),
    letterGroupIndex: opts.letterGroupIndex,
    focusWord: opts.focusWord.trim().toLowerCase(),
    practiceWords: opts.practiceWords.map((w) => w.toLowerCase()).slice(0, 3),
    wordsCompleted: [],
    coachCompleted: false,
    storyCompleted: false,
    lessonCompleted: false,
    soundsLearned: 0,
    starsEarned: 0,
    startedAt: 0,
    completedAt: null,
    active: false,
  };
}

export function loadDailySession(childId: number): DailySessionState | null {
  if (typeof window === "undefined" || !Number.isFinite(childId) || childId <= 0) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(storageKey(childId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailySessionState;
    if (!parsed || parsed.version !== 1 || parsed.childId !== childId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDailySession(childId: number, state: DailySessionState): void {
  if (typeof window === "undefined" || !Number.isFinite(childId) || childId <= 0) {
    return;
  }
  try {
    window.localStorage.setItem(storageKey(childId), JSON.stringify(state));
  } catch {
    /* quota */
  }
}

export function clearDailySession(childId: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(childId));
  } catch {
    /* ignore */
  }
}

/** Resolve today's session: keep unfinished same-day; reset on new day. */
export function resolveTodaySession(
  childId: number,
  opts: {
    grapheme: string;
    letterGroupIndex: number;
    focusWord: string;
    practiceWords: string[];
    now?: Date;
  },
): DailySessionState {
  const today = localDateKey(opts.now);
  const existing = loadDailySession(childId);
  if (existing && existing.dateKey === today) {
    return existing;
  }
  return defaultDailySessionState(childId, {
    grapheme: opts.grapheme,
    letterGroupIndex: opts.letterGroupIndex,
    focusWord: opts.focusWord,
    practiceWords: opts.practiceWords,
    dateKey: today,
  });
}

export function isSessionInProgress(state: DailySessionState | null): boolean {
  if (!state) return false;
  if (state.dateKey !== localDateKey()) return false;
  if (state.phase === "complete") return false;
  return state.active || state.phase !== "idle" || state.stepIndex > 0 || state.lessonCompleted;
}

export function isSessionCompleteToday(state: DailySessionState | null): boolean {
  return Boolean(
    state && state.dateKey === localDateKey() && state.phase === "complete",
  );
}

export function startDailySession(state: DailySessionState): DailySessionState {
  if (state.phase === "complete" && state.dateKey === localDateKey()) {
    return state;
  }
  const resuming = isSessionInProgress(state);
  const stepIndex = resuming
    ? Math.min(Math.max(0, state.stepIndex), DAILY_SESSION_STEPS.length - 1)
    : 0;
  let phase: DailySessionStepId = "lesson";
  if (resuming) {
    if (state.phase === "idle" || state.phase === "complete") {
      phase = DAILY_SESSION_STEPS[stepIndex]!;
    } else {
      phase = state.phase;
    }
  }
  return {
    ...state,
    phase,
    stepIndex: DAILY_SESSION_STEPS.indexOf(phase),
    active: true,
    startedAt: state.startedAt || Date.now(),
    completedAt: null,
  };
}

export function pauseDailySession(state: DailySessionState): DailySessionState {
  return { ...state, active: false };
}

export function advanceDailySession(
  state: DailySessionState,
  patch?: Partial<
    Pick<
      DailySessionState,
      | "lessonCompleted"
      | "wordsCompleted"
      | "coachCompleted"
      | "storyCompleted"
      | "soundsLearned"
      | "starsEarned"
      | "focusWord"
    >
  >,
): DailySessionState {
  const merged = { ...state, ...patch, active: true };
  const current = DAILY_SESSION_STEPS[merged.stepIndex] ?? "lesson";
  const nextIndex = merged.stepIndex + 1;

  if (nextIndex >= DAILY_SESSION_STEPS.length) {
    return {
      ...merged,
      phase: "complete",
      stepIndex: DAILY_SESSION_STEPS.length - 1,
      active: false,
      completedAt: Date.now(),
      storyCompleted: true,
    };
  }

  // Mark current step done flags when advancing
  const withFlags: DailySessionState = {
    ...merged,
    lessonCompleted: current === "lesson" ? true : merged.lessonCompleted,
    coachCompleted: current === "coach" ? true : merged.coachCompleted,
    storyCompleted: current === "story" ? true : merged.storyCompleted,
  };

  return {
    ...withFlags,
    stepIndex: nextIndex,
    phase: DAILY_SESSION_STEPS[nextIndex]!,
  };
}

export function buildSessionPlan(state: DailySessionState): DailySessionPlanItem[] {
  return DAILY_SESSION_STEPS.map((id, i) => {
    const meta = stepMeta(id);
    let done = false;
    if (state.phase === "complete") done = true;
    else if (i < state.stepIndex) done = true;
    else if (id === "lesson" && state.lessonCompleted) done = true;
    else if (id === "words" && state.wordsCompleted.length >= 3) done = true;
    else if (id === "coach" && state.coachCompleted) done = true;
    else if (id === "story" && state.storyCompleted) done = true;
    return { id, label: meta.label, done };
  });
}

export function buildSessionSummary(state: DailySessionState): DailySessionSummary {
  const elapsedMs = Math.max(
    0,
    (state.completedAt ?? Date.now()) - (state.startedAt || Date.now()),
  );
  return {
    soundsLearned: Math.max(state.soundsLearned, state.lessonCompleted ? 1 : 0),
    wordsRead: Math.max(state.wordsCompleted.length, state.focusWord ? 1 : 0),
    storiesCompleted: state.storyCompleted || state.phase === "complete" ? 1 : 0,
    starsEarned: Math.max(15, state.starsEarned || 15),
    minutesSpent: Math.max(1, Math.round(elapsedMs / 60000) || 8),
    coachCompleted: state.coachCompleted,
  };
}

export function sessionProgressLabel(state: DailySessionState): {
  stepNumber: number;
  total: number;
  shortLabel: string;
  dots: ("done" | "current" | "todo")[];
} {
  const total = DAILY_SESSION_STEPS.length;
  if (state.phase === "complete") {
    return {
      stepNumber: total,
      total,
      shortLabel: "Done",
      dots: Array.from({ length: total }, () => "done" as const),
    };
  }
  const stepNumber = Math.min(total, Math.max(1, state.stepIndex + 1));
  const currentId = DAILY_SESSION_STEPS[state.stepIndex] ?? "lesson";
  return {
    stepNumber,
    total,
    shortLabel: stepMeta(currentId).shortLabel,
    dots: DAILY_SESSION_STEPS.map((_, i) =>
      i < state.stepIndex ? "done" : i === state.stepIndex ? "current" : "todo",
    ),
  };
}

export function primarySessionCta(state: DailySessionState | null): {
  kind: "start" | "continue" | "done";
  label: string;
} {
  if (isSessionCompleteToday(state)) {
    return { kind: "done", label: "Done for today" };
  }
  if (isSessionInProgress(state)) {
    return { kind: "continue", label: "Continue Today's Adventure" };
  }
  return { kind: "start", label: "Start Today" };
}

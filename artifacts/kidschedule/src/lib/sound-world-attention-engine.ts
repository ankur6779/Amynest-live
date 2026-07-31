/**
 * Amy Sound World — Attention Engine (rule-based, local-only).
 * Infers preschool engagement from interaction behavior. No camera/mic/AI/cloud.
 */

import type { WorldId } from "@workspace/world-engine";

export type AttentionClassification =
  | "highly_focused"
  | "focused"
  | "neutral"
  | "distracted"
  | "fatigued";

export type SessionRhythmPhase =
  | "start_energy"
  | "peak_engagement"
  | "drop_off"
  | "recovery"
  | "completion";

export type AttentionEventType =
  | "session_start"
  | "pointer_activity"
  | "idle_sample"
  | "hesitation"
  | "repeat_tap"
  | "rapid_skip"
  | "answer_correct"
  | "answer_incorrect"
  | "replay"
  | "hint"
  | "object_open"
  | "revisit"
  | "navigate"
  | "task_complete"
  | "session_end";

export type AttentionEvent = {
  type: AttentionEventType;
  at: number;
  worldId?: WorldId;
  itemId?: string;
  /** Idle sample duration in ms */
  idleMs?: number;
  /** Hesitation gap in ms before acting */
  gapMs?: number;
};

export type AttentionCounters = {
  interactions: number;
  idleMsTotal: number;
  activeMsEstimate: number;
  hesitations: number;
  repeatTaps: number;
  rapidSkips: number;
  correct: number;
  incorrect: number;
  incorrectStreak: number;
  maxIncorrectStreak: number;
  replays: number;
  hints: number;
  objectOpens: number;
  revisits: number;
  navigations: number;
  completions: number;
  uniqueItems: string[];
  scoreHistory: Array<{ at: number; score: number }>;
};

export type AttentionSessionState = {
  sessionId: string;
  childId: number;
  startedAt: number;
  lastActivityAt: number;
  lastItemId: string | null;
  lastTapAt: number;
  lastTapKey: string | null;
  lastPromptAt: number | null;
  peakScore: number;
  sawDropOff: boolean;
  recoveredAfterDrop: boolean;
  completed: boolean;
  counters: AttentionCounters;
};

export type AttentionSignals = {
  idleRatio: number;
  hesitationRate: number;
  repeatTapRate: number;
  rapidSkipRate: number;
  sessionMinutes: number;
  incorrectStreak: number;
  revisitRate: number;
  objectInteractionRate: number;
  hintRate: number;
  replayRate: number;
  navigationPerMinute: number;
  completionRate: number;
  accuracy: number;
};

export type AdaptiveProfile = {
  visualComplexity: "full" | "reduced" | "minimal";
  narrationLength: "full" | "short";
  taskDifficulty: "easier" | "standard" | "harder";
  encouragement: boolean;
  suggestBreak: boolean;
  suggestRelaxWorld: boolean;
  offerBonusTask: boolean;
  offerExploration: boolean;
  animationIntensity: "full" | "reduced" | "minimal";
  quizOptionCount: 2 | 3 | 4;
  coachMessage: string | null;
  coachTone: "encourage" | "challenge" | "rest" | "neutral";
};

export type AttentionSnapshot = {
  score: number;
  classification: AttentionClassification;
  rhythm: SessionRhythmPhase;
  signals: AttentionSignals;
  adaptive: AdaptiveProfile;
  sessionId: string;
  childId: number;
  updatedAt: number;
};

const IDLE_HEAVY_MS = 8_000;
const HESITATION_MS = 4_000;
const REPEAT_TAP_MS = 450;
const RAPID_SKIP_MS = 700;
const START_WINDOW_MS = 90_000;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function emptyCounters(): AttentionCounters {
  return {
    interactions: 0,
    idleMsTotal: 0,
    activeMsEstimate: 0,
    hesitations: 0,
    repeatTaps: 0,
    rapidSkips: 0,
    correct: 0,
    incorrect: 0,
    incorrectStreak: 0,
    maxIncorrectStreak: 0,
    replays: 0,
    hints: 0,
    objectOpens: 0,
    revisits: 0,
    navigations: 0,
    completions: 0,
    uniqueItems: [],
    scoreHistory: [],
  };
}

export function createAttentionSession(childId: number, at = Date.now()): AttentionSessionState {
  return {
    sessionId: `sw-att-${childId}-${at}`,
    childId,
    startedAt: at,
    lastActivityAt: at,
    lastItemId: null,
    lastTapAt: 0,
    lastTapKey: null,
    lastPromptAt: null,
    peakScore: 55,
    sawDropOff: false,
    recoveredAfterDrop: false,
    completed: false,
    counters: emptyCounters(),
  };
}

export function markAttentionPrompt(state: AttentionSessionState, at = Date.now()): AttentionSessionState {
  return { ...state, lastPromptAt: at };
}

export function reduceAttentionEvent(
  state: AttentionSessionState,
  event: AttentionEvent,
): AttentionSessionState {
  const c = { ...state.counters, uniqueItems: [...state.counters.uniqueItems] };
  let lastActivityAt = state.lastActivityAt;
  let lastItemId = state.lastItemId;
  let lastTapAt = state.lastTapAt;
  let lastTapKey = state.lastTapKey;
  let lastPromptAt = state.lastPromptAt;
  let completed = state.completed;

  const touch = () => {
    lastActivityAt = event.at;
    c.interactions += 1;
    if (state.lastActivityAt > 0) {
      const gap = event.at - state.lastActivityAt;
      if (gap > 0 && gap < 60_000) c.activeMsEstimate += Math.min(gap, 15_000);
    }
  };

  switch (event.type) {
    case "session_start":
      lastActivityAt = event.at;
      break;
    case "pointer_activity":
      touch();
      break;
    case "idle_sample":
      c.idleMsTotal += Math.max(0, event.idleMs ?? 0);
      break;
    case "hesitation":
      touch();
      c.hesitations += 1;
      break;
    case "repeat_tap":
      touch();
      c.repeatTaps += 1;
      break;
    case "rapid_skip":
      touch();
      c.rapidSkips += 1;
      break;
    case "answer_correct":
      touch();
      c.correct += 1;
      c.incorrectStreak = 0;
      break;
    case "answer_incorrect":
      touch();
      c.incorrect += 1;
      c.incorrectStreak += 1;
      c.maxIncorrectStreak = Math.max(c.maxIncorrectStreak, c.incorrectStreak);
      break;
    case "replay":
      touch();
      c.replays += 1;
      break;
    case "hint":
      touch();
      c.hints += 1;
      break;
    case "object_open": {
      touch();
      c.objectOpens += 1;
      const id = event.itemId;
      if (id) {
        if (c.uniqueItems.includes(id)) c.revisits += 1;
        else c.uniqueItems.push(id);
        if (lastItemId === id) c.revisits += 1;
        lastItemId = id;
      }
      break;
    }
    case "revisit":
      touch();
      c.revisits += 1;
      break;
    case "navigate":
      touch();
      c.navigations += 1;
      if (state.lastActivityAt > 0 && event.at - state.lastActivityAt < RAPID_SKIP_MS) {
        c.rapidSkips += 1;
      }
      break;
    case "task_complete":
      touch();
      c.completions += 1;
      completed = true;
      break;
    case "session_end":
      completed = true;
      break;
    default:
      break;
  }

  // Auto-detect hesitation when acting after a prompt with long gap.
  if (
    event.type !== "idle_sample" &&
    event.type !== "session_start" &&
    lastPromptAt != null &&
    event.at - lastPromptAt >= HESITATION_MS
  ) {
    c.hesitations += 1;
    lastPromptAt = null;
  } else if (event.type !== "idle_sample" && lastPromptAt != null) {
    lastPromptAt = null;
  }

  // Auto-detect repeat taps on same key.
  if (event.itemId && event.type !== "idle_sample") {
    const key = `${event.worldId ?? ""}:${event.itemId}:${event.type}`;
    if (lastTapKey === key && event.at - lastTapAt <= REPEAT_TAP_MS) {
      c.repeatTaps += 1;
    }
    lastTapKey = key;
    lastTapAt = event.at;
  }

  const next: AttentionSessionState = {
    ...state,
    lastActivityAt,
    lastItemId,
    lastTapAt,
    lastTapKey,
    lastPromptAt,
    completed,
    counters: c,
  };

  const signals = computeAttentionSignals(next, event.at);
  const score = computeAttentionScore(signals);
  next.counters.scoreHistory = [
    ...c.scoreHistory.slice(-40),
    { at: event.at, score },
  ];
  next.peakScore = Math.max(state.peakScore, score);

  if (state.peakScore - score >= 15 && score < state.peakScore) {
    next.sawDropOff = true;
  }
  if (state.sawDropOff && score >= state.peakScore - 8 && score > 55) {
    next.recoveredAfterDrop = true;
  }

  return next;
}

export function computeAttentionSignals(
  state: AttentionSessionState,
  now = Date.now(),
): AttentionSignals {
  const c = state.counters;
  const elapsed = Math.max(1, now - state.startedAt);
  const sessionMinutes = elapsed / 60_000;
  const interactions = Math.max(1, c.interactions);
  const answers = c.correct + c.incorrect;

  const trackedMs = c.idleMsTotal + c.activeMsEstimate;
  // Until we have samples, assume mild preschool baseline idle (avoids "perfect focus" at t=0).
  const idleRatio =
    trackedMs > 0
      ? clamp(c.idleMsTotal / trackedMs, 0, 1)
      : 0.35;

  return {
    idleRatio,
    hesitationRate: clamp(c.hesitations / interactions, 0, 1),
    repeatTapRate: clamp(c.repeatTaps / interactions, 0, 1),
    rapidSkipRate: clamp(c.rapidSkips / interactions, 0, 1),
    sessionMinutes,
    incorrectStreak: c.incorrectStreak,
    revisitRate: clamp(c.revisits / Math.max(1, c.objectOpens), 0, 1),
    objectInteractionRate: clamp(c.objectOpens / Math.max(1, sessionMinutes * 4), 0, 1.5),
    hintRate: clamp(c.hints / interactions, 0, 1),
    replayRate: clamp(c.replays / Math.max(1, c.objectOpens + c.replays), 0, 1),
    navigationPerMinute: c.navigations / Math.max(sessionMinutes, 0.25),
    completionRate: clamp(c.completions / Math.max(1, c.completions + c.rapidSkips * 0.25), 0, 1),
    accuracy: answers > 0 ? c.correct / answers : 0.5,
  };
}

/** Weighted rule score 0–100. Preschool-friendly baseline ~55. */
export function computeAttentionScore(signals: AttentionSignals): number {
  let score = 55;

  score += (1 - signals.idleRatio) * 18;
  score -= signals.idleRatio * 22;
  score -= signals.hesitationRate * 10;
  score -= signals.repeatTapRate * 8;
  score -= signals.rapidSkipRate * 16;
  score -= Math.min(signals.incorrectStreak, 5) * 4;
  score += signals.objectInteractionRate * 10;
  score += signals.revisitRate * 6;
  score += signals.replayRate * 5; // replaying sound = listening interest
  score -= signals.hintRate * 4;
  score -= Math.max(0, signals.navigationPerMinute - 3) * 3;
  score += signals.completionRate * 12;
  score += (signals.accuracy - 0.5) * 16;

  // Long sessions without completions drift toward fatigue.
  if (signals.sessionMinutes > 10) score -= (signals.sessionMinutes - 10) * 1.2;
  if (signals.sessionMinutes > 0.5 && signals.objectInteractionRate > 0.4) score += 4;

  return Math.round(clamp(score, 0, 100));
}

export function classifyAttention(
  score: number,
  signals: AttentionSignals,
): AttentionClassification {
  const fatigued =
    (signals.sessionMinutes >= 12 && score < 60) ||
    (signals.sessionMinutes >= 8 && signals.incorrectStreak >= 3 && signals.idleRatio > 0.35) ||
    (signals.sessionMinutes >= 15 && signals.rapidSkipRate > 0.25);

  if (fatigued) return "fatigued";

  if (
    score >= 80 &&
    signals.incorrectStreak < 2 &&
    signals.idleRatio < 0.25 &&
    signals.rapidSkipRate < 0.15
  ) {
    return "highly_focused";
  }
  if (score >= 65) return "focused";
  if (score < 45 || (signals.rapidSkipRate > 0.3 && signals.idleRatio > 0.3)) {
    return "distracted";
  }
  return "neutral";
}

export function detectSessionRhythm(
  state: AttentionSessionState,
  score: number,
  now = Date.now(),
): SessionRhythmPhase {
  if (state.completed) return "completion";
  const elapsed = now - state.startedAt;
  if (elapsed < START_WINDOW_MS) return "start_energy";
  if (state.sawDropOff && state.recoveredAfterDrop) return "recovery";
  if (state.sawDropOff && score < state.peakScore - 10) return "drop_off";
  if (score >= 70 || score >= state.peakScore - 3) return "peak_engagement";
  if (state.sawDropOff) return "drop_off";
  return "start_energy";
}

export function buildAdaptiveProfile(
  classification: AttentionClassification,
  rhythm: SessionRhythmPhase,
): AdaptiveProfile {
  const base: AdaptiveProfile = {
    visualComplexity: "full",
    narrationLength: "full",
    taskDifficulty: "standard",
    encouragement: false,
    suggestBreak: false,
    suggestRelaxWorld: false,
    offerBonusTask: false,
    offerExploration: false,
    animationIntensity: "full",
    quizOptionCount: 3,
    coachMessage: null,
    coachTone: "neutral",
  };

  switch (classification) {
    case "distracted":
      return {
        ...base,
        visualComplexity: "reduced",
        narrationLength: "short",
        taskDifficulty: "easier",
        encouragement: true,
        animationIntensity: "reduced",
        quizOptionCount: 2,
        coachMessage: "Let's try one short sound together — you've got this!",
        coachTone: "encourage",
      };
    case "fatigued":
      return {
        ...base,
        visualComplexity: "minimal",
        narrationLength: "short",
        taskDifficulty: "easier",
        encouragement: true,
        suggestBreak: true,
        suggestRelaxWorld: true,
        animationIntensity: "minimal",
        quizOptionCount: 2,
        coachMessage: "Nice listening! Soft Nature sounds could help you rest.",
        coachTone: "rest",
      };
    case "highly_focused":
      return {
        ...base,
        taskDifficulty: "harder",
        offerBonusTask: true,
        offerExploration: true,
        quizOptionCount: 4,
        coachMessage: "Amazing focus — want a bonus challenge?",
        coachTone: "challenge",
      };
    case "focused":
      return {
        ...base,
        offerExploration: rhythm === "peak_engagement",
        quizOptionCount: 3,
        coachMessage: rhythm === "peak_engagement" ? "You're on a roll — explore a new sound?" : null,
        coachTone: "challenge",
      };
    case "neutral":
    default:
      if (rhythm === "drop_off") {
        return {
          ...base,
          encouragement: true,
          visualComplexity: "reduced",
          animationIntensity: "reduced",
          coachMessage: "One more fun sound — ready when you are.",
          coachTone: "encourage",
        };
      }
      return base;
  }
}

export function buildAttentionSnapshot(
  state: AttentionSessionState,
  now = Date.now(),
): AttentionSnapshot {
  const signals = computeAttentionSignals(state, now);
  const score = computeAttentionScore(signals);
  const classification = classifyAttention(score, signals);
  const rhythm = detectSessionRhythm(state, score, now);
  return {
    score,
    classification,
    rhythm,
    signals,
    adaptive: buildAdaptiveProfile(classification, rhythm),
    sessionId: state.sessionId,
    childId: state.childId,
    updatedAt: now,
  };
}

/** Map classification to parent-friendly labels. */
export const ATTENTION_LABELS: Record<AttentionClassification, string> = {
  highly_focused: "Highly Focused",
  focused: "Focused",
  neutral: "Neutral",
  distracted: "Distracted",
  fatigued: "Fatigued",
};

export const RHYTHM_LABELS: Record<SessionRhythmPhase, string> = {
  start_energy: "Start energy",
  peak_engagement: "Peak engagement",
  drop_off: "Drop-off",
  recovery: "Recovery",
  completion: "Completion",
};

export { IDLE_HEAVY_MS, HESITATION_MS, REPEAT_TAP_MS, RAPID_SKIP_MS };

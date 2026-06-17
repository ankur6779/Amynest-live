import type {
  PersistedSessionState,
  SpeechCoachV2EvaluationScores,
  SpeechCoachV2Phase,
  SpeechCoachV2SessionState,
} from "./types";
import {
  MASTERY_MIN_ATTEMPTS_PER_PHASE,
  MASTERY_SUCCESS_SCORE_THRESHOLD,
  SPEECH_COACH_V2_PHASES,
} from "./types";
import { buildSessionExercises } from "./curriculum";
import { currentExercise } from "./session-phases";

export function createInitialSessionState(input: {
  sessionId: string;
  childId: number;
  childName: string;
  ageBand: PersistedSessionState["ageBand"];
  sessionSeed?: number;
}): PersistedSessionState {
  const now = Date.now();
  const seed = input.sessionSeed ?? now % 10_000;
  return {
    sessionId: input.sessionId,
    childId: input.childId,
    childName: input.childName,
    ageBand: input.ageBand,
    phase: "warm_up",
    phaseStartedAt: now,
    sessionStartedAt: now,
    exerciseIndex: 0,
    exercises: buildSessionExercises(input.ageBand, seed),
    phaseAttempts: 0,
    phaseSuccesses: 0,
    starsEarned: 0,
    pointsEarned: 0,
    wordsSpoken: 0,
    sentencesCompleted: 0,
    turnCount: 0,
  };
}

export function toFullSessionState(
  persisted: PersistedSessionState,
  extras?: Partial<SpeechCoachV2SessionState>,
): SpeechCoachV2SessionState {
  return {
    ...persisted,
    streakDays: extras?.streakDays ?? 0,
    badgesEarned: extras?.badgesEarned ?? [],
    scores: extras?.scores ?? [],
    secondsUsed: extras?.secondsUsed ?? 0,
  };
}

export function recordTurnResult(
  state: PersistedSessionState,
  evaluation: SpeechCoachV2EvaluationScores,
  wordsSpoken: number,
  sentencesCompleted: number,
  stars: number,
  points: number,
): PersistedSessionState {
  const success = evaluation.overallScore >= MASTERY_SUCCESS_SCORE_THRESHOLD
    && evaluation.scoringConfidence !== "LOW";

  return {
    ...state,
    phaseAttempts: state.phaseAttempts + 1,
    phaseSuccesses: state.phaseSuccesses + (success ? 1 : 0),
    exerciseIndex: success
      ? Math.min(state.exerciseIndex + 1, state.exercises.length)
      : state.exerciseIndex,
    starsEarned: state.starsEarned + stars,
    pointsEarned: state.pointsEarned + points,
    wordsSpoken: state.wordsSpoken + wordsSpoken,
    sentencesCompleted: state.sentencesCompleted + sentencesCompleted,
    turnCount: state.turnCount + 1,
  };
}

export function shouldAdvancePhaseMastery(state: PersistedSessionState): boolean {
  if (state.phase === "celebration") return false;
  return (
    state.phaseSuccesses >= 1
    || state.phaseAttempts >= MASTERY_MIN_ATTEMPTS_PER_PHASE
  );
}

export function advancePhaseMastery(
  state: PersistedSessionState,
  now = Date.now(),
): PersistedSessionState {
  const idx = SPEECH_COACH_V2_PHASES.indexOf(state.phase);
  const next = idx >= 0 && idx < SPEECH_COACH_V2_PHASES.length - 1
    ? SPEECH_COACH_V2_PHASES[idx + 1]!
    : state.phase;

  return {
    ...state,
    phase: next as SpeechCoachV2Phase,
    phaseStartedAt: now,
    phaseAttempts: 0,
    phaseSuccesses: 0,
  };
}

export function getCurrentExercise(state: PersistedSessionState) {
  return currentExercise(toFullSessionState(state));
}

export function isSessionCompleteMastery(
  state: PersistedSessionState,
  sessionElapsedSeconds: number,
  maxSeconds: number,
): boolean {
  if (state.phase === "celebration") return true;
  if (sessionElapsedSeconds >= maxSeconds) return true;
  return state.exerciseIndex >= state.exercises.length && state.phase === "confidence_challenge";
}

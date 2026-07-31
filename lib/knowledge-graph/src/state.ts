import {
  CONFIDENCE,
  FORGOTTEN_IDLE_DAYS,
  MASTERY_MIN_SUCCESSFUL_REVIEWS,
  MODALITY_DELTA,
  REVIEW_HISTORY_CAP,
  clampConfidence,
  daysBetween,
} from "./ontology.js";
import type {
  LearningModality,
  LearningObservation,
  LearningSource,
  NodeLearningState,
  ReviewEvent,
  ReviewOutcome,
} from "./types.js";

export function createDefaultLearningState(): NodeLearningState {
  return {
    seen: false,
    heard: false,
    recognized: false,
    spoken: false,
    mastered: false,
    forgotten: false,
    confidence: 0,
    lastReviewAt: null,
    reviewHistory: [],
    counts: {
      seen: 0,
      heard: 0,
      recognized: 0,
      spoken: 0,
      failed: 0,
    },
  };
}

function outcomeFor(modality: LearningModality, score?: number): ReviewOutcome {
  if (modality === "failed") return "fail";
  if (typeof score === "number" && score < 60) return "partial";
  if (modality === "seen" || modality === "heard") return "partial";
  return "success";
}

function pushHistory(
  history: ReviewEvent[],
  event: ReviewEvent,
): ReviewEvent[] {
  return [event, ...history].slice(0, REVIEW_HISTORY_CAP);
}

/**
 * Incremental state update from a single observation.
 * Pure — does not mutate the previous state object.
 */
export function applyObservationToState(
  prev: NodeLearningState | undefined,
  observation: LearningObservation,
  nowIso = observation.at ?? new Date().toISOString(),
): NodeLearningState {
  const state = prev ? { ...prev, counts: { ...prev.counts }, reviewHistory: [...prev.reviewHistory] } : createDefaultLearningState();
  const modality = observation.modality;
  const source: LearningSource = observation.source;
  const score = observation.score;

  state.counts[modality] = (state.counts[modality] ?? 0) + 1;

  if (modality === "seen") state.seen = true;
  if (modality === "heard") {
    state.seen = true;
    state.heard = true;
  }
  if (modality === "recognized") {
    state.seen = true;
    state.heard = true;
    state.recognized = true;
  }
  if (modality === "spoken") {
    state.seen = true;
    state.spoken = true;
  }

  const delta = MODALITY_DELTA[modality];
  let confidence = state.confidence + delta;
  if (typeof score === "number" && Number.isFinite(score)) {
    // Blend toward reported score when present (speech / graded quiz).
    confidence = confidence * 0.7 + score * 0.3;
  }
  state.confidence = clampConfidence(confidence);

  const outcome = outcomeFor(modality, score);
  state.reviewHistory = pushHistory(state.reviewHistory, {
    at: nowIso,
    modality,
    source,
    outcome,
    score,
  });
  state.lastReviewAt = nowIso;
  state.forgotten = false;

  const successful = state.reviewHistory.filter((r) => r.outcome === "success").length;
  state.mastered =
    state.confidence >= CONFIDENCE.mastered &&
    successful >= MASTERY_MIN_SUCCESSFUL_REVIEWS &&
    (state.recognized || state.spoken);

  return state;
}

/** Mark forgotten for nodes idle past threshold with prior practice. */
export function refreshForgottenFlag(
  state: NodeLearningState,
  nowIso = new Date().toISOString(),
): NodeLearningState {
  if (!state.lastReviewAt) return state;
  const touched =
    state.counts.heard +
      state.counts.recognized +
      state.counts.spoken +
      state.counts.failed >
    0;
  if (!touched) return state;
  if (state.mastered && state.confidence >= CONFIDENCE.mastered) {
    const idle = daysBetween(state.lastReviewAt, nowIso);
    if (idle < FORGOTTEN_IDLE_DAYS * 1.5) {
      return state.forgotten ? { ...state, forgotten: false } : state;
    }
  }
  const idle = daysBetween(state.lastReviewAt, nowIso);
  if (idle >= FORGOTTEN_IDLE_DAYS && state.confidence < CONFIDENCE.mastered) {
    return {
      ...state,
      forgotten: true,
      mastered: false,
      confidence: clampConfidence(
        Math.min(state.confidence, CONFIDENCE.forgottenFloor),
      ),
    };
  }
  return state;
}

export function isStruggling(state: NodeLearningState): boolean {
  if (state.counts.failed >= 2 && state.confidence < CONFIDENCE.struggling) {
    return true;
  }
  if (
    state.counts.recognized + state.counts.spoken > 0 &&
    state.confidence < CONFIDENCE.struggling
  ) {
    return true;
  }
  return false;
}

export function isKnown(state: NodeLearningState): boolean {
  return (
    state.mastered ||
    state.confidence >= CONFIDENCE.recognized ||
    (state.recognized && state.confidence >= CONFIDENCE.struggling)
  );
}

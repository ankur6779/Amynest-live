/**
 * Thin fan-out for LearningDecision (mirrors learning-reward-bus).
 * Modules subscribe here — they must not compute decisions themselves.
 */

import type { LearningDecision } from "@workspace/learning-runtime";

type Listener = (decision: LearningDecision) => void;

const listeners = new Set<Listener>();

export function publishLearningDecision(decision: LearningDecision): void {
  for (const l of listeners) {
    try {
      l(decision);
    } catch {
      /* isolate subscribers */
    }
  }
}

export function subscribeLearningDecision(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearLearningDecisionBus(): void {
  listeners.clear();
}

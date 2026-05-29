import type { IntentState } from "./types.js";

const VALID_TRANSITIONS: Record<IntentState, readonly IntentState[]> = {
  pending: ["started", "in_progress", "abandoned", "expired"],
  started: ["in_progress", "completed", "abandoned", "pending", "expired"],
  in_progress: ["completed", "abandoned", "pending", "expired"],
  completed: [],
  abandoned: [],
  expired: [],
};

export function canTransitionIntent(from: IntentState, to: IntentState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertIntentTransition(from: IntentState, to: IntentState): void {
  if (!canTransitionIntent(from, to)) {
    throw new Error(`Invalid intent transition: ${from} → ${to}`);
  }
}

/** Interruption moves active work back to pending for resume. */
export function transitionOnInterruption(current: IntentState): IntentState {
  if (current === "in_progress" || current === "started") return "pending";
  return current;
}

export function isResumableState(state: IntentState): boolean {
  return state === "pending" || state === "started" || state === "in_progress";
}

export function isTerminalState(state: IntentState): boolean {
  return state === "completed" || state === "abandoned" || state === "expired";
}

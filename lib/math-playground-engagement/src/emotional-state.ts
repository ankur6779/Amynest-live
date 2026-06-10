import type { PlaygroundEngagementState } from "@workspace/math-playground";
import type { EngagementStateUpdate } from "./types";

export function defaultEngagementState(now = Date.now()): PlaygroundEngagementState {
  return {
    consecutiveSuccesses: 0,
    consecutiveFailures: 0,
    lastInteractionAt: now,
    sessionStartedAt: now,
  };
}

export function recordEngagementOutcome(
  state: PlaygroundEngagementState,
  outcome: "success" | "failure" | "interaction",
  now = Date.now(),
): PlaygroundEngagementState {
  if (outcome === "interaction") {
    return { ...state, lastInteractionAt: now };
  }

  if (outcome === "success") {
    return {
      ...state,
      consecutiveSuccesses: state.consecutiveSuccesses + 1,
      consecutiveFailures: 0,
      lastInteractionAt: now,
    };
  }

  return {
    ...state,
    consecutiveSuccesses: 0,
    consecutiveFailures: state.consecutiveFailures + 1,
    lastInteractionAt: now,
  };
}

export function computeIdleMs(state: PlaygroundEngagementState, now = Date.now()): number {
  return Math.max(0, now - state.lastInteractionAt);
}

export function toEngagementUpdate(state: PlaygroundEngagementState): EngagementStateUpdate {
  return {
    consecutiveSuccesses: state.consecutiveSuccesses,
    consecutiveFailures: state.consecutiveFailures,
    lastInteractionAt: state.lastInteractionAt,
  };
}

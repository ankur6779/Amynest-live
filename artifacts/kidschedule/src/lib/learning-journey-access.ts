export type LearningJourneyAccessState =
  | { kind: "loading" }
  | { kind: "retry" }
  | { kind: "allowed" }
  | { kind: "blocked" };

/**
 * Fail-closed learning journey gate.
 * Free users without journey access must never pass through on timeout.
 */
export function resolveLearningJourneyAccess(input: {
  isPremium: boolean;
  gateLoading: boolean;
  gateTimedOut: boolean;
  hasError: boolean;
  journeyLocked: boolean;
  accessLoaded: boolean;
}): LearningJourneyAccessState {
  if (input.isPremium) return { kind: "allowed" };

  if (input.hasError) return { kind: "retry" };

  if (input.gateLoading && !input.gateTimedOut) return { kind: "loading" };

  if (!input.accessLoaded) return { kind: "retry" };

  if (input.journeyLocked) return { kind: "blocked" };

  return { kind: "allowed" };
}

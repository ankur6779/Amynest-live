/**
 * Explicit Front Door state machine (Sprint 1 review · P0).
 * Enables future BACK / RESUME / RESTORE without ad-hoc step strings.
 */

export const FrontDoorState = {
  BREATH: "BREATH",
  AGE: "AGE",
  NAME: "NAME",
  WORRY: "WORRY",
  COMPLETE: "COMPLETE",
} as const;

/** Discriminated Front Door machine state (value mirror: FrontDoorState.*). */
export type FrontDoorStateId =
  (typeof FrontDoorState)[keyof typeof FrontDoorState];

export const FRONT_DOOR_STATE_ORDER: readonly FrontDoorStateId[] = [
  FrontDoorState.BREATH,
  FrontDoorState.AGE,
  FrontDoorState.NAME,
  FrontDoorState.WORRY,
  FrontDoorState.COMPLETE,
] as const;

export type FrontDoorEvent =
  | "CONTINUE"
  | "SELECT_AGE"
  | "SUBMIT_NAME"
  | "SKIP_NAME"
  | "SELECT_WORRY"
  | "BACK"
  | "RESUME";

/** Legal forward edges — event must match the current state. */
const FORWARD_BY_EVENT: Partial<
  Record<FrontDoorStateId, Partial<Record<FrontDoorEvent, FrontDoorStateId>>>
> = {
  BREATH: { CONTINUE: FrontDoorState.AGE },
  AGE: { SELECT_AGE: FrontDoorState.NAME },
  NAME: {
    SUBMIT_NAME: FrontDoorState.WORRY,
    SKIP_NAME: FrontDoorState.WORRY,
  },
  WORRY: { SELECT_WORRY: FrontDoorState.COMPLETE },
};

export function isFrontDoorState(value: unknown): value is FrontDoorStateId {
  return (
    typeof value === "string" &&
    (FRONT_DOOR_STATE_ORDER as readonly string[]).includes(value)
  );
}

export function frontDoorStateIndex(state: FrontDoorStateId): number {
  return FRONT_DOOR_STATE_ORDER.indexOf(state);
}

/** Pure transition — invalid events leave state unchanged. */
export function transitionFrontDoor(
  state: FrontDoorStateId,
  event: FrontDoorEvent,
): FrontDoorStateId {
  if (event === "BACK") {
    const i = frontDoorStateIndex(state);
    if (i <= 0) return FrontDoorState.BREATH;
    return FRONT_DOOR_STATE_ORDER[i - 1]!;
  }

  if (event === "RESUME") {
    return state;
  }

  if (state === FrontDoorState.COMPLETE) {
    return FrontDoorState.COMPLETE;
  }

  const next = FORWARD_BY_EVENT[state]?.[event];
  return next ?? state;
}

/**
 * Restore UI state from persisted session fields.
 * Prefer explicit `state`; fall back to data completeness.
 */
export function resumeFrontDoorState(input: {
  state?: FrontDoorStateId | null;
  ageBand?: string | null;
  worry?: string | null;
}): FrontDoorStateId {
  if (input.state && isFrontDoorState(input.state)) {
    return input.state;
  }
  if (input.worry) return FrontDoorState.COMPLETE;
  if (input.ageBand) return FrontDoorState.NAME;
  return FrontDoorState.BREATH;
}

/**
 * Formation state machine (Pack 3 Part 1) — pure transitions; timers owned by orchestrator host.
 */

import {
  FORMATION_CONVERGE_SETTLE_MS,
  FORMATION_HARD_TIMEOUT_MS,
  FORMATION_MIN_CEREMONY_MS,
  FORMATION_SOFT_WAIT_MS,
  FORMATION_STAGES,
  type FormationStageId,
} from "../../constants/formation";

export type FormationMachineState =
  | "idle"
  | "entering"
  | "forming"
  | "soft_wait"
  | "converging"
  | "ready"
  | "failed"
  | "cancelled";

export type FormationErrorCode =
  | "formation_timeout"
  | "snapshot_failed"
  | "compute_failed"
  | "offline_interrupted"
  | "profile_missing"
  | "unknown";

export type FormationMachineSnapshot = {
  state: FormationMachineState;
  stage: FormationStageId | null;
  errorCode: FormationErrorCode | null;
  snapshotReady: boolean;
  elapsedMs: number;
  visualElapsedMs: number;
  enteredAt: number | null;
  convergingSince: number | null;
};

export function createFormationMachine(): FormationMachineSnapshot {
  return {
    state: "idle",
    stage: null,
    errorCode: null,
    snapshotReady: false,
    elapsedMs: 0,
    visualElapsedMs: 0,
    enteredAt: null,
    convergingSince: null,
  };
}

export function stageForVisualElapsed(visualElapsedMs: number): FormationStageId {
  for (let i = FORMATION_STAGES.length - 1; i >= 0; i--) {
    const s = FORMATION_STAGES[i]!;
    if (visualElapsedMs >= s.startMs) return s.id;
  }
  return "dark_sky_init";
}

export function isBackDisabled(state: FormationMachineState): boolean {
  return state === "forming" || state === "soft_wait" || state === "converging" || state === "entering";
}

type TickInput = {
  now: number;
  snapshotReady: boolean;
  fatalError?: FormationErrorCode | null;
  offlineInterrupted?: boolean;
  /** When true, visual clocks pause (background) — Pack 3. */
  visualsPaused?: boolean;
  reducedMotion?: boolean;
};

/**
 * Advance machine by wall clock. Host must call on real timers (no fake production shortcuts).
 */
export function tickFormationMachine(
  prev: FormationMachineSnapshot,
  input: TickInput,
): FormationMachineSnapshot {
  if (prev.state === "ready" || prev.state === "cancelled") return prev;

  let next: FormationMachineSnapshot = { ...prev };

  if (next.state === "idle") {
    next = {
      ...next,
      state: "entering",
      enteredAt: input.now,
      elapsedMs: 0,
      visualElapsedMs: 0,
      stage: "dark_sky_init",
      errorCode: null,
    };
  }

  if (next.enteredAt == null) {
    next.enteredAt = input.now;
  }

  const elapsedMs = input.now - next.enteredAt;
  next.elapsedMs = elapsedMs;
  next.snapshotReady = input.snapshotReady;

  if (!input.visualsPaused) {
    // Visual elapsed tracks ceremony beats; on resume continues from previous visualElapsed.
    // Host passes increasing now; we derive visual from last tick delta externally —
    // here approximate visualElapsed = elapsed when not paused (host freezes enteredAt offset).
    next.visualElapsedMs = Math.max(next.visualElapsedMs, elapsedMs);
  }

  if (input.fatalError) {
    return {
      ...next,
      state: "failed",
      errorCode: input.fatalError,
      stage: next.stage,
    };
  }

  if (input.offlineInterrupted) {
    return {
      ...next,
      state: "failed",
      errorCode: "offline_interrupted",
    };
  }

  if (elapsedMs >= FORMATION_HARD_TIMEOUT_MS && !input.snapshotReady) {
    return {
      ...next,
      state: "failed",
      errorCode: "formation_timeout",
    };
  }

  if (next.state === "entering") {
    next = { ...next, state: "forming", stage: stageForVisualElapsed(next.visualElapsedMs) };
  }

  const minCeremony = input.reducedMotion ? 1200 : FORMATION_MIN_CEREMONY_MS;

  if (next.state === "forming" || next.state === "soft_wait") {
    next.stage = stageForVisualElapsed(Math.min(next.visualElapsedMs, FORMATION_MIN_CEREMONY_MS));

    if (!input.snapshotReady && elapsedMs >= FORMATION_SOFT_WAIT_MS) {
      next = { ...next, state: "soft_wait" };
    } else if (input.snapshotReady && elapsedMs >= minCeremony) {
      next = {
        ...next,
        state: "converging",
        convergingSince: input.now,
        stage: "final_convergence",
      };
    } else if (input.snapshotReady && elapsedMs < minCeremony) {
      next = { ...next, state: "forming" };
    }
  }

  if (next.state === "converging") {
    const since = next.convergingSince ?? input.now;
    if (input.now - since >= FORMATION_CONVERGE_SETTLE_MS) {
      return { ...next, state: "ready", stage: "final_convergence", errorCode: null };
    }
  }

  return next;
}

export function resetFormationForRetry(): FormationMachineSnapshot {
  return createFormationMachine();
}

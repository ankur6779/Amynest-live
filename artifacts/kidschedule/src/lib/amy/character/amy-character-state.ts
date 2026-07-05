import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";
import type { AmyStageState } from "@/lib/amy/amy-stage-state";

/**
 * Full internal character state enum — reusable across Speech Coach and future screens.
 * Speech Coach continues passing legacy {@link AmyStageState} / {@link Amy3DState};
 * those map here without breaking API changes.
 */
export type AmyCharacterState =
  | "idle"
  | "listening"
  | "thinking"
  | "talking"
  | "happy"
  | "celebrating"
  | "waiting"
  | "sleeping"
  | "error";

export function amy3dToCharacterState(
  state: Amy3DState,
  opts?: { speaking?: boolean },
): AmyCharacterState {
  if (opts?.speaking || state === "speaking") return "talking";
  if (state === "celebrating") return "celebrating";
  if (state === "listening") return "listening";
  if (state === "thinking") return "thinking";
  if (state === "encouraging") return "happy";
  return "idle";
}

export function stageToCharacterState(stage: AmyStageState): AmyCharacterState {
  switch (stage) {
    case "talking":
      return "talking";
    case "listening":
      return "listening";
    case "thinking":
      return "thinking";
    case "celebrating":
      return "celebrating";
    default:
      return "idle";
  }
}

/** Static pose asset key for non-talking renders. */
export function characterStateToAssetKey(
  state: AmyCharacterState,
): "idle" | "listening" | "thinking" | "happy" {
  switch (state) {
    case "listening":
      return "listening";
    case "thinking":
    case "waiting":
    case "sleeping":
      return "thinking";
    case "celebrating":
    case "happy":
      return "happy";
    case "error":
      return "idle";
    default:
      return "idle";
  }
}

export function isTalkingState(state: AmyCharacterState): boolean {
  return state === "talking";
}

export function isListeningState(state: AmyCharacterState): boolean {
  return state === "listening";
}

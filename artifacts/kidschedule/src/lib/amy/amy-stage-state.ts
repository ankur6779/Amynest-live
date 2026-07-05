import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";

/** Legacy Speech Coach stage states (backward compatible). */
export type AmyStageState =
  | "idle"
  | "listening"
  | "thinking"
  | "talking"
  | "celebrating";

export type { AmyCharacterState } from "@/lib/amy/character/amy-character-state";
export {
  amy3dToCharacterState,
  characterStateToAssetKey,
  stageToCharacterState,
} from "@/lib/amy/character/amy-character-state";

export function amy3dToStageState(
  state: Amy3DState,
  opts?: { speaking?: boolean },
): AmyStageState {
  if (opts?.speaking || state === "speaking") return "talking";
  if (state === "celebrating") return "celebrating";
  if (state === "listening") return "listening";
  if (state === "thinking") return "thinking";
  return "idle";
}

/** Static pose image for non-talking states. */
export function stageStateToAssetKey(
  state: AmyStageState,
): "idle" | "listening" | "thinking" | "happy" {
  switch (state) {
    case "listening":
      return "listening";
    case "thinking":
      return "thinking";
    case "celebrating":
      return "happy";
    default:
      return "idle";
  }
}

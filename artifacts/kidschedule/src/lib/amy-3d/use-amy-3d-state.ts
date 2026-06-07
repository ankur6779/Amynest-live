// Amy 3D avatar state model.
//
// This is pure UI-presentation state — it sits ABOVE the Speech Coach engine
// (see .cursor/rules/speech-coach-engine-freeze.mdc). It only derives a visual
// "mood" for the 3D head from state that the engine already exposes
// (voice.speaking / stt.listening / CoachState). It never touches audio, mic,
// AudioContext, or playback ownership.

/** Visual states the 3D Amy head can render. */
export type Amy3DState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "celebrating"
  | "encouraging";

/** True when the head should animate its mouth (lip-flap). */
export function isMouthMoving(state: Amy3DState): boolean {
  return state === "speaking";
}

/**
 * CoachState (live-speech-coach.tsx) → 3D state.
 * Kept as a string-union map so callers do not need to import the page type.
 */
export function coachStateToAmy3D(
  coachState:
    | "idle"
    | "ai_speaking"
    | "listening"
    | "processing"
    | "feedback"
    | "next_task"
    | "complete",
  success?: boolean,
): Amy3DState {
  if (coachState === "complete") return "celebrating";
  if (coachState === "ai_speaking" || coachState === "feedback" || coachState === "next_task") {
    return success === false ? "encouraging" : "speaking";
  }
  if (coachState === "listening") return "listening";
  if (coachState === "processing") return "thinking";
  return "idle";
}

/**
 * Pronunciation-companion style derivation. Mirrors the existing `deriveAmyState`
 * logic in pronunciation-companion.tsx so the 3D head and the 2D ring agree.
 */
export function deriveAmy3DState(input: {
  voiceBusy: boolean;
  listening: boolean;
  transcribing: boolean;
  /** "great" | "close" | "try_again" | undefined */
  feedback?: string;
  /** Session finished → celebrate. */
  done?: boolean;
  /** Result phase reached (drives celebrate vs encourage). */
  result?: boolean;
}): Amy3DState {
  const { voiceBusy, listening, transcribing, feedback, done, result } = input;
  if (done) return "celebrating";
  if (voiceBusy) return "speaking";
  if (listening) return "listening";
  if (transcribing) return "thinking";
  if (result) return feedback === "great" ? "celebrating" : "encouraging";
  return "idle";
}

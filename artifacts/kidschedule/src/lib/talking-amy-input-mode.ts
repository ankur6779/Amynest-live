/**
 * Talking Amy mic input style — hold (legacy default) or tap-to-talk.
 */

const INPUT_MODE_KEY = "talking_amy_input_mode_v1";

export type TalkingAmyInputMode = "hold" | "tap";

export function loadTalkingAmyInputMode(): TalkingAmyInputMode {
  if (typeof window === "undefined") return "hold";
  const raw = window.localStorage.getItem(INPUT_MODE_KEY);
  return raw === "tap" ? "tap" : "hold";
}

export function saveTalkingAmyInputMode(mode: TalkingAmyInputMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INPUT_MODE_KEY, mode);
}

import type { MathTrick } from "./types.js";

/** Narration for Hear Trick — child name prefix + canonical trick audio. */
export function buildTrickSpeakText(trick: MathTrick, childName?: string): string {
  const name = (childName ?? "").trim();
  const intro = name ? `Hi ${name}! ` : "";
  return `${intro}${trick.audioText}`.trim();
}

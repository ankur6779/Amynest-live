import { MATH_TRICKS } from "./tricks.js";
import { buildTrickSpeakText } from "./speak.js";

export type {
  MathTrick,
  MathTrickAge,
  MathTrickPracticeQ,
  MathTrickVisual,
} from "./types.js";
export type { MathTrickMeta } from "./meta.js";
export { MATH_TRICKS } from "./tricks.js";
export { getMathTrickMeta, MATH_TRICK_META } from "./meta.js";
export { buildTrickSpeakText } from "./speak.js";
export {
  pickTricksSpaced,
  trickPracticePriority,
  type TrickMastery,
} from "./spaced-rep.js";

/** All trick narration lines for static-audio pre-generation. */
export function getMathTrickAudioTextsForStaticCatalog(): string[] {
  const lines = new Set<string>();
  for (const trick of MATH_TRICKS) {
    const text = trick.audioText.trim();
    if (text) lines.add(text);
    lines.add(buildTrickSpeakText(trick, "friend"));
  }
  lines.add("Correct! Well done!");
  return [...lines];
}

import { MATH_TRICKS } from "./tricks.js";
import { MATH_TRICK_META } from "./meta.js";
import { buildTrickSpeakText } from "./speak.js";
import { buildVisualSequence, specIsRenderable } from "./visual-engine.js";

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
export {
  buildVisualSequence,
  deriveSnapshots,
  specObjectCount,
  specIsRenderable,
  MAX_SCENE_OBJECTS,
  type VisualObjectKind,
  type VisualMathAction,
  type ContainerRole,
  type VisualStep,
  type VisualMathSequence,
  type VisualSequenceSpec,
  type SceneObject,
  type SceneContainer,
  type SceneSnapshot,
  type MathStrategy,
  type InsightKind,
  type SequenceMeta,
  type EquationPart,
  type StepEmphasis,
} from "./visual-engine.js";
export {
  createLearningSignals,
  applyLearningSignal,
  deriveAdaptationProfile,
  type ChildLearningSignals,
  type LearningSignalEvent,
  type AdaptationProfile,
} from "./adaptive.js";
export {
  buildParentInsights,
  type LearningSessionEvent,
  type ParentInsight,
} from "./insights.js";

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

/**
 * Per-step narration spoken by the AnimatedMathScene for every trick that has a
 * renderable visual sequence. Kept separate from the core catalog above so it
 * lives in the *extended* static-audio corpus: the generator pre-bakes these
 * MP3s, but a missing entry only warns (runtime falls back to on-demand TTS)
 * rather than failing the build.
 */
export function getMathTrickVisualNarrationTexts(): string[] {
  const lines = new Set<string>();
  const push = (s?: string) => {
    const t = s?.trim();
    if (t) lines.add(t);
  };
  for (const trick of MATH_TRICKS) {
    const spec = MATH_TRICK_META[trick.id]?.visualSequence;
    if (!spec || !specIsRenderable(spec)) continue;
    const seq = buildVisualSequence(spec);
    for (const step of seq.steps) {
      push(step.narration);
      // Thinking-Replay mode (Phase 6) speaks the explanatory variant.
      push(step.thinkingNarration);
    }
  }
  return [...lines];
}

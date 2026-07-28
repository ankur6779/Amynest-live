/**
 * Per-scene emotion map — target emotion, intensity, face, audience feeling.
 */

import type { SceneEmotion } from "../types/storyboard.js";
import type { ComposerSceneIntent } from "../scene-composer/types.js";
import type {
  DirectorBeatRole,
  SceneEmotionBeat,
  TargetEmotionLabel,
} from "./types.js";

interface EmotionRecipe {
  targetEmotion: TargetEmotionLabel;
  intensity: number;
  facialExpression: string;
  bodyLanguage: string;
  eyeDirection: string;
  audienceFeeling: string;
  composerEmotion: SceneEmotion;
}

const ROLE_EMOTION: Record<DirectorBeatRole, EmotionRecipe> = {
  hook: {
    targetEmotion: "Parent frustration",
    intensity: 7,
    facialExpression: "Tight soft brow, held breath, not angry caricature",
    bodyLanguage: "Shoulders slightly forward; hands pause mid-task",
    eyeDirection: "Down to the struggle, then briefly toward camera",
    audienceFeeling: "Seen — this is my morning too",
    composerEmotion: "curious",
  },
  problem: {
    targetEmotion: "Child hesitation",
    intensity: 6,
    facialExpression: "Small uncertain mouth; eyes searching for safety",
    bodyLanguage: "Fidgets; weight shifts; pencil taps or pauses",
    eyeDirection: "Toward parent, then away — seeking reassurance",
    audienceFeeling: "Protective empathy for the child",
    composerEmotion: "warm",
  },
  emotion: {
    targetEmotion: "Hope",
    intensity: 7,
    facialExpression: "Softening eyes; the first gentle almost-smile",
    bodyLanguage: "Chest opens slightly; tension leaves the jaw",
    eyeDirection: "Shared eye-line between parent and child",
    audienceFeeling: "Maybe tomorrow can feel lighter",
    composerEmotion: "hopeful",
  },
  feature: {
    targetEmotion: "Curiosity",
    intensity: 6,
    facialExpression: "Bright interested eyes; Amy AI gentle smile",
    bodyLanguage: "Lean-in toward the guide / UI as a story prop",
    eyeDirection: "Toward Amy AI or the helpful screen moment",
    audienceFeeling: "Curious what this guide will unlock",
    composerEmotion: "curious",
  },
  transformation: {
    targetEmotion: "Confidence",
    intensity: 8,
    facialExpression: "Clear proud smile; relaxed brows",
    bodyLanguage: "Upright, side-by-side; small celebratory micro-gesture",
    eyeDirection: "Toward each other, then soft look to camera",
    audienceFeeling: "Belief that progress is possible",
    composerEmotion: "confident",
  },
  cta: {
    targetEmotion: "Joy",
    intensity: 7,
    facialExpression: "Warm Amy AI smile; family ease in background",
    bodyLanguage: "Open invitation posture — never pushy",
    eyeDirection: "Warm eye contact toward viewer",
    audienceFeeling: "Ready to try — hope already earned",
    composerEmotion: "confident",
  },
  "end-card": {
    targetEmotion: "Joy",
    intensity: 6,
    facialExpression: "Brand-safe calm smile on end card energy",
    bodyLanguage: "Settled hold; badges clear",
    eyeDirection: "Centered brand focus",
    audienceFeeling: "Clear next step without pressure",
    composerEmotion: "confident",
  },
  bridge: {
    targetEmotion: "Calm reassurance",
    intensity: 5,
    facialExpression: "Soft neutral warmth",
    bodyLanguage: "Continuing motion without spike",
    eyeDirection: "Maintain previous eye-line",
    audienceFeeling: "Still with the story",
    composerEmotion: "calm",
  },
};

export function buildEmotionMap(intents: ComposerSceneIntent[]): SceneEmotionBeat[] {
  const roleCounts = new Map<DirectorBeatRole, number>();
  return intents.map((intent) => {
    const role = intent.role as DirectorBeatRole;
    const occurrence = roleCounts.get(role) ?? 0;
    roleCounts.set(role, occurrence + 1);
    const recipe = { ...ROLE_EMOTION[role] };
    // Soften intensity slightly on split parts after the first.
    if (occurrence > 0) {
      recipe.intensity = Math.max(4, recipe.intensity - 1);
    }
    return {
      sceneIndex: intent.index,
      role,
      ...recipe,
    };
  });
}

export function formatEmotionMapLine(beat: SceneEmotionBeat): string {
  return [
    `Scene ${beat.sceneIndex + 1} (${beat.role}): ${beat.targetEmotion}`,
    `intensity ${beat.intensity}/10`,
    `face: ${beat.facialExpression}`,
    `audience: ${beat.audienceFeeling}`,
  ].join(" — ");
}

/**
 * Per-scene emotion map — progressive arc, never random jumps.
 * Curious → Thinking → Understanding → Success → Celebration
 */

import type { SceneEmotion } from "../types/storyboard.js";
import type { ComposerSceneIntent } from "../scene-composer/types.js";
import { emotionArcStageForRole } from "./scene-continuity.js";
import type {
  DirectorBeatRole,
  EmotionArcStage,
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
    targetEmotion: "Curiosity",
    intensity: 7,
    facialExpression: "Curious soft brow; eyes searching the page — not angry caricature",
    bodyLanguage: "Shoulders slightly forward; hands pause mid-task; lean into the problem",
    eyeDirection: "Down-left into the notebook (plant eye-line for match cuts)",
    audienceFeeling: "Seen — this morning curiosity/struggle is mine too",
    composerEmotion: "curious",
  },
  problem: {
    targetEmotion: "Child hesitation",
    intensity: 6,
    facialExpression: "Thinking face — small uncertain mouth; eyes working the problem",
    bodyLanguage: "Fidgets; weight shifts; pencil taps or pauses — still seated same way",
    eyeDirection: "Still down-left / toward partner on camera-left — MATCH prior eye-line",
    audienceFeeling: "Protective empathy — they're thinking it through",
    composerEmotion: "warm",
  },
  emotion: {
    targetEmotion: "Hope",
    intensity: 7,
    facialExpression: "Understanding dawns — softening eyes; first gentle almost-smile",
    bodyLanguage: "Chest opens slightly; tension leaves the jaw; same seat geography",
    eyeDirection: "Eye-line lifts along SAME axis toward partner (eyeline-cut friendly)",
    audienceFeeling: "Maybe tomorrow can feel lighter — understanding begins",
    composerEmotion: "hopeful",
  },
  feature: {
    targetEmotion: "Curiosity",
    intensity: 6,
    facialExpression: "Understanding deepens — bright interested eyes; Amy warm mentor smile",
    bodyLanguage: "Amy kneels/leans at child height and HOLDS; child leans into shared learning",
    eyeDirection: "To Amy (camera-left) then tablet — continuous look path, no teleport glance",
    audienceFeeling: "Understanding with a mentor inside the story",
    composerEmotion: "curious",
  },
  transformation: {
    targetEmotion: "Confidence",
    intensity: 8,
    facialExpression: "Success smile — clear pride; relaxed brows",
    bodyLanguage: "Upright win energy; Amy may rise from kneel ONLY now; shared celebration look",
    eyeDirection: "Toward each other first (match prior), then soft look to camera",
    audienceFeeling: "Belief that progress is possible — success landed",
    composerEmotion: "confident",
  },
  cta: {
    targetEmotion: "Joy",
    intensity: 7,
    facialExpression: "Celebration warmth — Amy mentor smile; family ease in depth",
    bodyLanguage: "Open invitation — arrived from celebration, never hard-sell snap",
    eyeDirection: "Warm eye contact toward viewer (motivated from prior partner glance)",
    audienceFeeling: "Ready to try — celebration already earned",
    composerEmotion: "confident",
  },
  "end-card": {
    targetEmotion: "Joy",
    intensity: 6,
    facialExpression: "Settled celebration calm on brand energy",
    bodyLanguage: "Settled hold; badges clear",
    eyeDirection: "Centered brand focus",
    audienceFeeling: "Clear next step without pressure",
    composerEmotion: "confident",
  },
  bridge: {
    targetEmotion: "Calm reassurance",
    intensity: 5,
    facialExpression: "Hold prior arc face — soft neutral warmth",
    bodyLanguage: "Continuing motion without spike; preserve orientation",
    eyeDirection: "Maintain previous eye-line exactly",
    audienceFeeling: "Still inside the same continuous scene",
    composerEmotion: "calm",
  },
};

export function buildEmotionMap(intents: ComposerSceneIntent[]): SceneEmotionBeat[] {
  const roleCounts = new Map<DirectorBeatRole, number>();
  let lastArc: EmotionArcStage | undefined;
  const order: EmotionArcStage[] = [
    "Curious",
    "Thinking",
    "Understanding",
    "Success",
    "Celebration",
  ];

  return intents.map((intent) => {
    const role = intent.role as DirectorBeatRole;
    const occurrence = roleCounts.get(role) ?? 0;
    roleCounts.set(role, occurrence + 1);
    const recipe = { ...ROLE_EMOTION[role] };
    if (occurrence > 0) {
      recipe.intensity = Math.max(4, recipe.intensity - 1);
    }

    let emotionArc = emotionArcStageForRole(role);
    if (lastArc && role !== "end-card") {
      const prev = order.indexOf(lastArc);
      const next = order.indexOf(emotionArc);
      if (next < prev) emotionArc = lastArc;
    }
    lastArc = emotionArc;

    return {
      sceneIndex: intent.index,
      role,
      emotionArc,
      ...recipe,
    };
  });
}

export function formatEmotionMapLine(beat: SceneEmotionBeat): string {
  return [
    `Scene ${beat.sceneIndex + 1} (${beat.role}): ${beat.emotionArc} / ${beat.targetEmotion}`,
    `intensity ${beat.intensity}/10`,
    `face: ${beat.facialExpression}`,
    `audience: ${beat.audienceFeeling}`,
  ].join(" — ");
}

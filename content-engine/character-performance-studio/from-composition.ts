/**
 * Bridge Character Performance Studio → creative-composition Veo prompts.
 */

import type { CompositionShotPlan } from "../creative-composition/types.js";
import type { DirectorBeatRole } from "../ai-director/types.js";
import type { BrandCharacterId } from "../brand/types.js";
import { buildCharacterBrief } from "./intentions.js";
import { enrichVeoPromptWithStudio } from "./format.js";
import { gateStudioScene } from "./quality-gate.js";
import {
  NO_AD_MODE,
  pickFraming,
  shotDensityNote,
  visualRhythmNote,
} from "./rhythm.js";
import type { StudioScenePlan } from "./types.js";

function roleFromShot(shot: CompositionShotPlan): DirectorBeatRole {
  switch (shot.role) {
    case "hook":
      return "hook";
    case "amy-host":
    case "amy-girl-learn":
      return "feature";
    case "amy-boy-celebrate":
      return "transformation";
    case "cta":
      return "cta";
    default:
      return "bridge";
  }
}

export function studioPlanForCompositionShot(
  shot: CompositionShotPlan,
  previousFraming: StudioScenePlan["framing"] | null = null,
): StudioScenePlan {
  const role = roleFromShot(shot);
  const characters: BrandCharacterId[] = [shot.character];
  if (role === "hook" || role === "bridge") {
    // intentional solo
  } else if (role === "transformation") {
    characters.push("amy-ai", "amy-girl", "amy-boy");
  } else if (shot.character === "amy-girl") {
    characters.push("amy-ai");
  } else if (shot.character === "amy-ai") {
    characters.push("amy-girl");
  } else if (shot.character === "amy-boy") {
    characters.push("amy-ai");
  }

  const uniq = (["amy-ai", "amy-girl", "amy-boy"] as BrandCharacterId[])
    .filter((id) => characters.includes(id))
    .slice(0, role === "transformation" ? 3 : role === "hook" || role === "bridge" ? 1 : 2);
  const speaker =
    shot.speechMode === "speaking"
      ? shot.character
      : shot.speechMode === "listening" || shot.speechMode === "reacting"
        ? "external-narration"
        : shot.character;

  const framing = pickFraming(role, 0, previousFraming);
  const briefs = uniq.map((character) =>
    buildCharacterBrief({
      character,
      role,
      speaker,
      partners: uniq,
    }),
  );

  return gateStudioScene({
    sceneId: shot.id,
    index: 0,
    briefs,
    framing,
    previousFraming,
    shotDensityNote: shotDensityNote(shot.durationSeconds),
    noAdModeNote: NO_AD_MODE,
    visualRhythmNote: visualRhythmNote(framing, previousFraming),
    dominantFaceStory: `Lead face journey: ${briefs[0]?.face.join(" → ") ?? "hope"}`,
    ok: true,
    rejects: [],
  });
}

export function enrichCompositionWithCharacterStudio(
  shot: CompositionShotPlan,
  prompt: string,
  negativePrompt: string,
): { prompt: string; negativePrompt: string } {
  const scene = studioPlanForCompositionShot(shot);
  return enrichVeoPromptWithStudio(prompt, negativePrompt, scene);
}

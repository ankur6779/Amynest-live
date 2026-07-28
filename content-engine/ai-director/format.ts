/**
 * Format Director Package blocks into scene generation prompts.
 */

import type { ComposerScenePrompt } from "../scene-composer/types.js";
import type { DirectedScenePlan, DirectorPackage } from "./types.js";
import { formatMicroActions } from "./micro-actions.js";
import { describeShotLanguage } from "./shot-language.js";

export function formatDirectorSceneBlock(scene: DirectedScenePlan): string {
  return [
    "AI DIRECTOR — MANDATORY (do not improvise away):",
    `Objective: ${scene.objective}`,
    describeShotLanguage(scene.camera),
    `Lighting: ${scene.lighting.mood} / ${scene.lighting.colorTemperature}`,
    `Key light: ${scene.lighting.keyLight}`,
    `Blocking: ${scene.blocking.positions}`,
    `Facial expression: ${scene.emotion.facialExpression}`,
    `Body language: ${scene.emotion.bodyLanguage}`,
    `Eye direction: ${scene.emotion.eyeDirection}`,
    `Target emotion: ${scene.emotion.targetEmotion} (${scene.emotion.intensity}/10)`,
    `Audience should feel: ${scene.emotion.audienceFeeling}`,
    `Pacing: ${scene.pacing}`,
    `Motion: ${scene.motionPlan}`,
    "Micro actions (must appear):",
    formatMicroActions(scene.microActions),
    "Continuity:",
    ...scene.continuityNotes.map((n) => `- ${n}`),
    `Transition out: ${scene.transitionOut.type} — ${scene.transitionOut.note}`,
  ].join("\n");
}

export function formatDirectorPackageSummary(director: DirectorPackage): string {
  return [
    `FILM OBJECTIVE: ${director.filmObjective}`,
    "EMOTION MAP:",
    ...director.emotionMap.map(
      (e) =>
        `  Scene ${e.sceneIndex + 1}: ${e.targetEmotion} (${e.intensity}/10) → audience: ${e.audienceFeeling}`,
    ),
    "VISUAL CONTINUITY BIBLE:",
    `  Time: ${director.visualContinuity.timeOfDay}`,
    `  Room: ${director.visualContinuity.roomLayout}`,
    `  Wardrobe: ${director.visualContinuity.wardrobe}`,
    `  Lighting: ${director.visualContinuity.lightingLanguage}`,
    `  Eye-line: ${director.visualContinuity.eyeLine}`,
  ].join("\n");
}

/** Fold director instructions into composer prompts (additive). */
export function enrichPromptsWithDirector(
  prompts: ComposerScenePrompt[],
  director: DirectorPackage,
): ComposerScenePrompt[] {
  const byId = new Map(director.scenes.map((s) => [s.sceneId, s]));
  const summary = formatDirectorPackageSummary(director);

  return prompts.map((prompt) => {
    const directed = byId.get(prompt.sceneId);
    if (!directed) return prompt;

    return {
      ...prompt,
      systemBrandBlock: [
        prompt.systemBrandBlock,
        summary,
        director.visualContinuity.lightingLanguage,
      ].join("\n\n"),
      userPrompt: [prompt.userPrompt, "", formatDirectorSceneBlock(directed)].join(
        "\n",
      ),
      negativePrompt: [
        prompt.negativePrompt,
        "powerpoint style",
        "slideshow slides",
        "static stock photo",
        "talking head only",
        "generic AI animation",
        "no micro motion",
        "identity wardrobe change",
        "harsh neon",
        "random camera",
      ].join(", "),
    };
  });
}

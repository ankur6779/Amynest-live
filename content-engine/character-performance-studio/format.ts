/**
 * Format Character Performance Studio into prompts.
 */

import type { ComposerScenePrompt } from "../scene-composer/types.js";
import type {
  CharacterPerformanceStudioPackage,
  StudioScenePlan,
} from "./types.js";

function label(id: string): string {
  if (id === "amy-ai") return "Amy AI";
  if (id === "amy-girl") return "Amy Girl";
  if (id === "amy-boy") return "Amy Boy";
  return id;
}

export function formatStudioSceneBlock(scene: StudioScenePlan): string {
  if (scene.briefs.length === 0) {
    return [
      "CHARACTER PERFORMANCE STUDIO — END CARD:",
      "No posed characters. Brand settle. Feeling already earned — no hard sell.",
    ].join("\n");
  }

  const briefs = scene.briefs.map((b) =>
    [
      `- ${label(b.character)}`,
      `  Internal goal: ${b.internalGoal}`,
      `  Intention: ${b.intention}`,
      `  FACE (primary emotion): ${b.face.join(", ")} — avoid neutral`,
      `  EYES: focus on ${b.eyeFocus} — maintain contact; never stare into space`,
      `  BODY: ${b.body.join(", ")}`,
      `  ENERGY: ${b.energyVerbs.join(", ")}`,
      `  Avoid: ${b.antiPattern}`,
    ].join("\n"),
  );

  return [
    "CHARACTER PERFORMANCE STUDIO — MANDATORY (professionally directed characters):",
    "Act from intention. Not random motion. Not AI-pose slideshow.",
    scene.noAdModeNote,
    scene.shotDensityNote,
    scene.visualRhythmNote,
    `Face story this beat: ${scene.dominantFaceStory}`,
    "CHARACTER BRIEFS:",
    ...briefs,
    "Amy AI mentors inside the story (kneel/sit/walk beside/celebrate) — never a presenter mascot.",
    "Children: believable kid energy (lean, peek, bounce, giggle, point, look around) — never robots.",
  ].join("\n");
}

export function formatStudioSummary(
  pack: CharacterPerformanceStudioPackage,
): string {
  return [
    `STUDIO OBJECTIVE: ${pack.objective}`,
    pack.quality.summary,
    "FRAMING RHYTHM:",
    ...pack.scenes.map(
      (s) =>
        `  ${s.sceneId}: ${s.framing}` +
        (s.previousFraming ? ` (prev ${s.previousFraming})` : ""),
    ),
  ].join("\n");
}

export function enrichPromptsWithCharacterStudio(
  prompts: ComposerScenePrompt[],
  pack: CharacterPerformanceStudioPackage,
): ComposerScenePrompt[] {
  const byId = new Map(pack.scenes.map((s) => [s.sceneId, s]));
  const summary = formatStudioSummary(pack);

  return prompts.map((prompt) => {
    const scene = byId.get(prompt.sceneId);
    if (!scene) return prompt;
    return {
      ...prompt,
      systemBrandBlock: [prompt.systemBrandBlock, summary].join("\n\n"),
      userPrompt: [prompt.userPrompt, "", formatStudioSceneBlock(scene)].join(
        "\n",
      ),
      negativePrompt: [
        prompt.negativePrompt,
        "neutral expression",
        "blank stare into space",
        "posed mannequin",
        "robotic child movement",
        "presenter Amy",
        "mascot narrator Amy",
        "hard sell advertisement",
        "long static hold",
        "repeated identical framing",
        "no eye contact",
        "AI generated pose slideshow",
      ].join(", "),
    };
  });
}

export function enrichVeoPromptWithStudio(
  basePrompt: string,
  baseNegative: string,
  scene: StudioScenePlan,
): { prompt: string; negativePrompt: string } {
  return {
    prompt: [basePrompt, "", formatStudioSceneBlock(scene)].join("\n"),
    negativePrompt: [
      baseNegative,
      "neutral expression",
      "blank stare into space",
      "posed mannequin",
      "robotic child movement",
      "presenter Amy",
      "mascot narrator Amy",
      "hard sell advertisement",
      "long static hold",
      "AI generated pose slideshow",
    ].join(", "),
  };
}

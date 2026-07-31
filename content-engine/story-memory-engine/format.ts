/**
 * Format Story Memory into prompts (additive enrichment — not a new prompt system).
 */

import type { ComposerScenePrompt } from "../scene-composer/types.js";
import type { SceneStoryMemory, StoryMemoryPackage } from "./types.js";

function label(id: string): string {
  if (id === "amy-ai") return "Amy AI";
  if (id === "amy-girl") return "Amy Girl";
  if (id === "amy-boy") return "Amy Boy";
  return id;
}

export function formatStorySceneBlock(scene: SceneStoryMemory): string {
  const goals = scene.goals.map(
    (g) =>
      `- ${label(g.character)}: "${g.goal}" [${g.status}] — do not reset`,
  );

  return [
    "STORY MEMORY ENGINE — MANDATORY NARRATIVE CONTINUITY (one emotional story):",
    scene.inheritsFromSceneId
      ? `Continue the story from ${scene.inheritsFromSceneId}. Never generate this beat as an independent clip.`
      : "Story opens — plant the problem and emotional promise.",
    `WHAT JUST HAPPENED: ${scene.whatJustHappened}`,
    `WHY THIS BEAT: ${scene.whyItHappened}`,
    `EMOTIONAL PROMISE: ${scene.emotionalPromise}`,
    `WHAT MUST HAPPEN NEXT: ${scene.whatMustHappenNext}`,
    `EMOTION THREAD: ${scene.previousEmotionThread ?? "seed"} → ${scene.emotionThread}`,
    `STORY STAGE: ${scene.beatStage}`,
    "CHARACTER GOALS (persist until completed):",
    ...goals,
    `VISUAL CALLBACK: ${scene.callbackNote}`,
    scene.endingNote ? `ENDING MEMORY: ${scene.endingNote}` : "",
    "Never skip emotional steps. Never let the problem vanish without a solution. CTA must feel like the last page — not an ad interrupt.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatStoryPackageSummary(pack: StoryMemoryPackage): string {
  return [
    `STORY MEMORY OBJECTIVE: ${pack.objective}`,
    `Throughline: ${pack.emotionalThroughline}`,
    pack.quality.summary,
    `Scores — narrative ${pack.scores.narrativeContinuity}% · emotion ${pack.scores.emotionalContinuity}% · cohesion ${pack.scores.storyCohesion}% · ending ${pack.scores.endingSatisfaction}%`,
    "STORY CHAIN:",
    ...pack.scenes.map(
      (s) =>
        `  ${s.sceneId}: ${s.beatStage} | ${s.emotionThread.slice(0, 64)} | next=${s.whatMustHappenNext.slice(0, 48)}`,
    ),
  ].join("\n");
}

export function enrichPromptsWithStoryMemory(
  prompts: ComposerScenePrompt[],
  pack: StoryMemoryPackage,
): ComposerScenePrompt[] {
  const byId = new Map(pack.scenes.map((s) => [s.sceneId, s]));
  const summary = formatStoryPackageSummary(pack);

  return prompts.map((prompt) => {
    const scene = byId.get(prompt.sceneId);
    if (!scene) return prompt;
    return {
      ...prompt,
      systemBrandBlock: [prompt.systemBrandBlock, summary].join("\n\n"),
      userPrompt: [prompt.userPrompt, "", formatStorySceneBlock(scene)].join(
        "\n",
      ),
      negativePrompt: [
        prompt.negativePrompt,
        "disconnected scene",
        "independent AI clip",
        "emotion reset",
        "story jump",
        "problem disappears without solution",
        "bolted-on CTA",
        "hard-sell interrupt",
        "new unrelated plot",
        "forgotten previous beat",
        "goal reset",
        "missing visual callback",
      ].join(", "),
    };
  });
}

export function enrichVeoPromptWithStoryMemory(
  basePrompt: string,
  baseNegative: string,
  scene: SceneStoryMemory,
): { prompt: string; negativePrompt: string } {
  return {
    prompt: [basePrompt, "", formatStorySceneBlock(scene)].join("\n"),
    negativePrompt: [
      baseNegative,
      "disconnected scene",
      "independent AI clip",
      "emotion reset",
      "story jump",
      "problem disappears without solution",
      "bolted-on CTA",
      "hard-sell interrupt",
      "forgotten previous beat",
      "goal reset",
    ].join(", "),
  };
}

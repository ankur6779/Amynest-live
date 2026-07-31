/**
 * Format Performance Director blocks into scene / Veo prompts.
 */

import type { ComposerScenePrompt } from "../scene-composer/types.js";
import type { PerformanceDirectorPackage, ScenePerformancePlan } from "./types.js";

export function formatScenePerformanceBlock(plan: ScenePerformancePlan): string {
  if (plan.cast.length === 0) {
    return [
      "PERFORMANCE DIRECTOR v2.0 — END CARD:",
      "No fake speaking. Brand settle only. No frozen character stickers.",
    ].join("\n");
  }

  const castLines = plan.cast.map(
    (c) => `- ${label(c.character)} [${c.role.toUpperCase()}]: ${c.beat}`,
  );
  const micro = plan.microActing
    .map((m) => `- @${m.atSecond.toFixed(1)}s ${m.action}`)
    .join("\n");

  return [
    "PERFORMANCE DIRECTOR v2.0 — MANDATORY ACTING (not poses):",
    `Dominant emotion: ${plan.dominantEmotion}`,
    `Relationship: ${plan.relationshipNote}`,
    `Speaker: ${plan.speaker}`,
    "CAST (every character has a job — never all stand still):",
    ...castLines,
    `Lip-sync strategy: ${plan.lipSyncStrategy}`,
    lipSyncGuidance(plan),
    `Framing preference: ${plan.framingPreference} — avoid tight mouth CU if sync may mismatch.`,
    `Camera motivation: ${plan.cameraMotivation}`,
    plan.groupScene
      ? "GROUP SCENE: 2+ characters interacting (look / listen / react / celebrate together)."
      : "Solo only if story-forced — prefer bringing a partner into frame.",
    "MICRO-ACTING (at least one living beat every 2–3s — never freeze):",
    micro || "- Continuous micro-life required",
    "REAL CHILD BEHAVIOR: tiny pauses, curiosity glances, soft mistakes, laughs, thinking, celebrating.",
    "Amy AI = mentor (teach, encourage, celebrate, comfort) — NEVER outside narrator.",
  ].join("\n");
}

function lipSyncGuidance(plan: ScenePerformancePlan): string {
  switch (plan.lipSyncStrategy) {
    case "external-narration-reactions":
      return [
        "EXTERNAL NARRATION: nobody fakes speaking.",
        "Show listening faces, reactions, and motivated actions only.",
        "Mouths stay mostly closed or emotion-soft — no random lip flaps.",
      ].join(" ");
    case "speaking-beat-ots":
      return [
        "SPEAKING BEAT (OTS): generate the shot around the spoken line.",
        `Dialogue beat: "${plan.dialogueBeat}"`,
        "Prefer over-the-shoulder / medium — speaker mouth readable but not extreme CU.",
        "Listeners watch; reactors respond — coordinated ensemble.",
      ].join(" ");
    case "speaking-beat-medium":
      return [
        "SPEAKING BEAT (MEDIUM): match visible mouth motion duration to the short spoken beat.",
        `Dialogue beat: "${plan.dialogueBeat}"`,
        "If perfect phoneme sync is uncertain, keep framing medium — never obvious lip mismatch CU.",
        "Speaker gestures + eye focus; others listen/react.",
      ].join(" ");
    case "listening-reaction":
      return [
        "LISTENING/REACTION BEAT: prioritize eyes, blinks, nods over mouth close-ups.",
        "No fake dialogue mouths.",
      ].join(" ");
  }
}

function label(id: string): string {
  if (id === "amy-ai") return "Amy AI";
  if (id === "amy-girl") return "Amy Girl";
  if (id === "amy-boy") return "Amy Boy";
  return id;
}

export function formatPerformancePackageSummary(
  pack: PerformanceDirectorPackage,
): string {
  return [
    `PERFORMANCE OBJECTIVE: ${pack.filmActingObjective}`,
    `Complexity mix: duo ${(pack.complexity.duoRatio * 100).toFixed(0)}% · solo ${(pack.complexity.soloRatio * 100).toFixed(0)}% · trio ${(pack.complexity.trioRatio * 100).toFixed(0)}% · avg ${pack.complexity.avgCharactersPerShot.toFixed(2)} chars/shot`,
    `Group (duo+) share: ${(pack.groupSceneRatio * 100).toFixed(0)}% (${pack.groupSceneCount}/${pack.livingSceneCount} living scenes)`,
    pack.summary,
    "SCENES:",
    ...pack.scenes.map(
      (s) =>
        `  ${s.sceneId}: speaker=${s.speaker}; emotion=${s.dominantEmotion}; group=${s.groupScene}; cast=${s.cast.map((c) => c.character).join("+") || "none"}`,
    ),
  ].join("\n");
}

/** Additive enrich of composer prompts after AI Director. */
export function enrichPromptsWithPerformanceDirector(
  prompts: ComposerScenePrompt[],
  pack: PerformanceDirectorPackage,
): ComposerScenePrompt[] {
  const byId = new Map(pack.scenes.map((s) => [s.sceneId, s]));
  const summary = formatPerformancePackageSummary(pack);

  return prompts.map((prompt) => {
    const plan = byId.get(prompt.sceneId);
    if (!plan) return prompt;

    const characters = plan.cast.length
      ? plan.cast.map((c) => c.character)
      : prompt.characters;

    return {
      ...prompt,
      characters,
      systemBrandBlock: [prompt.systemBrandBlock, summary].join("\n\n"),
      userPrompt: [
        prompt.userPrompt,
        "",
        formatScenePerformanceBlock(plan),
      ].join("\n"),
      negativePrompt: [
        prompt.negativePrompt,
        "frozen mannequin characters",
        "everyone standing still",
        "pose-only animation",
        "fake lip flaps on listeners",
        "obvious lip sync mismatch close-up",
        "solo sticker character",
        "narrator Amy floating outside story",
        "no micro acting",
        "robotic child",
      ].join(", "),
    };
  });
}

/** Enrich a raw Veo performance prompt string (creative-composition path). */
export function enrichVeoPromptWithPerformance(
  basePrompt: string,
  baseNegative: string,
  plan: ScenePerformancePlan,
): { prompt: string; negativePrompt: string } {
  return {
    prompt: [basePrompt, "", formatScenePerformanceBlock(plan)].join("\n"),
    negativePrompt: [
      baseNegative,
      "frozen mannequin characters",
      "everyone standing still",
      "pose-only animation",
      "fake lip flaps on listeners",
      "obvious lip sync mismatch close-up",
      "solo sticker character",
      "narrator Amy floating outside story",
      "no micro acting",
    ].join(", "),
  };
}

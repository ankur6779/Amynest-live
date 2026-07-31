/**
 * Format Director Package blocks into scene generation prompts.
 * Continuity spine is mandatory — one continuous short across cuts.
 */

import type { ComposerScenePrompt } from "../scene-composer/types.js";
import type { DirectedScenePlan, DirectorPackage } from "./types.js";
import { formatMicroActions } from "./micro-actions.js";
import { describeShotLanguage } from "./shot-language.js";

function lipOwnershipLine(scene: DirectedScenePlan): string {
  const speech = scene.continuityState.speechState;
  if (speech === "speaking") {
    return [
      "LIP OWNERSHIP: This beat SPEAKS — visible speaker mouths the line.",
      "Jaw/lips articulate; never frozen closed mouth while speaking.",
      "Partners listen with closed/soft mouths — no mismatched flaps.",
    ].join(" ");
  }
  if (speech === "listening") {
    return [
      "LIP OWNERSHIP: LISTENING beat — mouth mostly closed; blinks, nods, eye track.",
      "Never silent talking-head flaps. Carry listening state from prior cut if still listening.",
    ].join(" ");
  }
  if (speech === "silent") {
    return "LIP OWNERSHIP: Silent brand hold — no dialogue mouth motion.";
  }
  return [
    "LIP OWNERSHIP: REACTING — emotion micro-mouth only, not full dialogue articulation.",
    "Match prior speech state on cut-in unless this beat newly starts speaking.",
  ].join(" ");
}

export function formatDirectorSceneBlock(scene: DirectedScenePlan): string {
  const c = scene.continuityState;
  return [
    "AI DIRECTOR — MANDATORY (do not improvise away):",
    "STYLE: One continuous Pixar / DreamWorks-TV family short — NOT disconnected AI shots.",
    `Objective: ${scene.objective}`,
    describeShotLanguage(scene.camera),
    `Lighting: ${scene.lighting.mood} / ${scene.lighting.colorTemperature}`,
    `Key light: ${scene.lighting.keyLight}`,
    `Blocking: ${scene.blocking.positions}`,
    `Facial expression: ${scene.emotion.facialExpression}`,
    `Body language: ${scene.emotion.bodyLanguage}`,
    `Eye direction: ${scene.emotion.eyeDirection}`,
    `Emotion arc: ${scene.emotion.emotionArc} → ${scene.emotion.targetEmotion} (${scene.emotion.intensity}/10)`,
    `Audience should feel: ${scene.emotion.audienceFeeling}`,
    lipOwnershipLine(scene),
    "MENTOR RULE: Amy AI supports at child height (kneel/lean/sit beside) — hold kneel until motivated rise.",
    "CHILD REALISM: Natural blinks, tiny head motion, breathing, hand fidgets — no robotic posing.",
    `Pacing: ${scene.pacing}`,
    `Motion: ${scene.motionPlan}`,
    "Micro actions (must appear):",
    formatMicroActions(scene.microActions),
    "",
    "=== CONTINUITY STATE (MATCH ACROSS CUTS) ===",
    `Character position: ${c.characterPosition}`,
    `Eye direction: ${c.eyeDirection}`,
    `Body orientation: ${c.bodyOrientation}`,
    `Hand position: ${c.handPosition}`,
    `Object placement: ${c.objectPlacement}`,
    `Lighting direction: ${c.lightingDirection}`,
    `Speech state: ${c.speechState}`,
    `Camera momentum: ${c.cameraMomentum}`,
    `Movement speed: ${c.movementSpeed}`,
    `Amy pose: ${c.amyPose}`,
    `Screen direction: ${c.screenDirection}`,
    scene.cutIn
      ? `CUT IN (${scene.cutIn.kind}): ${scene.cutIn.note}`
      : "CUT IN: Establish geography for the whole short.",
    `CUT OUT (${scene.cutOut.kind}): ${scene.cutOut.note}`,
    "Prefer match cut / motivated cut / action cut / eyeline cut / L-cut / J-cut.",
    "Avoid random angle jumps, random zooms, character teleporting, camera resets.",
    "Continuity checklist:",
    ...scene.continuityNotes.map((n) => `- ${n}`),
    `Transition out: ${scene.transitionOut.type} — ${scene.transitionOut.note}`,
  ].join("\n");
}

export function formatDirectorPackageSummary(director: DirectorPackage): string {
  return [
    `FILM OBJECTIVE: ${director.filmObjective}`,
    "EMOTION ARC (continuous): Curious → Thinking → Understanding → Success → Celebration",
    "EMOTION MAP:",
    ...director.emotionMap.map(
      (e) =>
        `  Scene ${e.sceneIndex + 1}: [${e.emotionArc}] ${e.targetEmotion} (${e.intensity}/10) → ${e.audienceFeeling}`,
    ),
    "VISUAL CONTINUITY BIBLE:",
    `  Time: ${director.visualContinuity.timeOfDay}`,
    `  Room: ${director.visualContinuity.roomLayout}`,
    `  Wardrobe: ${director.visualContinuity.wardrobe}`,
    `  Lighting: ${director.visualContinuity.lightingLanguage}`,
    `  Eye-line: ${director.visualContinuity.eyeLine}`,
    `  Objects: ${director.visualContinuity.objectPlacement}`,
    `  Positions: ${director.visualContinuity.characterPositions}`,
    `  Arc lock: ${director.visualContinuity.emotionArc ?? "Curious→…→Celebration"}`,
    "CUT LANGUAGE: match / eyeline / action / motivated / L-cut / J-cut — never random jumps.",
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
        "disconnected AI shots",
        "character teleport",
        "prop hand swap",
        "random angle jump",
        "random zoom",
        "camera reset",
        "emotion whiplash",
        "talking head only",
        "silent talking head",
        "mouth closed while speaking",
        "random lip flaps",
        "generic AI cartoon child",
        "robotic stiff animation",
        "voice-over announcer energy",
        "generic AI animation",
        "no micro motion",
        "identity wardrobe change",
        "harsh neon",
        "random camera",
        "locked-off static camera entire shot",
      ].join(", "),
    };
  });
}

/**
 * Format Character Memory into prompts (additive enrichment).
 */

import type { ComposerScenePrompt } from "../scene-composer/types.js";
import type {
  CharacterMemoryPackage,
  SceneCharacterMemory,
} from "./types.js";
import { canonicalIdentityLocksForCast, formatAmyGirlVisualTokenSummary } from "./identity-lock.js";
import type { BrandCharacterId } from "../brand/types.js";

function label(id: string): string {
  if (id === "amy-ai") return "Amy AI";
  if (id === "amy-girl") return "Amy Girl";
  if (id === "amy-boy") return "Amy Boy";
  return id;
}

export function formatMemorySceneBlock(scene: SceneCharacterMemory): string {
  if (scene.role === "end-card") {
    return [
      "CHARACTER MEMORY ENGINE — END CARD:",
      "Inherit emotional settle from previous scene. Brand hold. No identity redesign.",
      scene.inheritsFromSceneId
        ? `Continues from memory of ${scene.inheritsFromSceneId}.`
        : "Opening brand settle.",
    ].join("\n");
  }

  const poses = scene.poses.map((p) =>
    [
      `- ${label(p.character)}`,
      `  Position: ${p.position}`,
      `  Body: ${p.bodyOrientation}`,
      `  Eyes: ${p.eyeDirection}`,
      `  Face: ${p.facialExpression}`,
      `  Hands: ${p.handPosition} (active: ${p.activeHand})`,
      `  Clothing LOCK: ${p.clothing}`,
      `  Hair LOCK: ${p.hairstyle}`,
      `  Accessories LOCK: ${p.accessories}`,
    ].join("\n"),
  );

  const props =
    scene.props.length === 0
      ? ["- (no active props)"]
      : scene.props.map(
          (p) =>
            `- ${p.description} — owner ${p.owner}, hand ${p.hand}, ${p.placement}`,
        );

  return [
    "CHARACTER MEMORY ENGINE — MANDATORY CONTINUITY (one continuous film):",
    scene.inheritsFromSceneId
      ? `INHERIT approved memory from ${scene.inheritsFromSceneId}. Do NOT reset pose, wardrobe, room, lighting, or props unless listed as intentional.`
      : "SCENE 1 SEED — lock Official Character Bible identity from first frame.",
    `Reference stack: Official Character Bible for EACH cast member (authoritative identity) + Current Scene Objective. Previous-scene continuity is textual (pose/room/lighting/camera/emotion) — generated last-frame freezes are local-only and not KIE visual refs.`,
    "Never generate characters from text alone — match each character's Official Character Bible. Scene lead does not redefine companion identity.",
    canonicalIdentityLocksForCast(scene.characters as BrandCharacterId[]),
    scene.characters.includes("amy-girl")
      ? formatAmyGirlVisualTokenSummary()
      : "",
    `Room LOCK: ${scene.room}`,
    `Lighting LOCK: ${scene.lighting.timeOfDay}; window ${scene.lighting.windowDirection}; ${scene.lighting.sunlight}; shadows ${scene.lighting.shadowDirection}; ${scene.lighting.roomBrightness}; mood ${scene.lighting.mood}`,
    `Camera CONTINUE: momentum ${scene.camera.momentum} / ${scene.camera.movement}. ${scene.camera.framingNote}. Start where previous push/track ended — no camera teleport.`,
    `Emotion CONTINUE: ${scene.emotion.previousStage ?? "seed"} → ${scene.emotion.stage} (${scene.emotion.label}). Never jump sad→celebration.`,
    `Animation energy: ${scene.animationEnergy}`,
    scene.intentionalChanges.length
      ? `Intentional story changes only: ${scene.intentionalChanges.join(", ")}`
      : "No intentional resets — full carry-forward.",
    "CHARACTER POSES (carry-forward):",
    ...poses,
    "PROPS (carry-forward):",
    ...props,
  ].join("\n");
}

export function formatMemoryPackageSummary(
  pack: CharacterMemoryPackage,
): string {
  return [
    `CHARACTER MEMORY OBJECTIVE: ${pack.objective}`,
    pack.quality.summary,
    `Scores — identity ${pack.scores.characterIdentity}% · scene ${pack.scores.sceneContinuity}% · emotion ${pack.scores.emotionContinuity}% · camera ${pack.scores.cameraContinuity}%`,
    "MEMORY CHAIN:",
    ...pack.scenes.map(
      (s) =>
        `  ${s.sceneId}: inherit=${s.inheritsFromSceneId ?? "seed"}; emotion=${s.emotion.stage}; room=${s.room.slice(0, 48)}; refs=${s.referenceImagePaths.length}`,
    ),
  ].join("\n");
}

export function enrichPromptsWithCharacterMemory(
  prompts: ComposerScenePrompt[],
  pack: CharacterMemoryPackage,
): ComposerScenePrompt[] {
  const byId = new Map(pack.scenes.map((s) => [s.sceneId, s]));
  const summary = formatMemoryPackageSummary(pack);

  return prompts.map((prompt) => {
    const scene = byId.get(prompt.sceneId);
    if (!scene) return prompt;
    return {
      ...prompt,
      systemBrandBlock: [prompt.systemBrandBlock, summary].join("\n\n"),
      userPrompt: [prompt.userPrompt, "", formatMemorySceneBlock(scene)].join(
        "\n",
      ),
      negativePrompt: [
        prompt.negativePrompt,
        "character redesign",
        "different face",
        "different hairstyle",
        "different clothes",
        "wardrobe change",
        "age drift",
        "eye color change",
        "body proportion change",
        "camera teleport",
        "lighting reset",
        "prop disappearing",
        "emotion jump",
        "background teleport",
        "pose reset to T-pose",
        "new room unrelated to previous scene",
        "independent AI clip look",
      ].join(", "),
    };
  });
}

export function enrichVeoPromptWithMemory(
  basePrompt: string,
  baseNegative: string,
  scene: SceneCharacterMemory,
): { prompt: string; negativePrompt: string } {
  return {
    prompt: [basePrompt, "", formatMemorySceneBlock(scene)].join("\n"),
    negativePrompt: [
      baseNegative,
      "character redesign",
      "different face",
      "different hairstyle",
      "different clothes",
      "wardrobe change",
      "camera teleport",
      "lighting reset",
      "prop disappearing",
      "emotion jump",
      "background teleport",
      "pose reset",
      "independent AI clip look",
    ].join(", "),
  };
}

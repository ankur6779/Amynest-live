/**
 * Per-scene prompts with official brand kit + continuity context.
 */

import { getBrandIdentityKit } from "../brand/identity.js";
import { buildBrandSystemPromptBlock } from "../brand/prompts.js";
import type { BrandCharacterId } from "../brand/types.js";
import type {
  ComposerSceneIntent,
  ComposerScenePrompt,
  SceneContinuityContext,
} from "./types.js";

export function buildScenePrompts(
  intents: ComposerSceneIntent[],
  meta: { title: string; category: string; keywords: string[] },
): ComposerScenePrompt[] {
  const kit = getBrandIdentityKit();
  const brandBlock = buildBrandSystemPromptBlock({
    category: meta.category,
    title: meta.title,
    keywords: meta.keywords,
  });

  return intents.map((intent, index) => {
    const sceneId = sceneIdFor(intent, index);
    const prev = intents[index - 1];
    const next = intents[index + 1];
    const continuity = buildContinuity(sceneId, intent, prev, next, index, intents);

    const characterLocks = intent.characters
      .map((id) => kit.characters[id]?.promptLock)
      .filter(Boolean)
      .join("\n");

    const userPrompt = [
      `SCENE GOAL: ${intent.goal}`,
      `SCENE ROLE: ${intent.role}`,
      `DURATION: ${intent.durationSeconds} seconds (exact). Vertical 9:16, 1080x1920.`,
      `NARRATION BEAT: ${intent.narration}`,
      `CAPTION: ${intent.caption}`,
      `EMOTION: ${intent.emotion}`,
      `CAMERA: ${intent.camera}`,
      "",
      "CONTINUITY:",
      `Previous scene: ${continuity.previousGoal ?? "none (cold open)"}`,
      `Current scene: ${intent.goal}`,
      `Next scene: ${continuity.nextGoal ?? "none (final)"}`,
      `Camera handoff: ${continuity.cameraHandoff}`,
      `Shared lighting: ${continuity.sharedLighting}`,
      `Shared palette: ${continuity.sharedPalette}`,
      "",
      "CHARACTERS (official only — never redesign):",
      characterLocks || "Amy AI only",
      "",
      "Preserve face, hair, eyes, expressions language, clothing, scale, lighting, material, pose continuity from previous scene.",
      "Pixar-inspired emotional clarity — not a software UI ad. Emotion first.",
      intent.role === "end-card"
        ? "Official end card: app icon + Google Play badge + App Store badge + Download AmyNest AI + Build Better Habits Every Day."
        : "Do not show end card yet.",
    ].join("\n");

    return {
      sceneId,
      systemBrandBlock: [
        brandBlock,
        `Official palette: primary ${kit.colors.primary}, deep ${kit.colors.deepPurple}, accent ${kit.colors.accent}.`,
        `Lighting: soft cinematic key, warm skin, purple rim — never harsh neon.`,
        continuity.sharedIdentityLock,
      ].join("\n\n"),
      userPrompt,
      negativePrompt: [
        "redesigned characters",
        "wrong mascot",
        "off-brand colors",
        "logo redesign",
        "fear marketing",
        "low resolution",
        "watermark clutter",
        "horizontal 16:9",
        "identity drift",
        "generic stock AI look",
      ].join(", "),
      continuity,
      durationSeconds: intent.durationSeconds,
      characters: intent.characters,
    };
  });
}

export function sceneIdFor(intent: ComposerSceneIntent, index: number): string {
  return `compose-${String(index + 1).padStart(2, "0")}-${intent.role}`;
}

function buildContinuity(
  sceneId: string,
  intent: ComposerSceneIntent,
  prev: ComposerSceneIntent | undefined,
  next: ComposerSceneIntent | undefined,
  index: number,
  all: ComposerSceneIntent[],
): SceneContinuityContext {
  const kit = getBrandIdentityKit();
  return {
    previousSceneId: prev ? sceneIdFor(prev, index - 1) : null,
    currentSceneId: sceneId,
    nextSceneId: next ? sceneIdFor(next, index + 1) : null,
    previousGoal: prev?.goal ?? null,
    nextGoal: next?.goal ?? null,
    sharedLighting: "Soft cinematic key + gentle purple rim; consistent across scenes",
    sharedPalette: `${kit.colors.primary} / ${kit.colors.deepPurple} / ${kit.colors.lavender}`,
    sharedIdentityLock:
      "LOCKED IDENTITY — never change face, hair, eyes, clothing, scale, lighting language, or material between scenes.",
    cameraHandoff: describeHandoff(intent, prev, next, all.length),
  };
}

function describeHandoff(
  intent: ComposerSceneIntent,
  prev: ComposerSceneIntent | undefined,
  next: ComposerSceneIntent | undefined,
  total: number,
): string {
  if (!prev) return "Cold open push-in; establish eye-line for later scenes.";
  if (!next || intent.role === "end-card") {
    return "Settle to centered hold for end card / hope close.";
  }
  if (prev.camera === intent.camera) {
    return `Continue ${intent.camera} energy; match previous scene's eyeline (${total} scenes total).`;
  }
  return `Transition camera from ${prev.camera} into ${intent.camera} without identity jump.`;
}

export function charactersForPrompt(characters: BrandCharacterId[]): string {
  return characters.join(", ");
}

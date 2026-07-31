/**
 * Resolve generation seed images: Official Character Bible + Previous Scene Memory.
 * Reuses existing provider imagePath (image-to-video) — no extra API passes.
 */

import { existsSync } from "node:fs";
import type { BrandCharacterId } from "../brand/types.js";
import { wardrobeFor } from "./wardrobe.js";
import type { SceneCharacterMemory } from "./types.js";

export interface GenerationSeed {
  /** Primary first-frame for image-to-video (existing Veo capability). */
  imagePath: string;
  /** Full reference stack for providers that accept multiple refs. */
  referenceImagePaths: string[];
  usedPreviousFrame: boolean;
  bibleAssetPaths: string[];
  note: string;
}

/**
 * Prefer previous approved last-frame when the lead character continues;
 * otherwise fall back to the official identity keyframe (bible-locked).
 */
export function resolveGenerationSeed(input: {
  character: BrandCharacterId;
  identityKeyframePath: string;
  previousMemory?: SceneCharacterMemory | null;
  /** Extra characters present in this shot (for bible stack). */
  cast?: BrandCharacterId[];
}): GenerationSeed {
  const cast = input.cast?.length ? input.cast : [input.character];
  const bibleAssetPaths = cast.map((c) => wardrobeFor(c).bibleAsset);
  const previousFrame = input.previousMemory?.lastFramePath;
  const sameLeadContinues =
    Boolean(previousFrame) &&
    existsSync(previousFrame!) &&
    Boolean(input.previousMemory?.characters.includes(input.character));

  if (sameLeadContinues) {
    const referenceImagePaths = uniquePaths([
      ...bibleAssetPaths,
      previousFrame!,
    ]);
    return {
      imagePath: previousFrame!,
      referenceImagePaths,
      usedPreviousFrame: true,
      bibleAssetPaths,
      note: "PRIMARY SEED = previous scene last-frame memory; Character Bible paths attached as identity refs.",
    };
  }

  const referenceImagePaths = uniquePaths([
    ...bibleAssetPaths,
    input.identityKeyframePath,
    ...(previousFrame && existsSync(previousFrame) ? [previousFrame] : []),
  ]);

  return {
    imagePath: input.identityKeyframePath,
    referenceImagePaths,
    usedPreviousFrame: false,
    bibleAssetPaths,
    note: previousFrame
      ? "PRIMARY SEED = official identity keyframe (character change); previous room/lighting/emotion carried in memory prompt."
      : "PRIMARY SEED = official identity keyframe (scene 1 / no prior memory).",
  };
}

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths.filter((p) => p && existsSync(p)))];
}

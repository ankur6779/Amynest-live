/**
 * Generate-time helpers — freeze last frame & attach to memory chain.
 * Used by creative-composition shot loop (edge wiring only).
 */

import { join } from "node:path";
import { freezeLastFrame } from "./freeze.js";
import { resolveGenerationSeed, type GenerationSeed } from "./seed.js";
import type { BrandCharacterId } from "../brand/types.js";
import type { SceneCharacterMemory } from "./types.js";

export function attachLastFrameMemory(
  memory: SceneCharacterMemory,
  videoPath: string,
  memoryDir: string,
): SceneCharacterMemory {
  const lastFramePath = join(memoryDir, `${memory.sceneId}-last.png`);
  freezeLastFrame({ videoPath, outputPath: lastFramePath });
  return {
    ...memory,
    lastFramePath,
    referenceImagePaths: [
      ...memory.bibleAssetPaths,
      lastFramePath,
    ],
  };
}

export function seedForShot(input: {
  character: BrandCharacterId;
  identityKeyframePath: string;
  previousMemory: SceneCharacterMemory | null;
  cast?: BrandCharacterId[];
}): GenerationSeed {
  return resolveGenerationSeed(input);
}

/**
 * Character Memory Engine — plan-time entry (additive after Character Studio).
 */

import { createHash } from "node:crypto";
import type { DirectorPackage } from "../ai-director/types.js";
import type { PerformanceDirectorPackage } from "../performance-director/types.js";
import type { ComposerSceneIntent } from "../scene-composer/types.js";
import type { ContentPackage } from "../types/content-package.js";
import { buildSceneMemoryChain } from "./carry.js";
import { enrichPromptsWithCharacterMemory } from "./format.js";
import { gateSceneMemory, scoreMemoryContinuity } from "./quality-gate.js";
import {
  CHARACTER_MEMORY_ENGINE_VERSION,
  type CharacterMemoryPackage,
  type SceneCharacterMemory,
} from "./types.js";

export interface RunCharacterMemoryInput {
  contentPackage: ContentPackage;
  intents: ComposerSceneIntent[];
  director?: DirectorPackage | null;
  performance?: PerformanceDirectorPackage | null;
}

/** Kill-switch: AMYNEST_CHARACTER_MEMORY=0. Default on. */
export function isCharacterMemoryEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.AMYNEST_CHARACTER_MEMORY !== "0";
}

/**
 * Build chained character memory for every scene and score continuity.
 * Does not call providers. Does not modify frozen director/studio modules.
 */
export function runCharacterMemoryEngine(
  input: RunCharacterMemoryInput,
): CharacterMemoryPackage {
  const pkg = input.contentPackage;
  const raw = buildSceneMemoryChain({
    intents: input.intents,
    director: input.director,
    performance: input.performance,
  });

  const scenes: SceneCharacterMemory[] = [];
  for (let i = 0; i < raw.length; i++) {
    const gated = gateSceneMemory(raw[i]!, scenes[i - 1] ?? null);
    scenes.push(gated);
  }

  const scored = scoreMemoryContinuity(scenes);

  return {
    id: buildMemoryId(pkg),
    version: CHARACTER_MEMORY_ENGINE_VERSION,
    createdAt: new Date().toISOString(),
    title: pkg.title,
    objective: `Preserve one continuous film for "${pkg.title}" — every scene inherits the previous approved memory (pose, eyes, wardrobe, props, room, lighting, camera momentum, emotion). Official Character Bible + previous last-frame reference. No silent resets.`,
    scenes,
    scores: scored.scores,
    quality: {
      ok: scored.ok,
      summary: scored.summary,
      rejects: scored.rejects,
    },
  };
}

function buildMemoryId(pkg: ContentPackage): string {
  const digest = createHash("sha256")
    .update([pkg.topic.id, pkg.title, CHARACTER_MEMORY_ENGINE_VERSION].join("|"))
    .digest("hex")
    .slice(0, 12);
  return `cme_${pkg.topic.id}_${digest}`;
}

export { enrichPromptsWithCharacterMemory };

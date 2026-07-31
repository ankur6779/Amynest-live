/**
 * Story Memory Engine — plan-time entry (final additive creative layer).
 */

import { createHash } from "node:crypto";
import type { CharacterMemoryPackage } from "../character-memory-engine/types.js";
import type { ComposerSceneIntent } from "../scene-composer/types.js";
import type { ContentPackage } from "../types/content-package.js";
import { enrichPromptsWithStoryMemory } from "./format.js";
import { gateStoryScene, scoreStoryContinuity } from "./quality-gate.js";
import { buildStoryThread } from "./thread.js";
import {
  STORY_MEMORY_ENGINE_VERSION,
  type SceneStoryMemory,
  type StoryMemoryPackage,
} from "./types.js";

export interface RunStoryMemoryInput {
  contentPackage: ContentPackage;
  intents: ComposerSceneIntent[];
  characterMemory?: CharacterMemoryPackage | null;
}

/** Kill-switch: AMYNEST_STORY_MEMORY=0. Default on. */
export function isStoryMemoryEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.AMYNEST_STORY_MEMORY !== "0";
}

/**
 * Build continuous story memory for every scene and score narrative cohesion.
 * Does not call providers. Does not add a Director or new architecture.
 */
export function runStoryMemoryEngine(
  input: RunStoryMemoryInput,
): StoryMemoryPackage {
  const pkg = input.contentPackage;
  const raw = buildStoryThread({
    contentPackage: pkg,
    intents: input.intents,
    characterMemory: input.characterMemory,
  });

  const scenes: SceneStoryMemory[] = [];
  for (let i = 0; i < raw.length; i++) {
    scenes.push(gateStoryScene(raw[i]!, scenes[i - 1] ?? null));
  }

  const scored = scoreStoryContinuity(scenes);
  const throughline = [
    "Confused → Amy notices → Amy helps → Child succeeds → Celebration → Soft invite",
    `(${pkg.title})`,
  ].join(" ");

  return {
    id: buildStoryId(pkg),
    version: STORY_MEMORY_ENGINE_VERSION,
    createdAt: new Date().toISOString(),
    title: pkg.title,
    objective: `Tell one continuous emotional story for "${pkg.title}" — every scene remembers what just happened, why, the emotional promise, and what must happen next. Visual callbacks and character goals persist. CTA is the natural last page.`,
    emotionalThroughline: throughline,
    scenes,
    scores: scored.scores,
    quality: {
      ok: scored.ok,
      summary: scored.summary,
      rejects: scored.rejects,
    },
  };
}

function buildStoryId(pkg: ContentPackage): string {
  const digest = createHash("sha256")
    .update([pkg.topic.id, pkg.title, STORY_MEMORY_ENGINE_VERSION].join("|"))
    .digest("hex")
    .slice(0, 12);
  return `sme_${pkg.topic.id}_${digest}`;
}

export { enrichPromptsWithStoryMemory };

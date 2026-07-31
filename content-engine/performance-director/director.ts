/**
 * Performance Director v2.0 — additive acting layer.
 * Runs after AI Director 1.2.0, before/with scene prompt finalization.
 * Does not call providers. Does not change validators or render.
 */

import { createHash } from "node:crypto";
import type { DirectorBeatRole, DirectorPackage } from "../ai-director/types.js";
import type { BrandCharacterId } from "../brand/types.js";
import type { ComposerSceneIntent } from "../scene-composer/types.js";
import type { ContentPackage } from "../types/content-package.js";
import {
  castScenePerformance,
  charactersForPerformance,
  summarizeCastComplexity,
} from "./casting.js";
import { enrichPromptsWithPerformanceDirector } from "./format.js";
import { applyMicroActing } from "./micro-acting.js";
import {
  PERFORMANCE_DIRECTOR_VERSION,
  type PerformanceDirectorPackage,
  type ScenePerformancePlan,
} from "./types.js";

export interface DirectPerformancesInput {
  contentPackage: ContentPackage;
  intents: ComposerSceneIntent[];
  /** Optional AI Director package for continuity-aware acting. */
  director?: DirectorPackage | null;
}

export interface DirectPerformancesResult {
  performance: PerformanceDirectorPackage;
  /** Intents with expanded group casts (additive). */
  intents: ComposerSceneIntent[];
}

/** Kill-switch: AMYNEST_PERFORMANCE_DIRECTOR=0 disables. Default on. */
export function isPerformanceDirectorEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.AMYNEST_PERFORMANCE_DIRECTOR !== "0";
}

export function directPerformances(
  input: DirectPerformancesInput,
): DirectPerformancesResult {
  const pkg = input.contentPackage;
  const scenes: ScenePerformancePlan[] = input.intents.map((intent, index) => {
    const role = intent.role as DirectorBeatRole;
    const directed = input.director?.scenes[index];
    const sceneId = directed?.sceneId ?? `scene_${index + 1}_${intent.role}`;

    let plan = castScenePerformance({
      sceneId,
      index,
      role,
      narration: intent.narration || intent.caption || "",
      durationSeconds: intent.durationSeconds,
      existingCharacters: intent.characters,
    });

    // Align with AI Director listening beats only (not mentor/CTA speaking roles).
    const directorListening =
      directed?.continuityState.speechState === "listening" &&
      (role === "hook" ||
        role === "problem" ||
        role === "emotion" ||
        role === "bridge");
    if (directorListening) {
      if (plan.speaker !== "external-narration" && plan.speaker !== "none") {
        const cast = plan.cast.map((c) =>
          c.role === "speaking"
            ? {
                ...c,
                role: "listening" as const,
                beat: "Listening — mouth soft/closed; eyes alive (director speechState=listening)",
              }
            : c,
        );
        plan = {
          ...plan,
          speaker: "external-narration",
          lipSyncStrategy: "external-narration-reactions",
          cast,
          listeners: cast.filter((c) => c.role === "listening").map((c) => c.character),
          reactors: cast.filter((c) => c.role === "reacting").map((c) => c.character),
          movers: cast.filter((c) => c.role === "moving").map((c) => c.character),
          thinkers: cast.filter((c) => c.role === "thinking").map((c) => c.character),
          waiters: cast.filter((c) => c.role === "waiting").map((c) => c.character),
        };
      }
    }

    return applyMicroActing(plan, intent.durationSeconds);
  });

  const living = scenes.filter((s) => s.cast.length > 0);
  const groupSceneCount = living.filter((s) => s.groupScene).length;
  const groupSceneRatio =
    living.length === 0 ? 1 : groupSceneCount / living.length;
  const complexity = summarizeCastComplexity(scenes);

  const performance: PerformanceDirectorPackage = {
    id: buildPerformanceId(pkg),
    version: PERFORMANCE_DIRECTOR_VERSION,
    createdAt: new Date().toISOString(),
    title: pkg.title,
    filmActingObjective: `Direct simple cinematic performances for "${pkg.title}" — max complexity mix ~70% duo / ~20% solo / ~10% trio; one speaker + one listener; fewer characters per shot for higher facial/motion realism without extra API cost.`,
    scenes,
    groupSceneRatio,
    livingSceneCount: living.length,
    groupSceneCount,
    complexity: {
      soloRatio: complexity.soloRatio,
      duoRatio: complexity.duoRatio,
      trioRatio: complexity.trioRatio,
      avgCharactersPerShot: complexity.avgCharacters,
    },
    summary: `Performance package ready — avg ${complexity.avgCharacters.toFixed(2)} chars/shot; duo ${(complexity.duoRatio * 100).toFixed(0)}% · solo ${(complexity.soloRatio * 100).toFixed(0)}% · trio ${(complexity.trioRatio * 100).toFixed(0)}%.`,
  };

  const intents = applyPerformanceToIntents(input.intents, scenes);
  return { performance, intents };
}

export function applyPerformanceToIntents(
  intents: ComposerSceneIntent[],
  scenes: ScenePerformancePlan[],
): ComposerSceneIntent[] {
  return intents.map((intent, index) => {
    const plan = scenes[index];
    if (!plan || plan.cast.length === 0) return intent;
    // Replace cast — do not merge prior lists (keeps complexity caps).
    const characters = uniqueChars(charactersForPerformance(plan));
    return {
      ...intent,
      characters,
      goal: `${intent.goal} — perform ${plan.dominantEmotion} with ${plan.cast.map((c) => c.role).join("/")} (${characters.length}-character shot)`,
    };
  });
}

function uniqueChars(ids: BrandCharacterId[]): BrandCharacterId[] {
  const order: BrandCharacterId[] = ["amy-ai", "amy-girl", "amy-boy"];
  const set = new Set(ids);
  return order.filter((id) => set.has(id));
}

function buildPerformanceId(pkg: ContentPackage): string {
  const digest = createHash("sha256")
    .update([pkg.topic.id, pkg.title, PERFORMANCE_DIRECTOR_VERSION].join("|"))
    .digest("hex")
    .slice(0, 12);
  return `perf_${pkg.topic.id}_${digest}`;
}

export { enrichPromptsWithPerformanceDirector };

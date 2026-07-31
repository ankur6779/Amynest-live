/**
 * Character Performance Studio — main entry.
 * Additive after Performance Director. Prompt craft only.
 */

import { createHash } from "node:crypto";
import type { DirectorBeatRole } from "../ai-director/types.js";
import type { BrandCharacterId } from "../brand/types.js";
import { complexityTierForRole } from "../performance-director/casting.js";
import type { PerformanceDirectorPackage } from "../performance-director/types.js";
import type { ComposerSceneIntent } from "../scene-composer/types.js";
import type { ContentPackage } from "../types/content-package.js";
import { enrichPromptsWithCharacterStudio } from "./format.js";
import { buildCharacterBrief } from "./intentions.js";
import { gateStudioScene, summarizeStudioQuality } from "./quality-gate.js";
import {
  NO_AD_MODE,
  pickFraming,
  shotDensityNote,
  visualRhythmNote,
} from "./rhythm.js";
import {
  CHARACTER_PERFORMANCE_STUDIO_VERSION,
  type CharacterPerformanceStudioPackage,
  type StudioFraming,
  type StudioScenePlan,
} from "./types.js";

export interface RunCharacterStudioInput {
  contentPackage: ContentPackage;
  intents: ComposerSceneIntent[];
  performance?: PerformanceDirectorPackage | null;
}

/** Kill-switch: AMYNEST_CHARACTER_STUDIO=0. Default on. */
export function isCharacterStudioEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.AMYNEST_CHARACTER_STUDIO !== "0";
}

export function runCharacterPerformanceStudio(
  input: RunCharacterStudioInput,
): CharacterPerformanceStudioPackage {
  const pkg = input.contentPackage;
  let previousFraming: StudioFraming | null = null;

  const scenes: StudioScenePlan[] = input.intents.map((intent, index) => {
    const role = intent.role as DirectorBeatRole;
    const perf = input.performance?.scenes[index];
    const sceneId = perf?.sceneId ?? `scene_${index + 1}_${intent.role}`;
    const speaker = perf?.speaker ?? "external-narration";

    let characters = uniqueChars(
      perf?.cast.map((c) => c.character) ?? intent.characters,
    );

    // Cap cast to scene complexity tier — never inflate solos into trios.
    if (role !== "end-card") {
      characters = capCastForComplexity(characters, role);
    }

    const framing = pickFraming(role, index, previousFraming);
    const briefs =
      role === "end-card"
        ? []
        : characters.map((character) =>
            buildCharacterBrief({
              character,
              role,
              speaker: String(speaker),
              partners: characters,
            }),
          );

    const dominantFaceStory =
      briefs[0]?.face.join(" → ") ??
      "Brand calm smile — feeling already earned";

    let scene: StudioScenePlan = {
      sceneId,
      index,
      briefs,
      framing,
      previousFraming,
      shotDensityNote: shotDensityNote(intent.durationSeconds),
      noAdModeNote: NO_AD_MODE,
      visualRhythmNote: visualRhythmNote(framing, previousFraming),
      dominantFaceStory: `Lead face journey: ${dominantFaceStory}`,
      ok: true,
      rejects: [],
    };

    scene = gateStudioScene(scene);
    // Auto-heal repeated framing (deterministic re-pick)
    if (scene.rejects.some((r) => r.code === "repeated-framing")) {
      const healedFraming = pickFraming(role, index + 3, previousFraming);
      scene = gateStudioScene({
        ...scene,
        framing: healedFraming,
        visualRhythmNote: visualRhythmNote(healedFraming, previousFraming),
        rejects: [],
        ok: true,
      });
    }

    previousFraming = scene.framing;
    return scene;
  });

  const quality = summarizeStudioQuality(scenes);

  return {
    id: buildStudioId(pkg),
    version: CHARACTER_PERFORMANCE_STUDIO_VERSION,
    createdAt: new Date().toISOString(),
    title: pkg.title,
    objective: `Direct professionally animated characters for "${pkg.title}" — intention-driven acting, face/eye-led emotion, believable child energy, mentor Amy (not mascot), no-ad solve-first feeling. Prompt-only; no API cost increase.`,
    scenes,
    quality,
  };
}

/**
 * Scene complexity: solo ≤1 · duo ≤2 · trio ≤3 (celebration only).
 * Prefer Performance Director cast; fill only to the tier minimum.
 */
function capCastForComplexity(
  characters: BrandCharacterId[],
  role: DirectorBeatRole,
): BrandCharacterId[] {
  const tier = complexityTierForRole(role);
  if (tier === "solo") {
    const one = uniqueChars(characters).slice(0, 1);
    if (one.length === 1) return one;
    return role === "bridge" ? ["amy-boy"] : ["amy-girl"];
  }
  if (tier === "trio") {
    const base = uniqueChars(characters);
    if (base.length >= 3) return base.slice(0, 3);
    return uniqueChars([...base, "amy-ai", "amy-girl", "amy-boy"]).slice(0, 3);
  }
  // duo
  const base = uniqueChars(characters).slice(0, 2);
  if (base.length >= 2) return base;
  if (base[0] === "amy-boy") return ["amy-ai", "amy-boy"];
  return uniqueChars([...base, "amy-ai", "amy-girl"]).slice(0, 2);
}

function uniqueChars(ids: BrandCharacterId[]): BrandCharacterId[] {
  const order: BrandCharacterId[] = ["amy-ai", "amy-girl", "amy-boy"];
  const set = new Set(ids);
  return order.filter((id) => set.has(id));
}

function buildStudioId(pkg: ContentPackage): string {
  const digest = createHash("sha256")
    .update([pkg.topic.id, pkg.title, CHARACTER_PERFORMANCE_STUDIO_VERSION].join("|"))
    .digest("hex")
    .slice(0, 12);
  return `cps_${pkg.topic.id}_${digest}`;
}

export { enrichPromptsWithCharacterStudio };

/**
 * AI Director — converts approved script intents into a directed short-film plan.
 * Additive orchestration: AFTER golden/script approval, BEFORE scene generation.
 */

import { createHash } from "node:crypto";
import type { ContentPackage } from "../types/content-package.js";
import type { TransitionType } from "../types/storyboard.js";
import { sceneIdFor } from "../scene-composer/prompts.js";
import type { ComposerSceneIntent } from "../scene-composer/types.js";
import {
  buildVisualContinuityBible,
  continuityNotesForScene,
} from "./continuity.js";
import { buildEmotionMap } from "./emotion-map.js";
import { enrichPromptsWithDirector } from "./format.js";
import { pacingForRole, planLightingForScene } from "./lighting.js";
import { selectMicroActions } from "./micro-actions.js";
import { gateDirectorPackage } from "./quality.js";
import { selectShotForIntent } from "./shot-language.js";
import {
  AI_DIRECTOR_VERSION,
  type DirectedScenePlan,
  type DirectorBeatRole,
  type DirectorPackage,
} from "./types.js";

export interface DirectProductionInput {
  contentPackage: ContentPackage;
  intents: ComposerSceneIntent[];
}

export interface DirectProductionResult {
  /** Intents with director-chosen camera + emotion applied. */
  intents: ComposerSceneIntent[];
  director: DirectorPackage;
}

/** Env kill-switch — set AMYNEST_AI_DIRECTOR=0 to skip. */
export function isAiDirectorEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.AMYNEST_AI_DIRECTOR !== "0";
}

/**
 * Direct an approved production plan.
 * Does not call video providers — produces a Director Package + enriched intents.
 */
export function directProductionScenes(
  input: DirectProductionInput,
): DirectProductionResult {
  const pkg = input.contentPackage;
  const emotionMap = buildEmotionMap(input.intents);
  const continuity = buildVisualContinuityBible({
    category: pkg.topic.category,
    intents: input.intents,
  });

  const roleCounts = new Map<DirectorBeatRole, number>();
  const scenes: DirectedScenePlan[] = input.intents.map((intent, index) => {
    const role = intent.role as DirectorBeatRole;
    const occurrence = roleCounts.get(role) ?? 0;
    roleCounts.set(role, occurrence + 1);

    const sceneId = sceneIdFor(intent, index);
    const emotion = emotionMap[index]!;
    const camera = selectShotForIntent({
      role,
      roleOccurrence: occurrence,
      category: pkg.topic.category,
    });
    const lighting = planLightingForScene({
      role,
      category: pkg.topic.category,
    });
    const pacing = pacingForRole(role);
    const microActions = selectMicroActions({
      role,
      targetEmotion: emotion.targetEmotion,
      sceneIndex: index,
      count: role === "end-card" ? 2 : 3,
    });

    const wardrobeLock = continuity.wardrobe;
    const blocking = {
      characters: intent.characters,
      positions: blockingForRole(role, occurrence),
      wardrobeLock,
      objectPlacement: continuity.objectPlacement,
    };

    return {
      sceneId,
      index,
      role,
      objective: sceneObjective(intent, emotion.targetEmotion),
      camera,
      lighting,
      blocking,
      emotion,
      pacing,
      microActions,
      motionPlan: motionLine(camera.movement, microActions[0]!),
      timingSeconds: intent.durationSeconds,
      continuityNotes: continuityNotesForScene(
        continuity,
        index,
        input.intents.length,
      ),
      transitionOut: transitionFor(
        role,
        input.intents[index + 1]?.role as DirectorBeatRole | undefined,
      ),
    };
  });

  // Auto-heal anti-patterns before quality gate (still deterministic).
  for (const scene of scenes) {
    if (scene.role !== "end-card" && scene.microActions.length === 0) {
      scene.microActions = selectMicroActions({
        role: scene.role,
        targetEmotion: scene.emotion.targetEmotion,
        sceneIndex: scene.index,
        count: 2,
      });
    }
  }

  const quality = gateDirectorPackage({ scenes, continuity });

  // If gate fails on slideshow/static only, heal by ensuring micro-actions + shot variety.
  if (!quality.ok) {
    healNonCinematic(scenes);
  }
  const qualityFinal = gateDirectorPackage({ scenes, continuity });

  const director: DirectorPackage = {
    id: buildDirectorId(pkg),
    version: AI_DIRECTOR_VERSION,
    createdAt: new Date().toISOString(),
    title: pkg.title,
    category: pkg.topic.category,
    filmObjective: buildFilmObjective(pkg),
    emotionMap,
    scenes,
    cameraPlanSummary: scenes.map(
      (s) =>
        `${s.sceneId}: ${s.camera.shotType} / ${s.camera.movement} / ${s.camera.shotSize}`,
    ),
    lightingPlanSummary: scenes.map(
      (s) =>
        `${s.sceneId}: ${s.lighting.mood} (${s.lighting.colorTemperature}) — ${s.lighting.notes}`,
    ),
    motionPlanSummary: scenes.map((s) => `${s.sceneId}: ${s.motionPlan}`),
    transitionPlan: scenes.slice(0, -1).map((s, i) => ({
      fromSceneId: s.sceneId,
      toSceneId: scenes[i + 1]!.sceneId,
      type: s.transitionOut.type,
      note: s.transitionOut.note,
    })),
    timing: scenes.map((s) => ({
      sceneId: s.sceneId,
      seconds: s.timingSeconds,
      pacing: s.pacing,
    })),
    visualContinuity: continuity,
    quality: qualityFinal,
  };

  const intents = applyDirectorToIntents(input.intents, scenes);
  return { intents, director };
}

export function applyDirectorToIntents(
  intents: ComposerSceneIntent[],
  scenes: DirectedScenePlan[],
): ComposerSceneIntent[] {
  return intents.map((intent, index) => {
    const directed = scenes[index];
    if (!directed) return intent;
    return {
      ...intent,
      camera: directed.camera.composerCamera,
      emotion: directed.emotion.composerEmotion,
      goal: directed.objective,
    };
  });
}

export { enrichPromptsWithDirector };

function buildFilmObjective(pkg: ContentPackage): string {
  return `Direct a premium Pixar-inspired AmyNest short about "${pkg.title}" — emotion and visual story first, product only after hope is earned, cinematic not slideshow.`;
}

function sceneObjective(
  intent: ComposerSceneIntent,
  emotion: string,
): string {
  return `${intent.goal} — land "${emotion}" with cinematic clarity (muted-readable).`;
}

function blockingForRole(role: DirectorBeatRole, occurrence: number): string {
  switch (role) {
    case "hook":
      return occurrence === 0
        ? "Parent mid-frame; child slightly camera-right; window camera-left"
        : "Hold established blocking; tighten on reaction";
    case "problem":
      return "Parent left, child right at the table; struggle props between them";
    case "emotion":
      return "Close framing; faces share the vertical; props soft in background";
    case "feature":
      return "Amy AI guide enters established space; UI appears as held/nearby prop";
    case "transformation":
      return "Open the frame: parent-child closer; same room, more breath";
    case "cta":
      return "Amy AI centered-warm; family soft in depth";
    case "end-card":
      return "Centered end card; no character wardrobe redesign";
    case "bridge":
      return "Preserve previous blocking; ease toward next beat";
  }
}

function motionLine(movement: string, firstAction: string): string {
  return `${movement.replace(/-/g, " ")} while ${firstAction.toLowerCase()}`;
}

function transitionFor(
  from: DirectorBeatRole,
  to: DirectorBeatRole | undefined,
): { type: TransitionType; note: string } {
  if (!to) {
    return { type: "Fade", note: "Settle into final hold" };
  }
  if (from === "cta" && to === "end-card") {
    return { type: "Fade", note: "Soft brand wash into official end card" };
  }
  if (from === "emotion" && to === "feature") {
    return {
      type: "Dissolve",
      note: "Hope dissolves into the guide reveal — never a hard product slam",
    };
  }
  if (from === "hook" || from === "problem") {
    return { type: "Crossfade", note: "Emotional continuity across the struggle" };
  }
  if (from === "transformation") {
    return { type: "Dissolve", note: "Celebration eases into soft CTA" };
  }
  return { type: "Crossfade", note: "Seamless cinematic handoff" };
}

function healNonCinematic(scenes: DirectedScenePlan[]): void {
  for (const scene of scenes) {
    if (scene.role === "end-card") continue;
    if (scene.microActions.length < 2) {
      scene.microActions = selectMicroActions({
        role: scene.role,
        targetEmotion: scene.emotion.targetEmotion,
        sceneIndex: scene.index + 3,
        count: 3,
      });
    }
  }
}

function buildDirectorId(pkg: ContentPackage): string {
  const digest = createHash("sha256")
    .update([pkg.topic.id, pkg.title, AI_DIRECTOR_VERSION].join("|"))
    .digest("hex")
    .slice(0, 12);
  return `dir_${pkg.topic.id}_${digest}`;
}

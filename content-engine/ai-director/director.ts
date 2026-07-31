/**
 * AI Director — converts approved script intents into a directed short-film plan.
 * Additive orchestration: AFTER golden/script approval, BEFORE scene generation.
 * Pixar continuity spine: one continuous scene across cuts (direction-only).
 */

import { createHash } from "node:crypto";
import type { ContentPackage } from "../types/content-package.js";
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
import {
  buildCutBridge,
  buildSceneContinuityState,
  continuityPromptBlock,
  enrichBibleWithSpine,
  toEditorTransition,
} from "./scene-continuity.js";
import { selectShotForIntent } from "./shot-language.js";
import {
  AI_DIRECTOR_VERSION,
  type DirectedScenePlan,
  type DirectorBeatRole,
  type DirectorPackage,
  type SceneContinuityState,
  type SceneCutBridge,
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
  const continuity = enrichBibleWithSpine(
    buildVisualContinuityBible({
      category: pkg.topic.category,
      intents: input.intents,
    }),
  );

  const roleCounts = new Map<DirectorBeatRole, number>();
  let previousState: SceneContinuityState | undefined;
  const draftScenes: Array<{
    scene: Omit<DirectedScenePlan, "cutIn" | "cutOut" | "transitionOut" | "continuityNotes"> & {
      continuityNotes: string[];
    };
    state: SceneContinuityState;
  }> = [];

  for (let index = 0; index < input.intents.length; index++) {
    const intent = input.intents[index]!;
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

    const state = buildSceneContinuityState({
      role,
      index,
      lightingKey: lighting.keyLight,
      cameraMovement: camera.movement,
      emotionLabel: emotion.targetEmotion,
      previous: previousState,
    });
    previousState = state;

    const wardrobeLock = continuity.wardrobe;
    const blocking = {
      characters: intent.characters,
      positions: state.characterPosition,
      wardrobeLock,
      objectPlacement: state.objectPlacement,
    };

    draftScenes.push({
      state,
      scene: {
        sceneId,
        index,
        role,
        objective: sceneObjective(intent, emotion.emotionArc, emotion.targetEmotion),
        camera,
        lighting,
        blocking,
        emotion,
        pacing,
        microActions,
        motionPlan: motionLine(
          camera.movement,
          state.movementSpeed,
          state.cameraMomentum,
          microActions[0]!,
        ),
        timingSeconds: intent.durationSeconds,
        continuityNotes: [],
        continuityState: state,
      },
    });
  }

  // Second pass: cut bridges + continuity prompt notes (needs neighbor states).
  const scenes: DirectedScenePlan[] = draftScenes.map((entry, index) => {
    const next = draftScenes[index + 1];
    const prev = draftScenes[index - 1];
    const cutOut = buildCutBridge({
      fromRole: entry.scene.role,
      toRole: next?.scene.role,
      fromState: entry.state,
      toState: next?.state,
    });
    const cutIn: SceneCutBridge | undefined = prev
      ? buildCutBridge({
          fromRole: prev.scene.role,
          toRole: entry.scene.role,
          fromState: prev.state,
          toState: entry.state,
        })
      : undefined;

    const continuityNotes = [
      ...continuityNotesForScene(continuity, index, draftScenes.length),
      ...continuityPromptBlock(entry.state, cutIn, cutOut),
    ];

    return {
      ...entry.scene,
      continuityNotes,
      cutIn,
      cutOut,
      transitionOut: {
        type: toEditorTransition(cutOut.kind),
        note: cutOut.note,
      },
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
        `${s.sceneId}: ${s.camera.shotType} / ${s.camera.movement} / ${s.continuityState.cameraMomentum}`,
    ),
    lightingPlanSummary: scenes.map(
      (s) =>
        `${s.sceneId}: ${s.lighting.mood} — ${s.continuityState.lightingDirection}`,
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
  return `Direct "${pkg.title}" as ONE continuous Pixar-style family short — match cuts, eyeline/action/motivated cuts, locked geography/props/lighting, emotion arc Curious→Thinking→Understanding→Success→Celebration, Amy mentors inside the story; never disconnected AI shots.`;
}

function sceneObjective(
  intent: ComposerSceneIntent,
  arc: string,
  emotion: string,
): string {
  return `${intent.goal} — arc "${arc}" / "${emotion}" with match-cut continuity (muted-readable).`;
}

function motionLine(
  movement: string,
  speed: string,
  momentum: string,
  firstAction: string,
): string {
  return `${movement.replace(/-/g, " ")} at ${speed} speed (momentum: ${momentum}) while ${firstAction.toLowerCase()} — continue prior motion vector; never reset camera`;
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

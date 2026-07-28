/**
 * Thin adapter — map Scene Composer output onto existing ScenePlan[] for StoryboardPlanner.
 * Does not add workflow phases.
 */

import { planAssetRequirements } from "../assets/planner.js";
import type { ContentPackage } from "../types/content-package.js";
import type { ScenePlan, SupportedDuration } from "../types/storyboard.js";
import { composeProductionScenes } from "./compose.js";
import type { SceneComposerPackage, VideoClipProviderId } from "./types.js";

export interface EnhanceScenesResult {
  scenes: ScenePlan[];
  composer: SceneComposerPackage;
}

/** Build production-grade multi-scene plans from a ContentPackage. */
export function composeScenesForStoryboard(input: {
  contentPackage: ContentPackage;
  duration: SupportedDuration;
  providerId?: VideoClipProviderId | string;
}): EnhanceScenesResult {
  const composer = composeProductionScenes({
    contentPackage: input.contentPackage,
    duration: input.duration,
    provider: input.providerId,
  });

  const scenes: ScenePlan[] = composer.scenes.map((scene) => {
    const clip = composer.timeline.clips.find((c) => c.sceneId === scene.sceneId);
    const transition =
      composer.transitions.find((t) => t.fromSceneId === scene.sceneId)?.type ??
      (scene.intent.role === "hook" ? "Fade" : "Crossfade");

    return {
      sceneId: scene.sceneId,
      purpose: scene.intent.storyboardPurpose,
      visualType: scene.intent.visualType,
      background:
        scene.intent.role === "end-card"
          ? "brand-gradient-purple"
          : scene.intent.role === "feature"
            ? "amynest-app-canvas"
            : "warm-family-bg",
      camera: scene.intent.camera,
      transition,
      caption: scene.intent.caption,
      voice: scene.intent.narration,
      animation:
        scene.intent.role === "cta" || scene.intent.role === "end-card"
          ? "Pulse"
          : "Fade",
      priority: priorityForRole(scene.intent.role),
      emotion: scene.intent.emotion,
      duration: clip?.duration ?? scene.intent.durationSeconds,
      assetRequirements: planAssetRequirements({
        sceneId: scene.sceneId,
        purpose: scene.intent.storyboardPurpose,
        visualType: scene.intent.visualType,
        topicTitle: input.contentPackage.topic.title,
        category: input.contentPackage.topic.category,
        caption: scene.intent.caption,
        priority: priorityForRole(scene.intent.role),
      }).map((req) => ({
        ...req,
        // Embed composer prompt into videoPrompt for Veo / future providers
        videoPrompt: [
          scene.prompt.systemBrandBlock,
          scene.prompt.userPrompt,
          `NEGATIVE: ${scene.prompt.negativePrompt}`,
        ].join("\n\n"),
        imagePrompt: scene.prompt.userPrompt.slice(0, 500),
      })),
    };
  });

  return { scenes, composer };
}

function priorityForRole(role: string): number {
  switch (role) {
    case "hook":
      return 10;
    case "problem":
      return 8;
    case "emotion":
      return 8;
    case "feature":
      return 9;
    case "transformation":
      return 8;
    case "cta":
      return 7;
    case "end-card":
      return 6;
    default:
      return 5;
  }
}

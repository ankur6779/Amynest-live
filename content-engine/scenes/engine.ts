import {
  buildBrandSceneBlueprints,
  discoverAmyNestFeatures,
  selectFeatureForTopic,
} from "../brand/index.js";
import type { ContentPackage } from "../types/content-package.js";
import type {
  SceneEmotion,
  ScenePlan,
  ScenePurpose,
  SupportedDuration,
  VisualType,
} from "../types/storyboard.js";
import { planAssetRequirements } from "../assets/planner.js";
import { findRepoRootQuiet } from "../brand/repo-root.js";

export interface SceneBlueprint {
  purpose: ScenePurpose;
  caption: string;
  voice: string;
  emotion: SceneEmotion;
  priority: number;
  visualType: VisualType;
}

/**
 * Derive scene blueprints from a ContentPackage using the mandatory
 * AmyNest Brand Identity 5-beat structure (+ branded end card).
 */
export function buildSceneBlueprints(
  pkg: ContentPackage,
  duration: SupportedDuration,
): SceneBlueprint[] {
  const repoRoot = findRepoRootQuiet();
  const features = discoverAmyNestFeatures({ repoRoot, maxFeatures: 100 });
  const feature = selectFeatureForTopic(features, {
    id: pkg.topic.id,
    title: pkg.title,
    category: pkg.topic.category,
    keywords: pkg.topic.keywords,
  });
  return buildBrandSceneBlueprints(pkg, duration, feature).blueprints;
}

export function buildScenes(
  pkg: ContentPackage,
  duration: SupportedDuration,
): ScenePlan[] {
  const blueprints = buildSceneBlueprints(pkg, duration);
  return blueprints.map((blueprint, index) => {
    const sceneId = `scene-${String(index + 1).padStart(2, "0")}-${blueprint.purpose}`;
    const visualType = blueprint.visualType;
    return {
      sceneId,
      purpose: blueprint.purpose,
      visualType,
      background: backgroundFor(visualType, pkg.topic.category),
      camera: "Static",
      transition: index === 0 ? "Fade" : brandTransition(index),
      caption: blueprint.caption,
      voice: blueprint.voice,
      animation: blueprint.purpose === "cta" || blueprint.purpose === "brand-end" ? "Pulse" : "Fade",
      priority: blueprint.priority,
      emotion: blueprint.emotion,
      duration: 0, // filled by timeline engine
      assetRequirements: planAssetRequirements({
        sceneId,
        purpose: blueprint.purpose,
        visualType,
        topicTitle: pkg.topic.title,
        category: pkg.topic.category,
        caption: blueprint.caption,
        priority: blueprint.priority,
      }),
    };
  });
}

function brandTransition(index: number): ScenePlan["transition"] {
  const cycle = ["Fade", "Crossfade", "Dissolve", "Fade"] as const;
  return cycle[index % cycle.length]!;
}

function backgroundFor(visualType: VisualType, category: string): string {
  switch (visualType) {
    case "Gradient Background":
      return "brand-gradient-purple";
    case "Motion Background":
      return "soft-particle-motion";
    case "App Screen":
      return "amynest-app-canvas";
    case "Screen Recording":
      return "device-frame-portrait";
    default:
      return category === "Amy Astro" ? "night-sky-soft" : "warm-family-bg";
  }
}

import type { ContentPackage } from "../types/content-package.js";
import type {
  SceneEmotion,
  ScenePlan,
  ScenePurpose,
  SupportedDuration,
  VisualType,
} from "../types/storyboard.js";
import { planAssetRequirements } from "../assets/planner.js";

export interface SceneBlueprint {
  purpose: ScenePurpose;
  caption: string;
  voice: string;
  emotion: SceneEmotion;
  priority: number;
  visualType: VisualType;
}

/**
 * Derive deterministic scene blueprints from a ContentPackage.
 * Scene count scales with duration budget (15 / 20 / 30).
 */
export function buildSceneBlueprints(
  pkg: ContentPackage,
  duration: SupportedDuration,
): SceneBlueprint[] {
  const keyPoints = pkg.keyPoints.slice(0, duration === 15 ? 1 : duration === 20 ? 2 : 3);
  const blueprints: SceneBlueprint[] = [
    {
      purpose: "hook",
      caption: pkg.hook,
      voice: firstSentence(pkg.voiceScript) || pkg.hook,
      emotion: "curious",
      priority: 10,
      visualType: visualForCategory(pkg.topic.category, "hook"),
    },
    {
      purpose: "opening-question",
      caption: pkg.openingQuestion,
      voice: pkg.openingQuestion,
      emotion: "warm",
      priority: 8,
      visualType: "Illustration",
    },
  ];

  if (duration >= 20) {
    blueprints.push({
      purpose: "story",
      caption: truncate(pkg.story, 90),
      voice: truncate(pkg.story, 140),
      emotion: "calm",
      priority: 7,
      visualType: visualForCategory(pkg.topic.category, "story"),
    });
  }

  keyPoints.forEach((point, index) => {
    blueprints.push({
      purpose: "key-point",
      caption: point,
      voice: point,
      emotion: index === 0 ? "energized" : "hopeful",
      priority: 9 - index,
      visualType: index % 2 === 0 ? "App Screen" : "Icon Animation",
    });
  });

  blueprints.push({
    purpose: "cta",
    caption: pkg.cta,
    voice: pkg.cta,
    emotion: "confident",
    priority: 10,
    visualType: "Promo Image",
  });

  if (duration === 30) {
    blueprints.push({
      purpose: "brand-end",
      caption: "AmyNest AI",
      voice: "Try AmyNest AI today.",
      emotion: "hopeful",
      priority: 6,
      visualType: "Gradient Background",
    });
  }

  return blueprints;
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
      transition: index === 0 ? "Fade" : "Cut",
      caption: blueprint.caption,
      voice: blueprint.voice,
      animation: blueprint.purpose === "cta" ? "Pulse" : "Fade",
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

function visualForCategory(
  category: string,
  role: "hook" | "story",
): VisualType {
  if (category === "Amy Astro") {
    return role === "hook" ? "Motion Background" : "AI Image";
  }
  if (category === "Speech" || category === "Learning" || category === "Games") {
    return role === "hook" ? "App Screen" : "Screen Recording";
  }
  if (category === "Daily Motivation") return "Gradient Background";
  return role === "hook" ? "Promo Image" : "Illustration";
}

function backgroundFor(visualType: VisualType, category: string): string {
  switch (visualType) {
    case "Gradient Background":
      return "brand-gradient-cosmic";
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

function firstSentence(text: string): string {
  const match = /.*?[.!?]/.exec(text.trim());
  return (match?.[0] ?? text).trim();
}

function truncate(text: string, max: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

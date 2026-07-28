import { getBrandIdentityKit, pickBrandCtaLine } from "./identity.js";
import { selectBrandCharacters } from "./characters.js";
import type { DiscoveredFeature } from "./types.js";
import type { ContentPackage } from "../types/content-package.js";
import type {
  SceneEmotion,
  ScenePurpose,
  SupportedDuration,
  VisualType,
} from "../types/storyboard.js";

/** Mirrors scene engine blueprints without importing scenes (avoids cycles). */
export interface BrandSceneBlueprint {
  purpose: ScenePurpose;
  caption: string;
  voice: string;
  emotion: SceneEmotion;
  priority: number;
  visualType: VisualType;
}

export interface BrandScenePlanResult {
  blueprints: BrandSceneBlueprint[];
  primaryCharacter: ReturnType<typeof selectBrandCharacters>["primary"];
  supportingCharacters: ReturnType<typeof selectBrandCharacters>["supporting"];
  feature?: DiscoveredFeature;
  ctaLine: string;
}

/**
 * Force every Short into the mandatory AmyNest 5-beat brand structure,
 * then append the official brand-end card beat.
 */
export function buildBrandSceneBlueprints(
  pkg: ContentPackage,
  duration: SupportedDuration,
  feature?: DiscoveredFeature,
): BrandScenePlanResult {
  const casting = selectBrandCharacters({
    category: pkg.topic.category,
    title: pkg.title,
    keywords: pkg.topic.keywords,
    feature,
  });
  const ctaLine = pickBrandCtaLine(pkg.topic.id || pkg.title);
  const featureLabel = feature?.title ?? pkg.topic.category;
  const kit = getBrandIdentityKit();

  // Mandatory story format: Hook → Problem → AmyNest Solution → Benefit → Download CTA
  const blueprints: BrandSceneBlueprint[] = [
    {
      purpose: "hook",
      caption: pkg.hook,
      voice: firstSentence(pkg.voiceScript) || pkg.hook,
      emotion: "curious",
      priority: 10,
      visualType: "Promo Image",
    },
    {
      purpose: "opening-question",
      caption: pkg.openingQuestion || `Parents — what if ${featureLabel} felt easier today?`,
      voice: `${kit.characters["amy-ai"].displayName} here. Many families struggle with this — let's look at the real problem.`,
      emotion: "warm",
      priority: 9,
      visualType: "Illustration",
    },
    {
      purpose: "story",
      caption: truncate(
        `AmyNest solution: ${featureLabel} — ${firstSentence(pkg.story) || pkg.story}`,
        90,
      ),
      voice: truncate(
        `AmyNest solves this with ${featureLabel}. ${pkg.story || pkg.sceneScript}`,
        160,
      ),
      emotion: "energized",
      priority: 8,
      visualType: visualForFeature(feature?.pillar ?? casting.pillar),
    },
    {
      purpose: "key-point",
      caption:
        pkg.keyPoints[0] ||
        "Parents feel more confident when progress is visible every day.",
      voice:
        pkg.keyPoints[0] ||
        "The benefit: calmer routines, clearer progress, and more confident parenting.",
      emotion: "hopeful",
      priority: 8,
      visualType: "Illustration",
    },
    {
      purpose: "cta",
      caption: ctaLine,
      voice: `${ctaLine}. ${kit.endCard.availableOnLine}.`,
      emotion: "confident",
      priority: 10,
      visualType: "Promo Image",
    },
    {
      purpose: "brand-end",
      caption: kit.endCard.downloadLine,
      voice: `${kit.endCard.downloadLine}. ${kit.websiteUrl}`,
      emotion: "hopeful",
      priority: 10,
      visualType: "Gradient Background",
    },
  ];

  // For longer formats, keep an extra key point without breaking the brand spine.
  if (duration >= 20 && pkg.keyPoints[1]) {
    blueprints.splice(4, 0, {
      purpose: "key-point",
      caption: pkg.keyPoints[1],
      voice: pkg.keyPoints[1],
      emotion: "calm",
      priority: 7,
      visualType: "Icon Animation",
    });
  }

  void duration;
  return {
    blueprints,
    primaryCharacter: casting.primary,
    supportingCharacters: casting.supporting,
    feature,
    ctaLine,
  };
}

function visualForFeature(pillar: string): VisualType {
  if (pillar === "astro") return "AI Image";
  if (pillar === "speech" || pillar === "learning" || pillar === "games") {
    return "App Screen";
  }
  if (pillar === "routine") return "Screen Recording";
  return "Illustration";
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

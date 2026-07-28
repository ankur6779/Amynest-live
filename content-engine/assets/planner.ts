import type {
  AssetRequirement,
  ScenePurpose,
  VisualType,
} from "../types/storyboard.js";

export interface AssetPlanInput {
  sceneId: string;
  purpose: ScenePurpose;
  visualType: VisualType;
  topicTitle: string;
  category: string;
  caption: string;
  priority: number;
}

/** Describe required assets for a scene — never generate binary media. */
export function planAssetRequirements(input: AssetPlanInput): AssetRequirement[] {
  const assetId = `${input.sceneId}-asset-01`;
  const imagePrompt = buildImagePrompt(input);
  const videoPrompt = buildVideoPrompt(input);
  const screenRecordingTemplate = buildScreenTemplate(input);

  return [
    {
      assetId,
      sceneId: input.sceneId,
      requiredAssetType: input.visualType,
      imagePrompt,
      videoPrompt,
      screenRecordingTemplate,
      fallbackAsset: fallbackFor(input.visualType),
      priority: input.priority,
    },
  ];
}

export function collectAssets(scenes: { assetRequirements: AssetRequirement[] }[]): AssetRequirement[] {
  const assets: AssetRequirement[] = [];
  const seen = new Set<string>();
  for (const scene of scenes) {
    for (const asset of scene.assetRequirements) {
      if (seen.has(asset.assetId)) continue;
      seen.add(asset.assetId);
      assets.push(asset);
    }
  }
  return assets;
}

function buildImagePrompt(input: AssetPlanInput): string {
  return [
    `AmyNest ${input.category} visual for "${input.topicTitle}"`,
    `scene purpose: ${input.purpose}`,
    `mood: warm, premium, family-safe`,
    `on-screen idea: ${truncate(input.caption, 80)}`,
    `style: soft cinematic illustration, no text overload`,
  ].join(" | ");
}

function buildVideoPrompt(input: AssetPlanInput): string {
  if (
    input.visualType !== "Future AI Video" &&
    input.visualType !== "Motion Background" &&
    input.visualType !== "Screen Recording"
  ) {
    return "";
  }
  return [
    `Short vertical clip for ${input.purpose}`,
    `topic: ${input.topicTitle}`,
    `gentle camera motion, no logos except AmyNest end card`,
  ].join(" | ");
}

function buildScreenTemplate(input: AssetPlanInput): string {
  if (input.visualType !== "App Screen" && input.visualType !== "Screen Recording") {
    return "";
  }
  if (input.purpose === "cta") return "template.amynest.endcard-download";
  if (input.category === "Speech") return "template.amynest.speech-coach-demo";
  if (input.category === "Amy Astro") return "template.amynest.astro-orb";
  if (input.category === "Routines") return "template.amynest.routine-timeline";
  return "template.amynest.generic-feature";
}

function fallbackFor(visualType: VisualType): string {
  switch (visualType) {
    case "App Screen":
    case "Screen Recording":
      return "asset.fallback.app-frame";
    case "Promo Image":
      return "asset.fallback.promo-poster";
    case "Gradient Background":
      return "asset.fallback.brand-gradient";
    case "AI Image":
      return "asset.fallback.astro-sky";
    case "Motion Background":
      return "asset.fallback.soft-motion";
    case "Icon Animation":
      return "asset.fallback.icon-pack";
    case "Future AI Video":
      return "asset.fallback.still-illustration";
    default:
      return "asset.fallback.illustration";
  }
}

function truncate(text: string, max: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

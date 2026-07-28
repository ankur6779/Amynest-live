import type { AssetPackage } from "../../types/asset-package.js";
import type { StoryboardPackage, VisualType } from "../../types/storyboard.js";
import type {
  CompositionPlan,
  FrameTimeline,
  TransitionSpec,
  VisualLayer,
  VisualSourceKind,
} from "../../types/render-package.js";
import { parseResolution } from "../../asset-engine/planner/geometry.js";
import type { AudioMixPlan } from "../../types/render-package.js";
import type { SubtitlePlan } from "../../types/render-package.js";
import type { WatermarkSpec } from "../../types/render-package.js";

export function composeVisualLayers(
  storyboard: StoryboardPackage,
  assets: AssetPackage,
  timeline: FrameTimeline,
): VisualLayer[] {
  const assetByScene = new Map<string, (typeof assets.resolvedAssets)[number]>();
  for (const asset of assets.resolvedAssets) {
    if (!assetByScene.has(asset.sceneId)) assetByScene.set(asset.sceneId, asset);
  }

  return timeline.clips.map((clip) => {
    const scene = storyboard.scenes.find((s) => s.sceneId === clip.sceneId);
    const asset = assetByScene.get(clip.sceneId);
    const sourceKind = mapVisualKind(scene?.visualType ?? "Gradient Background");
    return {
      sceneId: clip.sceneId,
      sourceKind,
      sourcePath: asset?.path ?? fallbackPath(sourceKind, scene?.background),
      assetId: asset?.assetId,
      color: sourceKind === "solid" ? "#0F2740" : undefined,
      gradient:
        sourceKind === "gradient"
          ? {
              from: storyboard.branding.colors.background,
              to: storyboard.branding.colors.primary,
            }
          : undefined,
      startFrame: clip.startFrame,
      endFrame: clip.endFrame,
    };
  });
}

export function buildCompositionPlan(input: {
  storyboard: StoryboardPackage;
  assets: AssetPackage;
  timeline: FrameTimeline;
  transitions: TransitionSpec[];
  subtitles: SubtitlePlan;
  audio: AudioMixPlan;
  watermark: WatermarkSpec;
  fps: number;
  bitrate: string;
  codec: CompositionPlan["codec"];
  audioCodec: CompositionPlan["audioCodec"];
  outputContainer: CompositionPlan["outputContainer"];
}): CompositionPlan {
  const { width, height } = parseResolution(input.storyboard.resolution);
  return {
    width,
    height,
    fps: input.fps,
    timeline: input.timeline,
    visuals: composeVisualLayers(input.storyboard, input.assets, input.timeline),
    transitions: input.transitions,
    subtitles: input.subtitles,
    audio: input.audio,
    watermark: input.watermark,
    outputContainer: input.outputContainer,
    codec: input.codec,
    audioCodec: input.audioCodec,
    bitrate: input.bitrate,
  };
}

function mapVisualKind(visualType: VisualType): VisualSourceKind {
  switch (visualType) {
    case "Screen Recording":
      return "screen-recording";
    case "Future AI Video":
    case "Motion Background":
      return visualType === "Motion Background" ? "motion-background" : "video";
    case "Gradient Background":
      return "gradient";
    case "Promo Image":
    case "App Screen":
    case "Illustration":
    case "AI Image":
    case "Icon Animation":
      return "image";
    default:
      return "solid";
  }
}

function fallbackPath(kind: VisualSourceKind, background?: string): string {
  if (kind === "gradient") return `gradient://${background ?? "brand-gradient"}`;
  if (kind === "solid") return "solid://#0F2740";
  if (kind === "motion-background") return "lavfi://amynest-soft-motion";
  if (kind === "screen-recording") return "lavfi://amynest-screen";
  if (kind === "video") return "lavfi://amynest-video";
  return "lavfi://amynest-image";
}

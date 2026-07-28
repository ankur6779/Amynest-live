import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CompositionPlan } from "../../types/render-package.js";

export interface RemotionCompositionProps {
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  scenes: Array<{
    id: string;
    from: number;
    durationInFrames: number;
    sourcePath: string;
    sourceKind: string;
  }>;
  transitions: Array<{
    type: string;
    atFrame: number;
    durationFrames: number;
  }>;
  captions: Array<{
    text: string;
    startFrame: number;
    endFrame: number;
  }>;
  watermark: {
    enabled: boolean;
    text: string;
    cta: string;
  };
}

/** Build Remotion-compatible composition props (no Remotion runtime required). */
export function buildRemotionCompositionProps(
  plan: CompositionPlan,
): RemotionCompositionProps {
  return {
    fps: plan.fps,
    width: plan.width,
    height: plan.height,
    durationInFrames: plan.timeline.totalFrames,
    scenes: plan.visuals.map((layer) => ({
      id: layer.sceneId,
      from: layer.startFrame,
      durationInFrames: Math.max(1, layer.endFrame - layer.startFrame),
      sourcePath: layer.sourcePath,
      sourceKind: layer.sourceKind,
    })),
    transitions: plan.transitions.map((t) => ({
      type: t.type,
      atFrame: t.atFrame,
      durationFrames: t.durationFrames,
    })),
    captions: plan.subtitles.cues.map((cue) => ({
      text: cue.text,
      startFrame: Math.round(cue.startSeconds * plan.fps),
      endFrame: Math.round(cue.endSeconds * plan.fps),
    })),
    watermark: {
      enabled: plan.watermark.enabled,
      text: "AmyNest",
      cta: plan.watermark.ctaText,
    },
  };
}

export function writeRemotionCompositionFile(
  plan: CompositionPlan,
  outputDirectory: string,
  basename: string,
): string {
  mkdirSync(outputDirectory, { recursive: true });
  const path = join(outputDirectory, `${basename}.remotion.json`);
  writeFileSync(path, `${JSON.stringify(buildRemotionCompositionProps(plan), null, 2)}\n`, "utf8");
  return path;
}

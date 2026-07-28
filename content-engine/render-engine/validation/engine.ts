import { validateAudioSync } from "../audio/index.js";
import type { CompositionPlan, RenderPackage, RenderValidationReport } from "../../types/render-package.js";
import type { AssetPackage } from "../../types/asset-package.js";
import type { StoryboardPackage } from "../../types/storyboard.js";

export function validateCompositionPlan(
  plan: CompositionPlan,
  storyboard: StoryboardPackage,
  assets: AssetPackage,
): RenderValidationReport {
  const errors: RenderValidationReport["errors"] = [];
  const warnings: RenderValidationReport["warnings"] = [];
  const push = (
    severity: "error" | "warning",
    path: string,
    message: string,
  ) => {
    (severity === "error" ? errors : warnings).push({ path, message, severity });
  };

  if (plan.width <= 0 || plan.height <= 0) {
    push("error", "resolution", "invalid resolution");
  }
  if (plan.fps <= 0) push("error", "fps", "fps must be positive");
  if (plan.timeline.totalFrames <= 0) {
    push("error", "duration", "timeline has no frames");
  }

  let cursor = 0;
  for (const clip of plan.timeline.clips) {
    if (clip.startFrame !== cursor) {
      push("error", `timeline.${clip.sceneId}`, "gap or overlap in frame timeline");
    }
    cursor = clip.endFrame;
  }

  for (const issue of validateAudioSync(plan.audio, plan.timeline.totalSeconds)) {
    push("error", "audio", issue);
  }

  for (const cue of plan.subtitles.cues) {
    if (cue.endSeconds <= cue.startSeconds) {
      push("error", `subtitles.${cue.index}`, "subtitle end must be after start");
    }
    if (cue.endSeconds > plan.timeline.totalSeconds + 0.05) {
      push("warning", `subtitles.${cue.index}`, "subtitle extends past duration");
    }
  }

  if (assets.resolvedAssets.length === 0) {
    push("warning", "assets", "no resolved scene assets; using generated visuals");
  }
  if (plan.watermark.enabled && !plan.watermark.logoPath) {
    push("error", "branding.watermark", "watermark enabled but logo path missing");
  }
  if (!storyboard.branding.channelName) {
    push("error", "branding", "channel name missing");
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function validateRenderPackage(pkg: RenderPackage): RenderValidationReport {
  const errors: RenderValidationReport["errors"] = [];
  const warnings: RenderValidationReport["warnings"] = [];
  const push = (
    severity: "error" | "warning",
    path: string,
    message: string,
  ) => {
    (severity === "error" ? errors : warnings).push({ path, message, severity });
  };

  if (!pkg.videoPath.trim()) push("error", "videoPath", "videoPath is required");
  if (pkg.duration <= 0) push("error", "duration", "duration must be positive");
  if (pkg.fps <= 0) push("error", "fps", "fps must be positive");
  if (pkg.resolution.width !== 1080 || pkg.resolution.height !== 1920) {
    push(
      "warning",
      "resolution",
      `expected 1080x1920 vertical default, got ${pkg.resolution.width}x${pkg.resolution.height}`,
    );
  }
  if (!pkg.checksum.trim()) push("error", "checksum", "checksum is required");
  if (!pkg.codec) push("error", "codec", "codec is required");

  return { ok: errors.length === 0, errors, warnings };
}

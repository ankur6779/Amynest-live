import { evaluateBrandQualityGate } from "../brand/index.js";
import { assertTimelineIntegrity } from "../timeline/index.js";
import type {
  StoryboardPackage,
  StoryboardValidationIssue,
  StoryboardValidationReport,
} from "../types/storyboard.js";

/** Validate timeline, scenes, captions, voice, branding, and assets. */
export function validateStoryboard(pkg: StoryboardPackage): StoryboardValidationReport {
  const errors: StoryboardValidationIssue[] = [];
  const warnings: StoryboardValidationIssue[] = [];

  const push = (
    severity: "error" | "warning",
    path: string,
    message: string,
  ) => {
    (severity === "error" ? errors : warnings).push({ path, message, severity });
  };

  for (const issue of assertTimelineIntegrity(pkg.timeline)) {
    push("error", "timeline", issue);
  }

  if (pkg.scenes.length === 0) {
    push("error", "scenes", "storyboard has no scenes");
  }

  const sceneIds = new Set(pkg.scenes.map((s) => s.sceneId));
  for (const clip of pkg.timeline.clips) {
    if (!sceneIds.has(clip.sceneId)) {
      push("error", `timeline.${clip.sceneId}`, "clip references unknown scene");
    }
  }

  for (const scene of pkg.scenes) {
    if (scene.duration <= 0) {
      push("error", `scenes.${scene.sceneId}.duration`, "scene duration must be > 0");
    }
    if (!scene.caption.trim()) {
      push("warning", `scenes.${scene.sceneId}.caption`, "scene caption is empty");
    }
    if (scene.assetRequirements.length === 0) {
      push("warning", `scenes.${scene.sceneId}.assets`, "scene has no asset requirements");
    }
  }

  for (const item of pkg.voicePlan.items) {
    if (item.end <= item.start) {
      push("error", `voicePlan.${item.sceneId}`, "voice end must be after start");
    }
    if (!sceneIds.has(item.sceneId)) {
      push("error", `voicePlan.${item.sceneId}`, "voice item references unknown scene");
    }
    if (item.end > pkg.totalDuration + 0.01) {
      push("error", `voicePlan.${item.sceneId}`, "voice timing exceeds total duration");
    }
  }

  for (const item of pkg.captionPlan.items) {
    if (item.end <= item.start) {
      push("error", `captionPlan.${item.captionId}`, "caption end must be after start");
    }
    if (item.start < -0.01 || item.end > pkg.totalDuration + 0.01) {
      push("error", `captionPlan.${item.captionId}`, "caption timing outside timeline");
    }
    if (!item.text.trim()) {
      push("warning", `captionPlan.${item.captionId}`, "caption text is empty");
    }
  }

  if (!pkg.branding.channelName.trim()) {
    push("error", "branding.channelName", "channelName is required");
  }
  if (!pkg.branding.logoAssetId.trim()) {
    push("error", "branding.logoAssetId", "logoAssetId is required");
  }
  if (!pkg.branding.cta.trim()) {
    push("warning", "branding.cta", "CTA text is empty");
  }
  if (!pkg.branding.qrPlaceholder || !pkg.branding.playStorePlaceholder) {
    push("warning", "branding.placeholders", "QR or Play Store placeholder missing");
  }

  const purposes = new Set(pkg.scenes.map((s) => s.purpose));
  if (!purposes.has("brand-end")) {
    push("error", "scenes.brand-end", "mandatory AmyNest branded end card missing");
  }
  if (!purposes.has("cta")) {
    push("error", "scenes.cta", "mandatory official CTA scene missing");
  }
  if (!purposes.has("hook")) {
    push("error", "scenes.hook", "mandatory hook scene missing");
  }

  const brandGate = evaluateBrandQualityGate({ storyboard: pkg });
  for (const finding of brandGate.findings) {
    push(
      finding.severity,
      `brand.${finding.code}`,
      finding.message,
    );
  }

  const assetIds = new Set<string>();
  for (const asset of pkg.assets) {
    if (assetIds.has(asset.assetId)) {
      push("error", `assets.${asset.assetId}`, "duplicate asset id");
    }
    assetIds.add(asset.assetId);
    if (!asset.fallbackAsset.trim()) {
      push("warning", `assets.${asset.assetId}.fallbackAsset`, "fallback asset missing");
    }
    if (!asset.imagePrompt.trim() && !asset.screenRecordingTemplate.trim()) {
      push(
        "warning",
        `assets.${asset.assetId}`,
        "asset has neither imagePrompt nor screenRecordingTemplate",
      );
    }
    if (!sceneIds.has(asset.sceneId)) {
      push("error", `assets.${asset.assetId}`, "asset references unknown scene");
    }
  }

  const requiredSceneAssets = pkg.scenes.flatMap((s) => s.assetRequirements.map((a) => a.assetId));
  for (const assetId of requiredSceneAssets) {
    if (!assetIds.has(assetId)) {
      push("error", `assets.${assetId}`, "scene asset requirement missing from assets list");
    }
  }

  if (pkg.transitionPlan.length !== Math.max(0, pkg.scenes.length - 1)) {
    push(
      "warning",
      "transitionPlan",
      `expected ${Math.max(0, pkg.scenes.length - 1)} transitions, found ${pkg.transitionPlan.length}`,
    );
  }

  if (pkg.cameraPlan.length !== pkg.scenes.length) {
    push(
      "warning",
      "cameraPlan",
      `expected ${pkg.scenes.length} camera items, found ${pkg.cameraPlan.length}`,
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

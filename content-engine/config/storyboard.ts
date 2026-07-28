import type { ContentEngineConfig, ResolvedStoryboardConfig } from "../types/index.js";
import type { StoryboardSettings } from "../types/storyboard.js";

export const DEFAULT_STORYBOARD_SETTINGS: StoryboardSettings = {
  aspectRatio: "9:16",
  resolution: "1080x1920",
  fps: 30,
  defaultTransitions: ["Cut", "Fade", "Crossfade", "Slide"],
  brandingMode: "full",
  animationLevel: "balanced",
  cameraStyle: "cinematic",
  safeMargins: {
    top: 120,
    right: 64,
    bottom: 180,
    left: 64,
  },
};

/** Merge Phase 3 storyboard defaults (backward compatible). */
export function resolveStoryboardSettings(
  config: ContentEngineConfig,
): ResolvedStoryboardConfig {
  return {
    ...config,
    aspectRatio: config.aspectRatio ?? DEFAULT_STORYBOARD_SETTINGS.aspectRatio,
    resolution: config.resolution ?? DEFAULT_STORYBOARD_SETTINGS.resolution,
    fps: config.fps ?? DEFAULT_STORYBOARD_SETTINGS.fps,
    defaultTransitions:
      config.defaultTransitions ?? DEFAULT_STORYBOARD_SETTINGS.defaultTransitions,
    brandingMode: config.brandingMode ?? DEFAULT_STORYBOARD_SETTINGS.brandingMode,
    animationLevel: config.animationLevel ?? DEFAULT_STORYBOARD_SETTINGS.animationLevel,
    cameraStyle: config.cameraStyle ?? DEFAULT_STORYBOARD_SETTINGS.cameraStyle,
    safeMargins: {
      ...DEFAULT_STORYBOARD_SETTINGS.safeMargins,
      ...(config.safeMargins ?? {}),
    },
  };
}

import { createHash } from "node:crypto";
import { collectAssets } from "../assets/index.js";
import { buildAnimationPlan } from "../animation/index.js";
import { buildCameraPlan } from "../camera/index.js";
import { resolveStoryboardSettings } from "../config/storyboard.js";
import { buildOverlayPlan } from "../overlays/index.js";
import { composeScenesForStoryboard } from "../scene-composer/enhance-storyboard.js";
import { buildScenes } from "../scenes/index.js";
import {
  createTelemetryEvent,
  type TelemetryEvent,
  type TelemetrySink,
  InMemoryTelemetrySink,
} from "../telemetry/index.js";
import {
  applyTimelineDurations,
  buildTimeline,
  resolveSupportedDuration,
} from "../timeline/index.js";
import { buildTransitionPlan } from "../transitions/index.js";
import type { ContentEngineConfig } from "../types/index.js";
import type {
  ContentPackage,
} from "../types/content-package.js";
import type {
  StoryboardPackage,
  StoryboardPlanningInput,
  SupportedDuration,
} from "../types/storyboard.js";
import { STORYBOARD_PACKAGE_VERSION } from "../types/storyboard.js";
import { validateStoryboard } from "../validation/index.js";
import { buildBrandingPlan } from "./branding.js";
import { buildCaptionPlan } from "./caption-plan.js";
import { buildMusicPlan } from "./music-plan.js";
import { buildVoicePlan } from "./voice-plan.js";

export interface StoryboardPlannerOptions {
  config: ContentEngineConfig;
  telemetry?: TelemetrySink;
}

export interface StoryboardPlanResult {
  package: StoryboardPackage;
  telemetry: TelemetryEvent;
}

/**
 * Transform a Phase 2 ContentPackage into a deterministic StoryboardPackage.
 * Provider-agnostic planning only — no rendering, FFmpeg, or media generation.
 */
export class StoryboardPlanner {
  private readonly config: ContentEngineConfig;
  private readonly telemetry: TelemetrySink;

  constructor(options: StoryboardPlannerOptions) {
    this.config = options.config;
    this.telemetry = options.telemetry ?? new InMemoryTelemetrySink();
  }

  planFromContentPackage(
    contentPackage: ContentPackage,
    duration?: SupportedDuration,
  ): StoryboardPlanResult {
    return this.plan({ contentPackage, duration });
  }

  plan(input: StoryboardPlanningInput): StoryboardPlanResult {
    const started = Date.now();
    const settings = resolveStoryboardSettings(this.config);
    const pkg = input.contentPackage;
    const totalDuration =
      input.duration ?? resolveSupportedDuration(pkg.estimatedDuration);

    // Scene Composer (additive): provider-aware multi-clip plan.
    // Falls back to classic buildScenes if composer is explicitly disabled.
    const composerEnabled = process.env.AMYNEST_SCENE_COMPOSER !== "0";
    let scenes = composerEnabled
      ? composeScenesForStoryboard({
          contentPackage: pkg,
          duration: totalDuration,
          providerId: process.env.AMYNEST_VIDEO_PROVIDER,
        }).scenes
      : buildScenes(pkg, totalDuration);
    const timeline = buildTimeline(scenes, totalDuration);
    scenes = applyTimelineDurations(scenes, timeline);

    const camera = buildCameraPlan(scenes, timeline, settings.cameraStyle);
    scenes = camera.scenes;

    const transitions = buildTransitionPlan(
      scenes,
      timeline,
      settings.defaultTransitions,
    );
    scenes = transitions.scenes;

    const branding = buildBrandingPlan(
      this.config,
      settings.brandingMode,
      pkg.cta,
    );

    const overlayPlan = buildOverlayPlan(
      scenes,
      timeline,
      branding,
      settings.safeMargins,
      settings.animationLevel,
    );

    const animations = buildAnimationPlan(
      scenes,
      timeline,
      overlayPlan,
      settings.animationLevel,
    );
    scenes = animations.scenes;

    const assets = collectAssets(scenes);
    const musicPlan = buildMusicPlan(this.config, totalDuration);
    const voicePlan = buildVoicePlan(scenes, timeline);
    const captionPlan = buildCaptionPlan(pkg, scenes, timeline);

    const storyboard: StoryboardPackage = {
      id: buildStoryboardId(pkg, totalDuration),
      version: STORYBOARD_PACKAGE_VERSION,
      createdAt: new Date().toISOString(),
      topic: pkg.topic,
      contentPackageVersion: pkg.version,
      totalDuration,
      aspectRatio: settings.aspectRatio,
      fps: settings.fps,
      resolution: settings.resolution,
      branding,
      timeline,
      scenes,
      assets,
      musicPlan,
      voicePlan,
      captionPlan,
      transitionPlan: transitions.transitionPlan,
      cameraPlan: camera.cameraPlan,
      overlayPlan,
      animationPlan: animations.animationPlan,
      renderHints: {
        preferGpu: true,
        maxBitrateKbps: settings.resolution === "1080x1920" ? 8_000 : 10_000,
        audioSampleRate: 48_000,
        captionBurnIn: true,
        colorSpace: "rec709",
        futureRenderFormat: "amynest-render-v1",
      },
      validation: {
        ok: true,
        errors: [],
        warnings: [],
      },
      source: {
        title: pkg.title,
        language: pkg.language,
        videoStyle: pkg.topic.videoStyle,
        provider: pkg.provider,
      },
    };

    storyboard.validation = validateStoryboard(storyboard);

    const complexity = computeTimelineComplexity(storyboard);
    const event = createTelemetryEvent({
      name: "storyboard.plan",
      generationTimeMs: Date.now() - started,
      provider: "storyboard-planner",
      errors: storyboard.validation.errors.map((e) => e.message),
      retryCount: 0,
      cacheHit: false,
      topicId: pkg.topic.id,
      metadata: {
        sceneCount: scenes.length,
        validationWarnings: storyboard.validation.warnings.length,
        timelineComplexity: complexity,
        totalDuration,
        aspectRatio: settings.aspectRatio,
      },
    });
    this.telemetry.record(event);

    return { package: storyboard, telemetry: event };
  }
}

function buildStoryboardId(pkg: ContentPackage, duration: SupportedDuration): string {
  const digest = createHash("sha256")
    .update(
      [
        pkg.topic.id,
        pkg.title,
        pkg.language,
        pkg.version,
        String(duration),
        STORYBOARD_PACKAGE_VERSION,
      ].join("|"),
    )
    .digest("hex")
    .slice(0, 12);
  return `sb_${pkg.topic.id}_${duration}_${digest}`;
}

function computeTimelineComplexity(pkg: StoryboardPackage): number {
  return (
    pkg.scenes.length * 2 +
    pkg.overlayPlan.length +
    pkg.animationPlan.length +
    pkg.transitionPlan.length +
    pkg.captionPlan.items.length
  );
}

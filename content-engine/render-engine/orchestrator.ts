import { createHash } from "node:crypto";
import { join } from "node:path";
import { resolveRenderEngineSettings } from "../config/render-engine.js";
import type { ContentEngineConfig } from "../types/index.js";
import type {
  RenderInput,
  RenderPackage,
  RenderProgressEvent,
} from "../types/render-package.js";
import { RENDER_PACKAGE_VERSION } from "../types/render-package.js";
import {
  createTelemetryEvent,
  InMemoryTelemetrySink,
  type TelemetryEvent,
  type TelemetrySink,
} from "../telemetry/index.js";
import { buildAudioMixPlan } from "./audio/index.js";
import {
  buildRenderFingerprint,
  InMemoryRenderCache,
  type RenderCacheStore,
} from "./cache/index.js";
import { buildCompositionPlan } from "./compositor/index.js";
import { ProgressTracker } from "./progress/index.js";
import {
  createDefaultRenderRegistry,
  type RenderProviderRegistry,
} from "./providers/index.js";
import { buildSubtitlePlan } from "./subtitles/index.js";
import { buildFrameTimeline, buildTransitionSpecs } from "./timeline/index.js";
import {
  validateCompositionPlan,
  validateRenderPackage,
} from "./validation/index.js";
import { buildWatermarkSpec } from "./watermark/index.js";

export interface RenderOrchestratorOptions {
  config: ContentEngineConfig;
  registry?: RenderProviderRegistry;
  cache?: RenderCacheStore;
  telemetry?: TelemetrySink;
}

export interface RenderOrchestrationResult {
  package: RenderPackage;
  telemetry: TelemetryEvent;
  cacheHit: boolean;
  progressLog: RenderProgressEvent[];
}

/**
 * Phase 5 orchestrator: AssetPackage + StoryboardPackage → RenderPackage.
 */
export class RenderOrchestrator {
  private readonly config: ContentEngineConfig;
  private readonly registry: RenderProviderRegistry;
  private readonly cache: RenderCacheStore;
  private readonly telemetry: TelemetrySink;

  constructor(options: RenderOrchestratorOptions) {
    this.config = options.config;
    this.registry = options.registry ?? createDefaultRenderRegistry();
    this.cache = options.cache ?? new InMemoryRenderCache();
    this.telemetry = options.telemetry ?? new InMemoryTelemetrySink();
  }

  async render(input: RenderInput): Promise<RenderOrchestrationResult> {
    const started = Date.now();
    const settings = resolveRenderEngineSettings(this.config);
    const progress = new ProgressTracker();

    if (input.assets.storyboardId !== input.storyboard.id) {
      throw new Error(
        `AssetPackage storyboardId mismatch: ${input.assets.storyboardId} !== ${input.storyboard.id}`,
      );
    }

    progress.emit("queued", 0, "Render job queued");

    const fingerprint = buildRenderFingerprint({
      storyboard: input.storyboard,
      assets: input.assets,
      settings,
    });

    const cached = this.cache.get(fingerprint);
    if (cached) {
      const event = createTelemetryEvent({
        name: "render_engine.render",
        generationTimeMs: Date.now() - started,
        provider: cached.renderMetadata.renderer,
        errors: [],
        retryCount: 0,
        cacheHit: true,
        topicId: input.storyboard.topic.id,
        metadata: {
          frames: cached.telemetry.frames,
          cacheHit: true,
        },
      });
      this.telemetry.record(event);
      progress.emit("completed", 1, "Cache hit — skipped render");
      return {
        package: cached,
        telemetry: event,
        cacheHit: true,
        progressLog: progress.getLog(),
      };
    }

    progress.emit("preparing", 0.1, "Building frame timeline and composition");

    const timeline = buildFrameTimeline(input.storyboard, settings.fps);
    const transitions = buildTransitionSpecs(input.storyboard, timeline);
    const subtitles = buildSubtitlePlan(input.storyboard, settings.subtitleMode);
    const audio = buildAudioMixPlan(input.storyboard);
    const watermark = buildWatermarkSpec(
      input.storyboard,
      input.assets,
      settings.watermark,
    );

    const composition = buildCompositionPlan({
      storyboard: input.storyboard,
      assets: input.assets,
      timeline,
      transitions,
      subtitles,
      audio,
      watermark,
      fps: settings.fps,
      bitrate: settings.bitrate,
      codec: settings.codec,
      audioCodec: settings.audioCodec,
      outputContainer: settings.outputContainer,
    });

    const compositionValidation = validateCompositionPlan(
      composition,
      input.storyboard,
      input.assets,
    );
    if (!compositionValidation.ok) {
      throw new Error(
        `Composition validation failed: ${compositionValidation.errors.map((e) => e.message).join("; ")}`,
      );
    }

    const provider = await this.registry.resolveProvider(
      settings.renderer,
      settings.preferredRenderer,
    );

    const jobId = `job_${fingerprint.slice(0, 12)}`;
    const extension = settings.outputContainer;
    const outputPath = join(
      settings.outputDirectory,
      input.storyboard.id,
      `${jobId}.${extension}`,
    );

    const hw =
      settings.hardwareAcceleration === "auto"
        ? process.platform === "darwin"
          ? "videotoolbox"
          : "none"
        : settings.hardwareAcceleration;

    progress.emit("rendering", 0.35, `Rendering with ${provider.id}`);

    const result = await provider.render({
      jobId,
      storyboard: input.storyboard,
      assets: input.assets,
      composition,
      outputPath,
      hardwareAcceleration: hw,
      onProgress: (event) => progress.emit(event.stage, event.progress, event.message, event.details),
    });

    progress.emit("encoding", 0.85, "Encoding complete");
    progress.emit("optimizing", 0.93, "Validating render package");

    const memory = process.memoryUsage();
    const renderPackage: RenderPackage = {
      id: `rp_${createHash("sha256").update(fingerprint).digest("hex").slice(0, 12)}`,
      version: RENDER_PACKAGE_VERSION,
      createdAt: new Date().toISOString(),
      storyboardId: input.storyboard.id,
      assetPackageId: input.assets.id,
      videoPath: result.videoPath,
      duration: result.durationSeconds,
      resolution: { width: result.width, height: result.height },
      fps: result.fps,
      codec: result.codec,
      audioCodec: result.audioCodec,
      container: result.container,
      checksum: result.checksum,
      renderMetadata: {
        jobId,
        storyboardId: input.storyboard.id,
        assetPackageId: input.assets.id,
        compositionFingerprint: fingerprint,
        renderer: result.provider,
        outputDirectory: settings.outputDirectory,
        subtitleMode: settings.subtitleMode,
        watermarkApplied: watermark.enabled,
        createdAt: new Date().toISOString(),
        artifacts: result.artifacts,
      },
      telemetry: {
        renderTimeMs: result.renderTimeMs,
        encodingTimeMs: result.encodingTimeMs,
        frames: result.framesRendered,
        droppedFrames: result.droppedFrames,
        memoryMb: Math.round(memory.heapUsed / (1024 * 1024)),
        cacheHit: false,
        provider: result.provider,
      },
      validation: {
        ok: true,
        errors: [],
        warnings: compositionValidation.warnings,
      },
      progressLog: progress.getLog(),
    };

    renderPackage.validation = validateRenderPackage(renderPackage);
    this.cache.set(fingerprint, renderPackage);

    progress.emit("completed", 1, "Render package ready");

    const event = createTelemetryEvent({
      name: "render_engine.render",
      generationTimeMs: Date.now() - started,
      provider: result.provider,
      errors: renderPackage.validation.errors.map((e) => e.message),
      retryCount: 0,
      cacheHit: false,
      topicId: input.storyboard.topic.id,
      metadata: {
        renderTimeMs: result.renderTimeMs,
        encodingTimeMs: result.encodingTimeMs,
        frames: result.framesRendered,
        droppedFrames: result.droppedFrames,
        memoryMb: renderPackage.telemetry.memoryMb ?? 0,
        cacheHit: false,
      },
    });
    this.telemetry.record(event);

    return {
      package: renderPackage,
      telemetry: event,
      cacheHit: false,
      progressLog: progress.getLog(),
    };
  }
}

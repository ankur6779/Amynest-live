import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";
import type {
  AssetCostEstimate,
  AssetProviderHealth,
  AssetRequest,
  AssetResolveContext,
  ResolvedAsset,
} from "../../../types/asset-package.js";
import type { ContentPackage } from "../../../types/content-package.js";
import type {
  GeneratedVideoAsset,
  GeminiVideoProviderSettings,
} from "../../../types/generated-video.js";
import { DEFAULT_GEMINI_VIDEO_SETTINGS } from "../../../types/generated-video.js";
import type { ScenePlan, StoryboardPackage } from "../../../types/storyboard.js";
import { BaseAssetProvider } from "../base.js";
import { GeminiVeoClient } from "./client.js";
import { GeminiVideoError } from "./errors.js";
import { buildVeoPrompt } from "./prompt.js";

export interface GeminiVideoProviderOptions {
  settings?: Partial<GeminiVideoProviderSettings>;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  /** Optional context for richer prompts during resolve(). */
  content?: ContentPackage;
  storyboard?: StoryboardPackage;
}

export interface GenerateVideoOptions {
  prompt?: string;
  negativePrompt?: string;
  content?: ContentPackage;
  storyboard?: StoryboardPackage;
  scene?: ScenePlan;
  sceneDescription?: string;
  assetId?: string;
  sceneId?: string;
  aspectRatio?: "9:16" | "16:9";
  durationSeconds?: 4 | 6 | 8;
  resolution?: "720p" | "1080p";
  outputPath?: string;
  /** First-frame / identity lock for image-to-video (official character base). */
  imagePath?: string;
  /**
   * Optional reference stack (Character Bible + previous scene memory).
   * Primary continuity still uses `imagePath` (existing Veo image-to-video).
   * Extra paths are recorded in metadata for providers that accept multi-ref later.
   */
  referenceImagePaths?: string[];
  signal?: AbortSignal;
}

/**
 * Production Google Gemini / Veo video provider.
 * Registered as asset provider id `google-veo` for backward-compatible routing.
 */
export class GeminiVideoProvider extends BaseAssetProvider {
  readonly id = "google-veo" as const;
  private readonly settings: GeminiVideoProviderSettings;
  private readonly apiKey: string;
  private readonly fetchImpl?: typeof fetch;
  private readonly sleep?: (ms: number) => Promise<void>;
  private readonly content?: ContentPackage;
  private readonly storyboard?: StoryboardPackage;
  private activeOperation: string | null = null;
  private abortController: AbortController | null = null;

  constructor(options: GeminiVideoProviderOptions = {}) {
    super();
    // Merge env (AMYNEST_VEO_TIMEOUT_MS / MAX_POLLS / etc.) — do not ignore ops knobs.
    this.settings = resolveGeminiVideoSettings(options.settings);
    const envName = this.settings.apiKeyEnv || "GEMINI_API_KEY";
    this.apiKey =
      options.apiKey !== undefined
        ? options.apiKey.trim()
        : process.env[envName]?.trim() ||
          process.env.GOOGLE_AI_API_KEY?.trim() ||
          "";
    this.fetchImpl = options.fetchImpl;
    this.sleep = options.sleep;
    this.content = options.content;
    this.storyboard = options.storyboard;
  }

  supportsImages(): boolean {
    return false;
  }

  supportsVideo(): boolean {
    return true;
  }

  override estimateCost(request: AssetRequest): AssetCostEstimate {
    const seconds = this.settings.durationSeconds;
    return {
      currency: "USD",
      amount: estimateVeoCostUsd(seconds),
      unit: "asset",
    };
  }

  override async health(): Promise<AssetProviderHealth> {
    const checkedAt = new Date().toISOString();
    if (!this.settings.enabled) {
      return {
        ok: false,
        message: "GeminiVideoProvider disabled via config",
        checkedAt,
      };
    }
    if (!this.apiKey) {
      return {
        ok: false,
        message: `${this.settings.apiKeyEnv} missing`,
        checkedAt,
      };
    }
    const client = this.createClient();
    const result = await client.healthCheck();
    return {
      ok: result.ok,
      message: result.message,
      checkedAt,
    };
  }

  /** Cancel the in-flight Veo operation if any. */
  async cancel(): Promise<void> {
    this.abortController?.abort();
    if (this.activeOperation) {
      const client = this.createClient();
      await client.cancelOperation(this.activeOperation).catch(() => undefined);
      this.activeOperation = null;
    }
  }

  async generateVideo(options: GenerateVideoOptions = {}): Promise<GeneratedVideoAsset> {
    if (!this.settings.enabled) {
      throw new GeminiVideoError(
        "CONFIG_ERROR",
        "GeminiVideoProvider is disabled",
        { recoverable: false },
      );
    }
    if (!this.apiKey) {
      throw new GeminiVideoError(
        "CONFIG_ERROR",
        `${this.settings.apiKeyEnv} is required for Veo generation`,
        { recoverable: false },
      );
    }

    const aspectRatio =
      options.aspectRatio ??
      (options.storyboard?.aspectRatio === "16:9" ? "16:9" : "9:16");
    const durationSeconds =
      options.durationSeconds ?? this.settings.durationSeconds;
    const resolution = options.resolution ?? this.settings.resolution;

    const promptBundle =
      options.prompt != null
        ? {
            prompt: options.prompt,
            negativePrompt: options.negativePrompt ?? "",
          }
        : buildVeoPrompt({
            content: options.content ?? this.content,
            storyboard: options.storyboard ?? this.storyboard,
            scene: options.scene,
            sceneDescription: options.sceneDescription,
            durationSeconds,
            aspectRatio,
          });

    const client = this.createClient();
    const controller = new AbortController();
    this.abortController = controller;
    if (options.signal) {
      if (options.signal.aborted) controller.abort();
      else {
        options.signal.addEventListener("abort", () => controller.abort(), {
          once: true,
        });
      }
    }

    const started = Date.now();
    const assetId = options.assetId ?? `veo-${Date.now()}`;
    const outputPath =
      options.outputPath ??
      client.buildOutputPath(this.settings.outputDirectory, assetId);

    let imagePayload:
      | { mimeType: string; bytesBase64: string }
      | undefined;
    if (options.imagePath) {
      if (!existsSync(options.imagePath)) {
        throw new GeminiVideoError(
          "CONFIG_ERROR",
          `Veo imagePath missing: ${options.imagePath}`,
          { recoverable: false },
        );
      }
      const bytes = await readFile(options.imagePath);
      const ext = extname(options.imagePath).toLowerCase();
      const mimeType =
        ext === ".png"
          ? "image/png"
          : ext === ".webp"
            ? "image/webp"
            : "image/jpeg";
      imagePayload = {
        mimeType,
        bytesBase64: bytes.toString("base64"),
      };
    }

    try {
      const { operationName } = await client.withRetries(
        () =>
          client.startGeneration({
            prompt: promptBundle.prompt,
            negativePrompt:
              "negativePrompt" in promptBundle
                ? promptBundle.negativePrompt
                : options.negativePrompt,
            aspectRatio,
            durationSeconds,
            resolution,
            personGeneration: this.settings.personGeneration,
            image: imagePayload,
            signal: controller.signal,
          }),
        this.settings.retryCount,
        controller.signal,
      );
      this.activeOperation = operationName;

      const polled = await client.pollUntilComplete({
        operationName,
        pollingIntervalMs: this.settings.pollingIntervalMs,
        maxPollAttempts: this.settings.maxPollAttempts,
        timeoutMs: this.settings.timeoutMs,
        signal: controller.signal,
      });

      await client.withRetries(
        () =>
          client.downloadVideo({
            uri: polled.sample.uri,
            outputPath,
            signal: controller.signal,
          }),
        this.settings.retryCount,
        controller.signal,
      );

      const fileStat = await stat(outputPath);
      if (fileStat.size < 1_024) {
        throw new GeminiVideoError(
          "VALIDATION_FAILED",
          `Downloaded Veo video is too small (${fileStat.size} bytes)`,
          { recoverable: false },
        );
      }

      const bytes = await readFile(outputPath);
      const checksum = createHash("sha256").update(bytes).digest("hex");
      const generationTime = Date.now() - started;
      const { width, height } = resolutionToPixels(resolution, aspectRatio);

      return {
        videoPath: outputPath,
        provider: "google-veo",
        duration: durationSeconds,
        resolution: `${width}x${height}`,
        fps: 24,
        checksum,
        generationTime,
        metadata: {
          model: this.settings.model,
          operationName,
          prompt: promptBundle.prompt,
          aspectRatio,
          requestedDurationSeconds: durationSeconds,
          mimeType: polled.sample.mimeType ?? "video/mp4",
          fileSizeBytes: fileStat.size,
          hasAudio: true,
          sceneId: options.sceneId,
          assetId,
          costEstimateUsd: estimateVeoCostUsd(durationSeconds),
          pollAttempts: polled.pollAttempts,
          downloadedAt: new Date().toISOString(),
          rawUri: polled.sample.uri,
          imageToVideo: Boolean(imagePayload),
          identityImagePath: options.imagePath,
          referenceImagePaths: options.referenceImagePaths ?? [],
        },
      };
    } finally {
      this.activeOperation = null;
      this.abortController = null;
    }
  }

  async resolve(
    request: AssetRequest,
    context: AssetResolveContext,
  ): Promise<ResolvedAsset | null> {
    if (!this.settings.enabled || !this.apiKey) return null;
    if (!context.allowGenerationPlanning) return null;

    const isVideoType =
      request.assetType === "Future AI Video" ||
      request.assetType === "Motion Background" ||
      request.assetType === "Screen Recording";
    if (!isVideoType) return null;

    const aspectRatio =
      request.aspectRatio === "16:9" || request.aspectRatio === "9:16"
        ? request.aspectRatio
        : "9:16";

    const scene = this.storyboard?.scenes.find((s) => s.sceneId === request.sceneId);

    try {
      const generated = await this.generateVideo({
        content: this.content,
        storyboard: this.storyboard,
        scene,
        sceneDescription: request.prompt,
        assetId: request.assetId,
        sceneId: request.sceneId,
        aspectRatio,
      });

      return this.buildResolved(request, context, {
        path: generated.videoPath,
        status: "resolved",
        license: "Google Gemini / Veo Generated — AmyNest production use",
        costEstimateUsd: generated.metadata.costEstimateUsd,
        metadata: {
          source: this.id,
          mode: "generated",
          model: generated.metadata.model,
          operationName: generated.metadata.operationName,
          durationSeconds: generated.duration,
          fps: generated.fps,
          checksum: generated.checksum,
          fileSizeBytes: generated.metadata.fileSizeBytes,
          hasAudio: generated.metadata.hasAudio,
          generationTimeMs: generated.generationTime,
          prompt: generated.metadata.prompt.slice(0, 240),
        },
      });
    } catch (error) {
      if (error instanceof GeminiVideoError && !error.recoverable) {
        return null;
      }
      throw error;
    }
  }

  private createClient(): GeminiVeoClient {
    return new GeminiVeoClient({
      apiKey: this.apiKey,
      baseUrl: this.settings.baseUrl,
      model: this.settings.model,
      fetchImpl: this.fetchImpl,
      sleep: this.sleep,
    });
  }
}

export function estimateVeoCostUsd(durationSeconds: number): number {
  // Public Veo 3 pricing guidance ≈ $0.75 / second (audio included).
  return Number((Math.max(1, durationSeconds) * 0.75).toFixed(2));
}

export function resolutionToPixels(
  resolution: "720p" | "1080p",
  aspectRatio: "9:16" | "16:9",
): { width: number; height: number } {
  if (aspectRatio === "9:16") {
    return resolution === "1080p"
      ? { width: 1080, height: 1920 }
      : { width: 720, height: 1280 };
  }
  return resolution === "1080p"
    ? { width: 1920, height: 1080 }
    : { width: 1280, height: 720 };
}

export function resolveGeminiVideoSettings(
  partial?: Partial<GeminiVideoProviderSettings>,
  env: NodeJS.ProcessEnv = process.env,
): GeminiVideoProviderSettings {
  const enabledEnv = env.AMYNEST_VEO_ENABLED;
  return {
    ...DEFAULT_GEMINI_VIDEO_SETTINGS,
    ...(partial ?? {}),
    apiKeyEnv: partial?.apiKeyEnv ?? env.AMYNEST_VEO_API_KEY_ENV ?? "GEMINI_API_KEY",
    model: partial?.model ?? env.AMYNEST_VEO_MODEL ?? DEFAULT_GEMINI_VIDEO_SETTINGS.model,
    baseUrl:
      partial?.baseUrl ??
      env.AMYNEST_VEO_BASE_URL ??
      DEFAULT_GEMINI_VIDEO_SETTINGS.baseUrl,
    resolution:
      (partial?.resolution as "720p" | "1080p" | undefined) ??
      (env.AMYNEST_VEO_RESOLUTION as "720p" | "1080p" | undefined) ??
      DEFAULT_GEMINI_VIDEO_SETTINGS.resolution,
    durationSeconds:
      partial?.durationSeconds ??
      (env.AMYNEST_VEO_DURATION
        ? (Number(env.AMYNEST_VEO_DURATION) as 4 | 6 | 8)
        : DEFAULT_GEMINI_VIDEO_SETTINGS.durationSeconds),
    pollingIntervalMs:
      partial?.pollingIntervalMs ??
      (env.AMYNEST_VEO_POLL_MS
        ? Number(env.AMYNEST_VEO_POLL_MS)
        : DEFAULT_GEMINI_VIDEO_SETTINGS.pollingIntervalMs),
    maxPollAttempts:
      partial?.maxPollAttempts ??
      (env.AMYNEST_VEO_MAX_POLLS
        ? Number(env.AMYNEST_VEO_MAX_POLLS)
        : DEFAULT_GEMINI_VIDEO_SETTINGS.maxPollAttempts),
    retryCount:
      partial?.retryCount ??
      (env.AMYNEST_VEO_RETRY_COUNT
        ? Number(env.AMYNEST_VEO_RETRY_COUNT)
        : DEFAULT_GEMINI_VIDEO_SETTINGS.retryCount),
    timeoutMs:
      partial?.timeoutMs ??
      (env.AMYNEST_VEO_TIMEOUT_MS
        ? Number(env.AMYNEST_VEO_TIMEOUT_MS)
        : DEFAULT_GEMINI_VIDEO_SETTINGS.timeoutMs),
    outputDirectory:
      partial?.outputDirectory ??
      env.AMYNEST_VEO_OUTPUT_DIR ??
      DEFAULT_GEMINI_VIDEO_SETTINGS.outputDirectory,
    enabled:
      partial?.enabled ??
      (enabledEnv === undefined ? true : enabledEnv === "true"),
  };
}

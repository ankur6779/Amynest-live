/**
 * KIE Kling 3.0 provider — bakeoff / comparison path.
 * Same generateVideo() shape as GeminiVideoProvider / KieVideoProvider.
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import type { GeneratedVideoAsset } from "../../../types/generated-video.js";
import type { GenerateVideoOptions } from "../gemini-video/provider.js";
import {
  kieCredits,
  kieGenerateKlingVideo,
  type KieKlingMode,
} from "./client.js";

export interface KieKlingVideoProviderOptions {
  apiKey?: string;
  /** std = 720p, pro = 1080p */
  mode?: KieKlingMode;
  creditUsd?: number;
  enabled?: boolean;
}

const DEFAULT_CREDIT_USD = 0.005;

export class KieKlingVideoProvider {
  readonly id = "kie-kling" as const;
  private readonly apiKey: string;
  private readonly mode: KieKlingMode;
  private readonly creditUsd: number;
  private readonly enabled: boolean;

  constructor(options: KieKlingVideoProviderOptions = {}) {
    this.apiKey =
      options.apiKey?.trim() || process.env.KIE_API_KEY?.trim() || "";
    this.mode =
      options.mode ??
      (process.env.AMYNEST_KIE_KLING_MODE === "pro"
        ? "pro"
        : process.env.AMYNEST_KIE_KLING_MODE === "4K"
          ? "4K"
          : "std");
    this.creditUsd = options.creditUsd ?? DEFAULT_CREDIT_USD;
    this.enabled =
      options.enabled ?? process.env.AMYNEST_KIE_KLING_ENABLED !== "0";
  }

  async health(): Promise<{ ok: boolean; message: string; credits?: number }> {
    if (!this.enabled) {
      return { ok: false, message: "KieKlingVideoProvider disabled" };
    }
    if (!this.apiKey) {
      return { ok: false, message: "KIE_API_KEY missing" };
    }
    try {
      const credits = await kieCredits(this.apiKey);
      if (!Number.isFinite(credits)) {
        return { ok: false, message: "KIE credits lookup failed" };
      }
      return {
        ok: credits >= 100,
        message: `KIE Kling ready — ${credits} credits (mode=${this.mode})`,
        credits,
      };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : String(e),
      };
    }
  }

  async generateVideo(options: GenerateVideoOptions = {}): Promise<GeneratedVideoAsset> {
    if (!this.enabled) throw new Error("KieKlingVideoProvider is disabled");
    if (!this.apiKey) throw new Error("KIE_API_KEY required for Kling");
    if (!options.imagePath || !existsSync(options.imagePath)) {
      throw new Error(
        `Kling image-to-video requires imagePath (missing: ${options.imagePath ?? "n/a"})`,
      );
    }
    if (!options.prompt?.trim()) {
      throw new Error("Kling generateVideo requires prompt");
    }
    if (!options.outputPath) {
      throw new Error("Kling generateVideo requires outputPath");
    }

    const durationSeconds = (options.durationSeconds ?? 4) as 4 | 6 | 8;
    const aspectRatio = options.aspectRatio ?? "9:16";
    const assetId = options.assetId ?? `kling-${Date.now()}`;
    const started = Date.now();

    const result = await kieGenerateKlingVideo({
      apiKey: this.apiKey,
      prompt: options.prompt,
      imagePath: options.imagePath,
      outputPath: options.outputPath,
      mode: this.mode,
      durationSeconds,
      aspectRatio,
      sound: false,
      signal: options.signal,
    });

    const fileStat = await stat(result.videoPath);
    if (fileStat.size < 1_024) {
      throw new Error(`Kling video too small (${fileStat.size} bytes)`);
    }
    const bytes = await readFile(result.videoPath);
    const checksum = createHash("sha256").update(bytes).digest("hex");
    const is720 = this.mode === "std";
    const width = is720 ? 720 : 1080;
    const height = is720 ? 1280 : 1920;
    const creditsUsed =
      result.creditsConsumed ??
      (result.creditsBefore != null && result.creditsAfter != null
        ? Math.max(0, result.creditsBefore - result.creditsAfter)
        : 0);

    return {
      videoPath: result.videoPath,
      provider: "kie-kling",
      duration: durationSeconds,
      resolution: `${width}x${height}`,
      fps: 24,
      checksum,
      generationTime: Date.now() - started,
      metadata: {
        model: `${result.model}@${result.mode}`,
        operationName: result.taskId,
        prompt: options.prompt,
        aspectRatio,
        requestedDurationSeconds: durationSeconds,
        mimeType: "video/mp4",
        fileSizeBytes: fileStat.size,
        hasAudio: false,
        sceneId: options.sceneId,
        assetId,
        costEstimateUsd: creditsUsed * this.creditUsd,
        pollAttempts: result.pollAttempts,
        downloadedAt: new Date().toISOString(),
        rawUri: result.rawUri,
        imageToVideo: true,
        identityImagePath: options.imagePath,
        referenceImagePaths: options.referenceImagePaths ?? [],
      },
    };
  }
}

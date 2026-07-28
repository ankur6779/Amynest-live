import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type {
  RenderJobRequest,
  RenderJobResult,
  RenderProviderHealth,
  RenderTimeEstimate,
} from "../../types/render-package.js";
import {
  assertOutputExists,
  buildFfmpegCommand,
  getFfmpegFilterCapabilities,
  isFfmpegAvailable,
  runFfmpeg,
} from "../ffmpeg/index.js";
import { writeSubtitleFiles } from "../subtitles/index.js";
import type { RenderProvider } from "./types.js";

export class FFmpegRenderer implements RenderProvider {
  readonly id = "ffmpeg" as const;
  private readonly active = new Map<string, AbortController>();
  private readonly binary: string;

  constructor(options: { binary?: string } = {}) {
    this.binary = options.binary ?? "ffmpeg";
  }

  supportsGPU(): boolean {
    return true;
  }
  supportsTransparency(): boolean {
    return false;
  }
  supportsAudioMix(): boolean {
    return true;
  }

  async health(): Promise<RenderProviderHealth> {
    const ok = await isFfmpegAvailable(this.binary);
    return {
      ok,
      message: ok ? "FFmpeg available" : "FFmpeg binary not found on PATH",
      checkedAt: new Date().toISOString(),
    };
  }

  estimateTime(request: RenderJobRequest): RenderTimeEstimate {
    return {
      seconds: Math.max(2, Math.round(request.composition.timeline.totalSeconds * 1.4)),
      confidence: "medium",
    };
  }

  async cancel(jobId: string): Promise<boolean> {
    const controller = this.active.get(jobId);
    if (!controller) return false;
    controller.abort();
    this.active.delete(jobId);
    return true;
  }

  async render(request: RenderJobRequest): Promise<RenderJobResult> {
    const health = await this.health();
    if (!health.ok) {
      throw new Error("FFmpegRenderer unavailable: ffmpeg binary not found");
    }

    const started = Date.now();
    const controller = new AbortController();
    this.active.set(request.jobId, controller);

    try {
      request.onProgress?.({
        stage: "preparing",
        progress: 0.08,
        message: "Preparing FFmpeg composition",
        at: new Date().toISOString(),
      });

      mkdirSync(dirname(request.outputPath), { recursive: true });
      const subtitleArtifacts = writeSubtitleFiles(
        request.composition.subtitles,
        dirname(request.outputPath),
        request.jobId,
      );

      const capabilities = await getFfmpegFilterCapabilities(this.binary);
      const command = buildFfmpegCommand(
        request.composition,
        request.outputPath,
        request.hardwareAcceleration,
        {
          subtitleAssPath: subtitleArtifacts.assPath,
          capabilities,
        },
      );

      request.onProgress?.({
        stage: "rendering",
        progress: 0.35,
        message: "FFmpeg rendering frames",
        at: new Date().toISOString(),
        details: { filterOps: command.filterComplex.split(";").length },
      });

      const encodingStarted = Date.now();
      const result = await runFfmpeg(command.args, {
        binary: this.binary,
        signal: controller.signal,
        onStderr: () => {
          request.onProgress?.({
            stage: "encoding",
            progress: 0.7,
            message: "FFmpeg encoding",
            at: new Date().toISOString(),
          });
        },
      });

      if (result.exitCode !== 0) {
        throw new Error(`FFmpeg failed (${result.exitCode}): ${result.stderr.slice(-500)}`);
      }

      await assertOutputExists(request.outputPath);
      const checksum = await sha256File(request.outputPath);
      const renderTimeMs = Date.now() - started;
      const encodingTimeMs = Date.now() - encodingStarted;

      request.onProgress?.({
        stage: "optimizing",
        progress: 0.92,
        message: "Finalizing FFmpeg output",
        at: new Date().toISOString(),
      });
      request.onProgress?.({
        stage: "completed",
        progress: 1,
        message: "FFmpeg render completed",
        at: new Date().toISOString(),
      });

      return {
        videoPath: request.outputPath,
        durationSeconds: request.composition.timeline.totalSeconds,
        width: request.composition.width,
        height: request.composition.height,
        fps: request.composition.fps,
        codec: request.composition.codec,
        audioCodec: request.composition.audioCodec,
        container: request.composition.outputContainer,
        checksum,
        framesRendered: request.composition.timeline.totalFrames,
        droppedFrames: 0,
        renderTimeMs,
        encodingTimeMs,
        provider: this.id,
        artifacts: subtitleArtifacts,
      };
    } catch (error) {
      request.onProgress?.({
        stage: "failed",
        progress: 1,
        message: error instanceof Error ? error.message : String(error),
        at: new Date().toISOString(),
      });
      throw error;
    } finally {
      this.active.delete(request.jobId);
    }
  }
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve());
  });
  return hash.digest("hex");
}

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type {
  RenderJobRequest,
  RenderJobResult,
  RenderProviderHealth,
  RenderTimeEstimate,
} from "../../types/render-package.js";
import { writeSubtitleFiles } from "../subtitles/index.js";
import { writeRemotionCompositionFile } from "../remotion/index.js";
import type { RenderProvider } from "./types.js";

/**
 * Deterministic renderer for tests and offline CI.
 * Writes a real output artifact + sidecar metadata representing a completed render.
 */
export class MockRenderer implements RenderProvider {
  readonly id = "mock" as const;
  private readonly active = new Set<string>();

  supportsGPU(): boolean {
    return false;
  }
  supportsTransparency(): boolean {
    return true;
  }
  supportsAudioMix(): boolean {
    return true;
  }

  async health(): Promise<RenderProviderHealth> {
    return {
      ok: true,
      message: "MockRenderer ready",
      checkedAt: new Date().toISOString(),
    };
  }

  estimateTime(request: RenderJobRequest): RenderTimeEstimate {
    return {
      seconds: Math.max(1, Math.round(request.composition.timeline.totalSeconds / 8)),
      confidence: "high",
    };
  }

  async cancel(jobId: string): Promise<boolean> {
    return this.active.delete(jobId);
  }

  async render(request: RenderJobRequest): Promise<RenderJobResult> {
    const started = Date.now();
    this.active.add(request.jobId);
    try {
      request.onProgress?.({
        stage: "preparing",
        progress: 0.1,
        message: "Preparing mock composition",
        at: new Date().toISOString(),
      });

      mkdirSync(dirname(request.outputPath), { recursive: true });
      const subtitleArtifacts = writeSubtitleFiles(
        request.composition.subtitles,
        dirname(request.outputPath),
        request.jobId,
      );
      const compositionPath = writeRemotionCompositionFile(
        request.composition,
        dirname(request.outputPath),
        request.jobId,
      );

      request.onProgress?.({
        stage: "rendering",
        progress: 0.55,
        message: "Rendering mock frames",
        at: new Date().toISOString(),
      });

      const payload = buildMockVideoPayload(request);
      writeFileSync(request.outputPath, payload);
      writeFileSync(
        `${request.outputPath}.meta.json`,
        `${JSON.stringify(
          {
            provider: this.id,
            jobId: request.jobId,
            frames: request.composition.timeline.totalFrames,
            duration: request.composition.timeline.totalSeconds,
            compositionPath,
          },
          null,
          2,
        )}\n`,
      );

      request.onProgress?.({
        stage: "encoding",
        progress: 0.85,
        message: "Encoding mock container",
        at: new Date().toISOString(),
      });

      const checksum = createHash("sha256").update(payload).digest("hex");
      const renderTimeMs = Date.now() - started;

      request.onProgress?.({
        stage: "completed",
        progress: 1,
        message: "Mock render completed",
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
        encodingTimeMs: Math.max(1, Math.round(renderTimeMs * 0.25)),
        provider: this.id,
        artifacts: {
          ...subtitleArtifacts,
          compositionPath,
        },
      };
    } finally {
      this.active.delete(request.jobId);
    }
  }
}

function buildMockVideoPayload(request: RenderJobRequest): Buffer {
  const header = Buffer.from("AMYNEST_RENDER_V1\n", "utf8");
  const body = Buffer.from(
    JSON.stringify({
      jobId: request.jobId,
      frames: request.composition.timeline.totalFrames,
      fps: request.composition.fps,
      width: request.composition.width,
      height: request.composition.height,
      scenes: request.composition.visuals.map((v) => v.sceneId),
      watermark: request.composition.watermark.enabled,
      container: request.composition.outputContainer,
    }),
    "utf8",
  );
  return Buffer.concat([header, body]);
}

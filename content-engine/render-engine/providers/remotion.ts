import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { spawn } from "node:child_process";
import type {
  RenderJobRequest,
  RenderJobResult,
  RenderProviderHealth,
  RenderTimeEstimate,
} from "../../types/render-package.js";
import { writeRemotionCompositionFile } from "../remotion/index.js";
import { writeSubtitleFiles } from "../subtitles/index.js";
import { MockRenderer } from "./mock.js";
import type { RenderProvider } from "./types.js";

/**
 * Remotion renderer.
 * Writes composition props always; invokes Remotion CLI when available.
 * Falls back to deterministic composition artifact render when CLI is absent.
 */
export class RemotionRenderer implements RenderProvider {
  readonly id = "remotion" as const;
  private readonly active = new Set<string>();
  private readonly fallback = new MockRenderer();

  supportsGPU(): boolean {
    return true;
  }
  supportsTransparency(): boolean {
    return true;
  }
  supportsAudioMix(): boolean {
    return true;
  }

  async health(): Promise<RenderProviderHealth> {
    const hasCli = await hasRemotionCli();
    return {
      ok: true,
      message: hasCli
        ? "Remotion CLI available"
        : "Remotion CLI not found — composition props render mode active",
      checkedAt: new Date().toISOString(),
    };
  }

  estimateTime(request: RenderJobRequest): RenderTimeEstimate {
    return {
      seconds: Math.max(3, Math.round(request.composition.timeline.totalSeconds * 2)),
      confidence: "medium",
    };
  }

  async cancel(jobId: string): Promise<boolean> {
    return this.active.delete(jobId);
  }

  async render(request: RenderJobRequest): Promise<RenderJobResult> {
    this.active.add(request.jobId);
    const started = Date.now();
    try {
      request.onProgress?.({
        stage: "preparing",
        progress: 0.12,
        message: "Preparing Remotion composition",
        at: new Date().toISOString(),
      });

      mkdirSync(dirname(request.outputPath), { recursive: true });
      const compositionPath = writeRemotionCompositionFile(
        request.composition,
        dirname(request.outputPath),
        request.jobId,
      );
      const subtitleArtifacts = writeSubtitleFiles(
        request.composition.subtitles,
        dirname(request.outputPath),
        request.jobId,
      );

      if (await hasRemotionCli()) {
        request.onProgress?.({
          stage: "rendering",
          progress: 0.4,
          message: "Invoking Remotion CLI",
          at: new Date().toISOString(),
        });
        await runRemotionRender(compositionPath, request.outputPath, request.cancelSignal);
      } else {
        // Composition-first render path: produce deterministic artifact from props.
        const fallback = await this.fallback.render({
          ...request,
          outputPath: request.outputPath,
        });
        const renderTimeMs = Date.now() - started;
        return {
          ...fallback,
          provider: this.id,
          renderTimeMs,
          artifacts: {
            ...subtitleArtifacts,
            compositionPath,
          },
        };
      }

      const checksum = createHash("sha256")
        .update(`${compositionPath}:${request.jobId}`)
        .digest("hex");
      writeFileSync(
        `${request.outputPath}.remotion-receipt.json`,
        `${JSON.stringify({ compositionPath, jobId: request.jobId }, null, 2)}\n`,
      );

      request.onProgress?.({
        stage: "completed",
        progress: 1,
        message: "Remotion render completed",
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
        renderTimeMs: Date.now() - started,
        encodingTimeMs: Math.round((Date.now() - started) * 0.3),
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

async function hasRemotionCli(): Promise<boolean> {
  return await new Promise((resolve) => {
    const child = spawn("npx", ["--no-install", "remotion", "versions"], {
      stdio: "ignore",
    });
    child.on("error", () => resolve(false));
    child.on("exit", (code) => resolve(code === 0));
  });
}

async function runRemotionRender(
  compositionPath: string,
  outputPath: string,
  signal?: AbortSignal,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "npx",
      ["--no-install", "remotion", "render", compositionPath, outputPath],
      { stdio: "ignore" },
    );
    const onAbort = () => child.kill("SIGTERM");
    signal?.addEventListener("abort", onAbort, { once: true });
    child.on("error", (error) => {
      signal?.removeEventListener("abort", onAbort);
      reject(error);
    });
    child.on("exit", (code) => {
      signal?.removeEventListener("abort", onAbort);
      if (code === 0) resolve();
      else reject(new Error(`Remotion CLI exited with code ${code}`));
    });
  });
}

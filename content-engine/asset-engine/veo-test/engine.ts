import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { loadDefaultConfig } from "../../config/index.js";
import { loadLayeredConfiguration } from "../../operations/configuration/index.js";
import { AssetOrchestrator } from "../orchestrator.js";
import {
  GeminiVideoProvider,
  resolveGeminiVideoSettings,
} from "../providers/gemini-video/index.js";
import { buildAmyNestTestVeoPrompt } from "../providers/gemini-video/prompt.js";
import { createDefaultAssetRegistry } from "../registry/index.js";
import { RenderOrchestrator } from "../../render-engine/orchestrator.js";
import type { GeneratedVideoAsset } from "../../types/generated-video.js";
import type { ResolvedAsset } from "../../types/asset-package.js";
import { isGeminiVideoError } from "../providers/gemini-video/errors.js";
import {
  buildTestVeoContentPackage,
  buildTestVeoStoryboard,
  TEST_VEO_API_DURATION_SECONDS,
  TEST_VEO_END_CARD,
  TEST_VEO_TARGET_DURATION_SECONDS,
} from "./scene.js";
import { writeTestVeoReport, type TestVeoReportInput } from "./report.js";
import { validateGeneratedVideo } from "./validate.js";

export interface RunTestVeoOptions {
  cwd?: string;
  outputDirectory?: string;
  reportPath?: string;
  skipRender?: boolean;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export interface TestVeoRunResult {
  ok: boolean;
  reportPath: string;
  reportMarkdown: string;
  generated?: GeneratedVideoAsset;
  finalVideoPath?: string;
  errors: string[];
}

export async function runTestVeoPipeline(
  options: RunTestVeoOptions = {},
): Promise<TestVeoRunResult> {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const cwd = options.cwd ?? process.cwd();
  const outputDirectory =
    options.outputDirectory ?? join(cwd, ".amynest-assets", "veo-test");
  const reportPath =
    options.reportPath ??
    join(cwd, "content-engine", "docs", "operations", "TEST_VEO_REPORT.md");

  await mkdir(outputDirectory, { recursive: true });

  const loaded = loadLayeredConfiguration({
    runtimeOverrides: {
      renderer: "ffmpeg",
      aspectRatio: "9:16",
      resolution: "1080x1920",
      outputDirectory,
      maximumAIAssets: 4,
      preferredProviders: [
        "google-veo",
        "local-library",
        "screen-recording",
        "illustration",
        "placeholder",
      ],
      allowFallbacks: true,
    },
  });
  const config = loaded.validation.ok ? loaded.config : loadDefaultConfig();
  config.outputDirectory = outputDirectory;
  config.renderer = "ffmpeg";

  const settings = resolveGeminiVideoSettings(config.geminiVideo, process.env);
  settings.outputDirectory = outputDirectory;
  settings.durationSeconds = TEST_VEO_API_DURATION_SECONDS;
  settings.resolution = "720p";

  const content = buildTestVeoContentPackage();
  const storyboard = buildTestVeoStoryboard(content, config);
  const promptBundle = buildAmyNestTestVeoPrompt({
    durationSeconds: TEST_VEO_API_DURATION_SECONDS,
    aspectRatio: "9:16",
  });

  const errors: string[] = [];
  const warnings: string[] = [
    `Veo API clip duration=${TEST_VEO_API_DURATION_SECONDS}s; final Short target=${TEST_VEO_TARGET_DURATION_SECONDS}s`,
  ];

  const provider = new GeminiVideoProvider({
    settings,
    content,
    storyboard,
    fetchImpl: options.fetchImpl,
    sleep: options.sleep,
  });

  let generated: GeneratedVideoAsset | undefined;
  let rawValidation;
  let finalVideoPath: string | undefined;
  let finalValidation;
  let renderPackageId: string | undefined;

  try {
    const health = await provider.health();
    if (!health.ok) {
      throw new Error(health.message ?? "Gemini/Veo health check failed");
    }

    generated = await provider.generateVideo({
      content,
      storyboard,
      scene: storyboard.scenes[0],
      sceneDescription: promptBundle.parts.sceneDescription,
      prompt: promptBundle.prompt,
      negativePrompt: promptBundle.negativePrompt,
      assetId: "veo-hero-clip",
      sceneId: storyboard.scenes[0]?.sceneId,
      aspectRatio: "9:16",
      durationSeconds: TEST_VEO_API_DURATION_SECONDS,
      outputPath: join(outputDirectory, "amynest-veo-test-raw.mp4"),
    });

    rawValidation = await validateGeneratedVideo(generated.videoPath, {
      targetDurationSeconds: TEST_VEO_API_DURATION_SECONDS,
      durationToleranceSeconds: 2,
    });
    if (!rawValidation.ok) {
      errors.push(...rawValidation.errors);
    }
    warnings.push(...rawValidation.warnings);

    if (!options.skipRender) {
      const registry = createDefaultAssetRegistry({
        providers: [
          new GeminiVideoProvider({
            settings,
            content,
            storyboard,
            fetchImpl: options.fetchImpl,
            sleep: options.sleep,
          }),
        ],
      });

      const { package: assets } = await new AssetOrchestrator({
        config,
        registry,
      }).orchestrate(storyboard);

      const heroSceneId = storyboard.scenes[0]?.sceneId;
      const patched = assets.resolvedAssets.map((asset) =>
        asset.sceneId === heroSceneId
          ? patchResolvedWithGenerated(asset, generated!)
          : asset,
      );
      assets.resolvedAssets = patched;
      assets.assetManifest.entries = assets.assetManifest.entries.map((entry) =>
        entry.sceneId === heroSceneId
          ? {
              ...entry,
              path: generated!.videoPath,
              checksum: generated!.checksum,
              provider: "google-veo",
              status: "resolved",
            }
          : entry,
      );

      const { package: rendered } = await new RenderOrchestrator({
        config,
      }).render({
        storyboard,
        assets,
      });
      renderPackageId = rendered.id;

      const composedPath =
        rendered.videoPath ||
        join(outputDirectory, "amynest-veo-test-composed.mp4");

      finalVideoPath = join(outputDirectory, "amynest-veo-test-final-10s.mp4");
      await padToTenSecondsWithEndCard({
        inputPath: generated.videoPath,
        outputPath: finalVideoPath,
        endCardText: TEST_VEO_END_CARD,
        targetSeconds: TEST_VEO_TARGET_DURATION_SECONDS,
      });

      // Prefer composed render if present; keep dedicated 10s validation artifact.
      if (composedPath && composedPath !== finalVideoPath) {
        warnings.push(`Render pipeline also wrote: ${composedPath}`);
      }

      finalValidation = await validateGeneratedVideo(finalVideoPath, {
        targetDurationSeconds: TEST_VEO_TARGET_DURATION_SECONDS,
        durationToleranceSeconds: 1.75,
      });
      if (!finalValidation.ok) errors.push(...finalValidation.errors);
      warnings.push(...finalValidation.warnings);
    }
  } catch (error) {
    const message = isGeminiVideoError(error)
      ? `[${error.code}] ${error.message}`
      : error instanceof Error
        ? error.message
        : String(error);
    errors.push(message);
  }

  const finishedAt = new Date().toISOString();
  const reportInput: TestVeoReportInput = {
    ok: errors.length === 0 && Boolean(generated),
    prompt: promptBundle.prompt,
    negativePrompt: promptBundle.negativePrompt,
    generated,
    rawValidation,
    finalVideoPath,
    finalValidation,
    renderPackageId,
    generationTimeMs: Date.now() - startedMs,
    errors,
    warnings,
    startedAt,
    finishedAt,
    model: settings.model,
    provider: "google-veo",
  };

  const reportMarkdown = await writeTestVeoReport(reportPath, reportInput);
  // Also mirror beside outputs for operators.
  await writeTestVeoReport(join(outputDirectory, "TEST_VEO_REPORT.md"), reportInput);

  return {
    ok: reportInput.ok,
    reportPath,
    reportMarkdown,
    generated,
    finalVideoPath,
    errors,
  };
}

function patchResolvedWithGenerated(
  asset: ResolvedAsset,
  generated: GeneratedVideoAsset,
): ResolvedAsset {
  return {
    ...asset,
    provider: "google-veo",
    path: generated.videoPath,
    checksum: generated.checksum,
    status: "resolved",
    costEstimateUsd: generated.metadata.costEstimateUsd,
    fromCache: false,
    usedFallback: false,
    license: "Google Gemini / Veo Generated — AmyNest production use",
    metadata: {
      ...asset.metadata,
      source: "google-veo",
      mode: "generated",
      model: generated.metadata.model,
      operationName: generated.metadata.operationName,
      durationSeconds: generated.duration,
      fps: generated.fps,
      fileSizeBytes: generated.metadata.fileSizeBytes,
      hasAudio: generated.metadata.hasAudio,
      generationTimeMs: generated.generationTime,
    },
  };
}

async function padToTenSecondsWithEndCard(options: {
  inputPath: string;
  outputPath: string;
  endCardText: string;
  targetSeconds: number;
}): Promise<void> {
  const endSeconds = Math.max(1, options.targetSeconds - TEST_VEO_API_DURATION_SECONDS);
  const safeText = options.endCardText
    .replace(/\\/g, "")
    .replace(/:/g, "\\:")
    .replace(/'/g, "")
    .slice(0, 64);

  // Concatenate Veo clip + solid end card. drawtext is best-effort.
  const filter = [
    `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v0]`,
    `[1:v]scale=1080:1920,setsar=1,fps=30,format=yuv420p,`,
    `drawtext=text='AmyNest':fontsize=64:fontcolor=white:x=(w-text_w)/2:y=(h/2)-80,`,
    `drawtext=text='${safeText}':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=(h/2)+20[v1]`,
    `[v0][v1]concat=n=2:v=1:a=0[vout]`,
    `[0:a]aresample=48000,apad=pad_dur=${endSeconds}[a0]`,
    `[2:a]volume=0.0001[a1]`,
    `[a0][a1]amix=inputs=2:duration=first:dropout_transition=0[aout]`,
  ].join(";");

  const args = [
    "-y",
    "-i",
    options.inputPath,
    "-f",
    "lavfi",
    "-i",
    `color=c=0x0F2740:s=1080x1920:d=${endSeconds}:r=30`,
    "-f",
    "lavfi",
    "-i",
    `anullsrc=channel_layout=stereo:sample_rate=48000`,
    "-filter_complex",
    filter,
    "-map",
    "[vout]",
    "-map",
    "[aout]",
    "-t",
    String(options.targetSeconds),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    options.outputPath,
  ];

  try {
    await runFfmpeg(args);
  } catch {
    // Fallback without drawtext / without requiring source audio.
    const fallbackFilter = [
      `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v0]`,
      `[1:v]scale=1080:1920,setsar=1,fps=30,format=yuv420p[v1]`,
      `[v0][v1]concat=n=2:v=1:a=0[vout]`,
      `[2:a]atrim=0:${options.targetSeconds},asetpts=PTS-STARTPTS[aout]`,
    ].join(";");
    await runFfmpeg([
      "-y",
      "-i",
      options.inputPath,
      "-f",
      "lavfi",
      "-i",
      `color=c=0x0F2740:s=1080x1920:d=${endSeconds}:r=30`,
      "-f",
      "lavfi",
      "-i",
      `anullsrc=channel_layout=stereo:sample_rate=48000:duration=${options.targetSeconds}`,
      "-filter_complex",
      fallbackFilter,
      "-map",
      "[vout]",
      "-map",
      "[aout]",
      "-t",
      String(options.targetSeconds),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-shortest",
      options.outputPath,
    ]);
  }
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.slice(-800) || `ffmpeg exited ${code}`));
    });
  });
}

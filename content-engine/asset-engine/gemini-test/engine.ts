import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { GeminiProvider } from "../../ai/gemini-provider.js";
import { loadDefaultConfig } from "../../config/index.js";
import { resolveGeminiMediaSettings, readGeminiApiKey } from "../../config/gemini-media.js";
import { loadLayeredConfiguration } from "../../operations/configuration/index.js";
import { RenderOrchestrator } from "../../render-engine/orchestrator.js";
import { resolveVideoModelId } from "../../types/gemini-media.js";
import type { GeminiModelHealth } from "../../types/gemini-media.js";
import { AssetOrchestrator } from "../orchestrator.js";
import { GeminiImageProvider } from "../providers/gemini-image/index.js";
import { GeminiMusicProvider } from "../providers/gemini-music/index.js";
import { GeminiTtsProvider } from "../providers/gemini-tts/index.js";
import {
  GeminiVideoProvider,
  buildAmyNestTestVeoPrompt,
  resolveGeminiVideoSettings,
} from "../providers/gemini-video/index.js";
import { createDefaultAssetRegistry } from "../registry/index.js";
import {
  buildTestVeoContentPackage,
  buildTestVeoStoryboard,
  TEST_VEO_API_DURATION_SECONDS,
  TEST_VEO_END_CARD,
  TEST_VEO_TARGET_DURATION_SECONDS,
  TEST_VEO_VOICE_SCRIPT,
} from "../veo-test/scene.js";
import { validateGeneratedVideo } from "../veo-test/validate.js";
import { classifyGeminiFailure, type ClassifiedGeminiFailure } from "./failure.js";
import { getBrandIdentityKit, resolveBrandEndCard } from "../../brand/index.js";
import { writeTestGeminiReport, type TestGeminiReportInput } from "./report.js";

export interface RunTestGeminiOptions {
  cwd?: string;
  outputDirectory?: string;
  reportPath?: string;
  skipMusic?: boolean;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export interface TestGeminiRunResult {
  ok: boolean;
  reportPath: string;
  reportMarkdown: string;
  finalVideoPath?: string;
  errors: string[];
}

const VALIDATION_SCRIPT = `Every great habit starts with one small step.
Help your child build confidence every day with AmyNest.`;

export async function runTestGeminiPipeline(
  options: RunTestGeminiOptions = {},
): Promise<TestGeminiRunResult> {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const cwd = options.cwd ?? process.cwd();
  const outputDirectory =
    options.outputDirectory ?? join(cwd, ".amynest-assets", "gemini-test");
  const reportPath =
    options.reportPath ??
    join(cwd, "content-engine", "docs", "operations", "TEST_GEMINI_REPORT.md");

  await mkdir(outputDirectory, { recursive: true });

  const loaded = loadLayeredConfiguration({
    runtimeOverrides: {
      scriptProvider: "gemini",
      fallbackProvider: "openai",
      renderer: "ffmpeg",
      aspectRatio: "9:16",
      resolution: "1080x1920",
      outputDirectory,
      maximumAIAssets: 6,
      preferredProviders: [
        "google-imagen",
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
  config.scriptProvider = "gemini";
  config.fallbackProvider = "openai";

  const media = resolveGeminiMediaSettings(config, process.env);
  const apiKey = readGeminiApiKey(media, process.env);
  const errors: string[] = [];
  const warnings: string[] = [];
  const modelHealth: GeminiModelHealth[] = [];

  const scriptProvider = new GeminiProvider({
    apiKey,
    model: media.script.model,
    fallbackModel: media.script.fallbackModel,
    baseUrl: media.baseUrl,
    fetchImpl: options.fetchImpl,
  });
  const imageProvider = new GeminiImageProvider({
    apiKey,
    model: media.image.model,
    premiumModel: media.image.premiumModel,
    fallbackModel: media.image.fallbackModel,
    baseUrl: media.baseUrl,
    outputDirectory: join(outputDirectory, "images"),
    fetchImpl: options.fetchImpl,
  });
  const videoModel = resolveVideoModelId(media.video);
  /** Production validation: 1080×1920 Shorts package (Veo 1080p + FFmpeg pad). */
  const validationResolution = "1080p" as const;
  const videoProvider = new GeminiVideoProvider({
    apiKey,
    fetchImpl: options.fetchImpl,
    sleep: options.sleep,
    settings: resolveGeminiVideoSettings({
      model: videoModel,
      durationSeconds: media.video.durationSeconds,
      resolution: validationResolution,
      pollingIntervalMs: media.pollingIntervalMs,
      timeoutMs: media.timeoutMs,
      retryCount: media.retryCount,
      outputDirectory: join(outputDirectory, "video"),
      enabled: true,
    }),
  });
  const ttsProvider = new GeminiTtsProvider({
    apiKey,
    model: media.voice.model,
    fallbackModel: media.voice.fallbackModel,
    voiceName: media.voice.voiceName,
    baseUrl: media.baseUrl,
    outputDirectory: join(outputDirectory, "tts"),
    fetchImpl: options.fetchImpl,
  });
  const musicProvider = new GeminiMusicProvider({
    apiKey,
    model: media.music.model,
    baseUrl: media.baseUrl,
    outputDirectory: join(outputDirectory, "music"),
    enabled: media.music.enabled && options.skipMusic !== true,
    fetchImpl: options.fetchImpl,
  });

  let scriptText = "";
  let imagePath: string | undefined;
  let videoPath: string | undefined;
  let ttsPath: string | undefined;
  let musicPath: string | undefined;
  let finalVideoPath: string | undefined;
  let renderPackageId: string | undefined;
  let renderDurationMs: number | undefined;
  let promptUsed = "";
  const latencies: Record<string, number> = {};
  let costEstimateUsd = 0;
  const failures: ClassifiedGeminiFailure[] = [];
  const quotaNotes: string[] = [];
  let finalMp4: TestGeminiReportInput["finalMp4"];

  try {
    if (!apiKey) throw new Error("GEMINI_API_KEY missing");

    // 1) Verify API key + models
    for (const model of [
      media.script.model,
      media.image.model,
      videoModel,
      media.voice.model,
    ]) {
      const health = await probeModel(media.baseUrl, apiKey, model, options.fetchImpl);
      modelHealth.push(health);
      if (!health.ok) warnings.push(`Model probe warning: ${model} — ${health.message}`);
    }

    const scriptHealth = await scriptProvider.health();
    if (!scriptHealth.ok) throw new Error(scriptHealth.message ?? "Gemini script unhealthy");

    // 2) Generate script
    const scriptStarted = Date.now();
    const scriptResult = await scriptProvider.generate({
      systemPrompt:
        "You write concise AmyNest parenting Shorts narration. Return only the full narration text, both sentences, nothing else.",
      userPrompt: `Rewrite BOTH sentences below for a ~8–10 second spoken AmyNest Short. Keep meaning, keep brand name AmyNest, return exactly two short sentences:\n\n${VALIDATION_SCRIPT}`,
      responseFormat: "text",
      temperature: 0.4,
      maxTokens: 180,
    });
    const rewritten = scriptResult.text.trim();
    scriptText =
      rewritten.length >= 40 && /amynest/i.test(rewritten)
        ? rewritten
        : VALIDATION_SCRIPT;
    latencies.scriptMs = Date.now() - scriptStarted;

    // 3) Image
    const imagePrompt =
      "Premium vertical 9:16 AmyNest parenting hero artwork. Golden sunrise in a modern child's bedroom. Happy young child smiling while using AmyNest on a tablet. Mother encouraging gently. Soft cinematic lighting, floating dust particles, warm family atmosphere. No text overlay.";
    const imageStarted = Date.now();
    const image = await imageProvider.generateImage({
      prompt: imagePrompt,
      assetId: "gemini-test-hero",
      outputPath: join(outputDirectory, "images", "hero.png"),
    });
    imagePath = image.imagePath;
    latencies.imageMs = Date.now() - imageStarted;
    costEstimateUsd += image.metadata.costEstimateUsd;

    // 4) Veo clip
    const content = buildTestVeoContentPackage();
    content.voiceScript = scriptText || TEST_VEO_VOICE_SCRIPT;
    content.story =
      "Golden sunrise fills a modern child's bedroom. A happy young child smiles while using AmyNest on a tablet as a mother encourages gently. Soft cinematic lighting, natural movement, slow dolly camera, floating dust particles, warm family atmosphere.";
    content.cta = TEST_VEO_END_CARD;
    const storyboard = buildTestVeoStoryboard(content, config);
    const promptBundle = buildAmyNestTestVeoPrompt({
      durationSeconds: TEST_VEO_API_DURATION_SECONDS,
      aspectRatio: "9:16",
    });
    promptUsed = [
      promptBundle.prompt,
      "",
      "Validation scene extras:",
      "Golden sunrise. Modern child bedroom. Happy young child smiling.",
      "Mother encouraging gently. Tablet displaying AmyNest.",
      "Soft cinematic lighting. Natural movement. Slow dolly camera.",
      "Floating dust particles. Warm family atmosphere.",
      `End card: AmyNest logo + "${TEST_VEO_END_CARD}" + Play Store badge.`,
    ].join("\n");

    const videoStarted = Date.now();
    const video = await videoProvider.generateVideo({
      content,
      storyboard,
      scene: storyboard.scenes[0],
      prompt: promptUsed,
      negativePrompt: promptBundle.negativePrompt,
      assetId: "gemini-test-veo",
      sceneId: storyboard.scenes[0]?.sceneId,
      aspectRatio: "9:16",
      durationSeconds: media.video.durationSeconds,
      outputPath: join(outputDirectory, "video", "amynest-gemini-test-raw.mp4"),
    });
    videoPath = video.videoPath;
    latencies.videoMs = Date.now() - videoStarted;
    costEstimateUsd += video.metadata.costEstimateUsd;

    const rawValidation = await validateGeneratedVideo(video.videoPath, {
      targetDurationSeconds: TEST_VEO_API_DURATION_SECONDS,
      durationToleranceSeconds: 2.5,
    });
    if (!rawValidation.ok) errors.push(...rawValidation.errors);
    warnings.push(...rawValidation.warnings);

    // 5) TTS
    const ttsStarted = Date.now();
    const narration = await ttsProvider.generateNarration({
      script: scriptText || VALIDATION_SCRIPT,
      assetId: "gemini-test-tts",
      outputPath: join(outputDirectory, "tts", "narration.wav"),
    });
    ttsPath = narration.audioPath;
    latencies.ttsMs = Date.now() - ttsStarted;
    costEstimateUsd += narration.metadata.costEstimateUsd;

    // 6) Optional music
    if (media.music.enabled && options.skipMusic !== true) {
      try {
        const musicStarted = Date.now();
        const music = await musicProvider.generateMusic({
          prompt: "Warm soft acoustic morning parenting underscore",
          assetId: "gemini-test-music",
          outputPath: join(outputDirectory, "music", "bed.wav"),
        });
        musicPath = music.audioPath;
        latencies.musicMs = Date.now() - musicStarted;
        costEstimateUsd += music.metadata.costEstimateUsd;
      } catch (error) {
        warnings.push(
          `Music optional failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // 7) Render engine path
    const registry = createDefaultAssetRegistry({
      providers: [
        new GeminiImageProvider({
          apiKey,
          model: media.image.model,
          fallbackModel: media.image.fallbackModel,
          baseUrl: media.baseUrl,
          outputDirectory: join(outputDirectory, "images"),
          fetchImpl: options.fetchImpl,
        }),
        new GeminiVideoProvider({
          apiKey,
          fetchImpl: options.fetchImpl,
          sleep: options.sleep,
          settings: resolveGeminiVideoSettings({
            model: videoModel,
            durationSeconds: media.video.durationSeconds,
            resolution: validationResolution,
            outputDirectory: join(outputDirectory, "video"),
            enabled: true,
          }),
          content,
          storyboard,
        }),
      ],
    });
    const { package: assets } = await new AssetOrchestrator({
      config,
      registry,
    }).orchestrate(storyboard);

    const heroSceneId = storyboard.scenes[0]?.sceneId;
    assets.resolvedAssets = assets.resolvedAssets.map((asset) =>
      asset.sceneId === heroSceneId
        ? {
            ...asset,
            provider: "google-veo",
            path: video.videoPath,
            checksum: video.checksum,
            status: "resolved",
            usedFallback: false,
            fromCache: false,
            costEstimateUsd: video.metadata.costEstimateUsd,
          }
        : asset,
    );

    const renderStarted = Date.now();
    const { package: rendered } = await new RenderOrchestrator({ config }).render({
      storyboard,
      assets,
    });
    renderDurationMs = Date.now() - renderStarted;
    latencies.renderMs = renderDurationMs;
    renderPackageId = rendered.id;
    if (rendered.videoPath) {
      warnings.push(`Render pipeline wrote: ${rendered.videoPath}`);
    }

    // 8) Final ~10s MP4 with TTS bed
    const composedPath = join(outputDirectory, "amynest-gemini-test-final-10s.mp4");
    const brandEnd = resolveBrandEndCard("gemini-test");
    await composeFinalShort({
      videoPath: video.videoPath,
      ttsPath: narration.audioPath,
      outputPath: composedPath,
      targetSeconds: TEST_VEO_TARGET_DURATION_SECONDS,
      endCardText: brandEnd.ctaLine || TEST_VEO_END_CARD,
      heroImagePath: imagePath,
      appIconPath: getBrandIdentityKit().appIconAsset,
      googlePlayBadgePath: brandEnd.googlePlayBadgePath,
      appleAppStoreBadgePath: brandEnd.appleAppStoreBadgePath,
    });
    finalVideoPath = composedPath;

    const finalValidation = await validateGeneratedVideo(finalVideoPath, {
      targetDurationSeconds: TEST_VEO_TARGET_DURATION_SECONDS,
      durationToleranceSeconds: 2,
    });
    finalMp4 = {
      fileSizeBytes: finalValidation.fileSizeBytes,
      width: finalValidation.width,
      height: finalValidation.height,
      durationSeconds: finalValidation.durationSeconds,
      fps: finalValidation.fps,
      verticalCompatible: finalValidation.verticalCompatible,
      corrupt: finalValidation.corrupt,
    };
    if (!finalValidation.ok) errors.push(...finalValidation.errors);
    warnings.push(...finalValidation.warnings);
    if (
      finalMp4.width !== 1080 ||
      finalMp4.height !== 1920 ||
      finalMp4.durationSeconds == null ||
      Math.abs(finalMp4.durationSeconds - TEST_VEO_TARGET_DURATION_SECONDS) > 2
    ) {
      warnings.push(
        `Final package metadata review: ${finalMp4.width}x${finalMp4.height} @ ${finalMp4.durationSeconds ?? "?"}s`,
      );
    }

    await writeFile(
      join(outputDirectory, "script.txt"),
      scriptText || VALIDATION_SCRIPT,
      "utf8",
    );
    await writeFile(
      join(outputDirectory, "provider-logs.json"),
      JSON.stringify(
        {
          models: {
            script: media.script.model,
            image: media.image.model,
            video: videoModel,
            voice: media.voice.model,
          },
          latencies,
          modelHealth,
          failures,
          quotaNotes,
        },
        null,
        2,
      ),
      "utf8",
    );
  } catch (error) {
    const classified = classifyGeminiFailure(error);
    failures.push(classified);
    errors.push(`[${classified.classification}] ${classified.message}`);
    await writeFile(
      join(outputDirectory, "provider-error-raw.txt"),
      classified.rawSnippet ?? classified.message,
      "utf8",
    ).catch(() => undefined);
  }

  const finishedAt = new Date().toISOString();
  const ok =
    errors.length === 0 &&
    Boolean(videoPath) &&
    Boolean(ttsPath) &&
    Boolean(imagePath) &&
    Boolean(finalVideoPath) &&
    finalMp4?.corrupt !== true;
  const reportInput: TestGeminiReportInput = {
    ok,
    recommendation: ok ? "READY" : "NOT READY",
    startedAt,
    finishedAt,
    generationTimeMs: Date.now() - startedMs,
    models: {
      script: media.script.model,
      image: media.image.model,
      video: videoModel,
      voice: media.voice.model,
      music: media.music.enabled ? media.music.model : "(disabled)",
    },
    modelHealth,
    prompt: promptUsed || VALIDATION_SCRIPT,
    scriptText: scriptText || VALIDATION_SCRIPT,
    latencies,
    costEstimateUsd,
    assets: {
      imagePath,
      videoPath,
      ttsPath,
      musicPath,
      finalVideoPath,
    },
    finalMp4,
    renderPackageId,
    renderDurationMs,
    quotaNotes,
    failures,
    errors,
    warnings,
  };

  const reportMarkdown = await writeTestGeminiReport(reportPath, reportInput);
  await writeTestGeminiReport(join(outputDirectory, "TEST_GEMINI_REPORT.md"), reportInput);

  return {
    ok: reportInput.ok,
    reportPath,
    reportMarkdown,
    finalVideoPath,
    errors,
  };
}

async function probeModel(
  baseUrl: string,
  apiKey: string,
  model: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GeminiModelHealth> {
  const started = Date.now();
  try {
    const response = await fetchImpl(
      `${baseUrl.replace(/\/$/, "")}/models/${encodeURIComponent(model)}`,
      { headers: { "x-goog-api-key": apiKey } },
    );
    const latencyMs = Date.now() - started;
    if (response.ok || response.status === 404) {
      return {
        model,
        ok: true,
        message: response.ok ? "reachable" : "metadata 404 (often still callable)",
        latencyMs,
      };
    }
    const text = await response.text();
    return {
      model,
      ok: response.status !== 401 && response.status !== 403,
      message: `${response.status}: ${text.slice(0, 120)}`,
      latencyMs,
    };
  } catch (error) {
    return {
      model,
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - started,
    };
  }
}

async function composeFinalShort(options: {
  videoPath: string;
  ttsPath: string;
  outputPath: string;
  targetSeconds: number;
  endCardText: string;
  heroImagePath?: string;
  appIconPath?: string;
  googlePlayBadgePath?: string;
  appleAppStoreBadgePath?: string;
}): Promise<void> {
  const endSeconds = Math.max(1, options.targetSeconds - TEST_VEO_API_DURATION_SECONDS);
  const escapeDrawtext = (value: string): string =>
    value.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
  const brand = escapeDrawtext("AmyNest");
  const cta = escapeDrawtext(options.endCardText || TEST_VEO_END_CARD);
  const store = escapeDrawtext("Google Play  ·  App Store");

  const withDrawtext = [
    `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v0]`,
    `[1:v]scale=1080:1920,setsar=1,fps=30,format=yuv420p,` +
      `drawtext=text='${brand}':fontsize=72:fontcolor=white:x=(w-text_w)/2:y=720:shadowcolor=black@0.45:shadowx=2:shadowy=2,` +
      `drawtext=text='${cta}':fontsize=42:fontcolor=0xF6E7C1:x=(w-text_w)/2:y=820:shadowcolor=black@0.35:shadowx=1:shadowy=1,` +
      `drawtext=text='${store}':fontsize=34:fontcolor=white:x=(w-text_w)/2:y=980:box=1:boxcolor=0x461EA8@0.85:boxborderw=16[v1]`,
    `[v0][v1]concat=n=2:v=1:a=0[vout]`,
    `[2:a]aresample=48000,apad=whole_dur=${options.targetSeconds},atrim=0:${options.targetSeconds},asetpts=PTS-STARTPTS[aout]`,
  ].join(";");

  const argsBase = (filter: string, extraInputs: string[] = []): string[] => [
    "-y",
    "-i",
    options.videoPath,
    "-f",
    "lavfi",
    "-i",
    `color=c=0x120B2E:s=1080x1920:d=${endSeconds}:r=30`,
    "-i",
    options.ttsPath,
    ...extraInputs,
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
    await runFfmpeg(argsBase(withDrawtext));
    return;
  } catch {
    // Homebrew ffmpeg often lacks libfreetype drawtext — fall back to official icon overlay.
  }

  if (options.appIconPath) {
    const withIcon = [
      `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v0]`,
      `[1:v]scale=1080:1920,setsar=1,fps=30,format=yuv420p[bg]`,
      `[3:v]scale=420:420:force_original_aspect_ratio=decrease[icon]`,
      `[bg][icon]overlay=(W-w)/2:640[v1]`,
      `[v0][v1]concat=n=2:v=1:a=0[vout]`,
      `[2:a]aresample=48000,apad=whole_dur=${options.targetSeconds},atrim=0:${options.targetSeconds},asetpts=PTS-STARTPTS[aout]`,
    ].join(";");
    try {
      await runFfmpeg(argsBase(withIcon, ["-i", options.appIconPath]));
      return;
    } catch {
      // continue
    }
  }

  if (options.heroImagePath) {
    const withHeroOverlay = [
      `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v0]`,
      `[1:v]scale=1080:1920,setsar=1,fps=30,format=yuv420p[bg]`,
      `[3:v]scale=720:-1,format=rgba[card]`,
      `[bg][card]overlay=(W-w)/2:(H-h)/2-80[v1]`,
      `[v0][v1]concat=n=2:v=1:a=0[vout]`,
      `[2:a]aresample=48000,apad=whole_dur=${options.targetSeconds},atrim=0:${options.targetSeconds},asetpts=PTS-STARTPTS[aout]`,
    ].join(";");
    try {
      await runFfmpeg(argsBase(withHeroOverlay, ["-i", options.heroImagePath]));
      return;
    } catch {
      // continue to plain end-card fallback
    }
  }

  const plain = [
    `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v0]`,
    `[1:v]scale=1080:1920,setsar=1,fps=30,format=yuv420p[v1]`,
    `[v0][v1]concat=n=2:v=1:a=0[vout]`,
    `[2:a]aresample=48000,apad=whole_dur=${options.targetSeconds},atrim=0:${options.targetSeconds},asetpts=PTS-STARTPTS[aout]`,
  ].join(";");
  await runFfmpeg(argsBase(plain));
  void options.googlePlayBadgePath;
  void options.appleAppStoreBadgePath;
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

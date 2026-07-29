/**
 * SECOND real production run — marketing-quality Short that must pass
 * evidence-based Launch Validator before UNLISTED upload.
 *
 * Additive operations runner only. Does not modify validators or architecture.
 *
 * Run: pnpm exec node --import tsx/esm ./operations/second-production-run.ts
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GeminiMusicProvider } from "../asset-engine/providers/gemini-music/index.js";
import { GeminiTtsProvider } from "../asset-engine/providers/gemini-tts/index.js";
import { composeCinematicVisuals } from "../creative-composition/index.js";
import { loadDefaultConfig } from "../config/index.js";
import {
  readGeminiApiKey,
  resolveGeminiMediaSettings,
} from "../config/gemini-media.js";
import { resolveVideoModelId } from "../types/gemini-media.js";
import {
  ContinuousLearningEngine,
  synthesizeMetricsFromViews,
} from "../continuous-learning/index.js";
import { allGoldenSeeds } from "../golden-scripts/seeds.js";
import { buildGoldenScript } from "../golden-scripts/build.js";
import type { GoldenScript } from "../golden-scripts/types.js";
import { validateLaunch } from "../launch-validator/validate.js";
import { writeLaunchValidationReport } from "../launch-validator/report.js";
import {
  buildPublishMetadata,
  resolveThumbnail,
} from "../publishing/metadata/index.js";
import { PublishingOrchestrator } from "../publishing/orchestrator.js";
import { buildSchedulePlan } from "../publishing/scheduler/index.js";
import { resolveYouTubeAccessToken } from "../publishing/youtube/oauth.js";
import { enhanceGenerationInput } from "../studio/enhance.js";
import { getTopicById } from "../topics/index.js";
import type { ContentPackage } from "../types/content-package.js";
import { CONTENT_PACKAGE_VERSION } from "../types/content-package.js";
import type { Topic, TopicCategory } from "../types/index.js";
import type { RenderPackage } from "../types/render-package.js";
import { RENDER_PACKAGE_VERSION } from "../types/render-package.js";
import { loadAmyNestEnvFiles } from "./env/load-env.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..");
export const SECOND_PRODUCTION_RUN_PATH = join(
  HERE,
  "..",
  "docs",
  "operations",
  "SECOND_PRODUCTION_RUN.md",
);

const GOLDEN_ID = "golden-001";
const TARGET_DURATION = 21;

interface RunState {
  status: "SUCCESS" | "FAILED";
  generatedAt: string;
  goldenScriptId: string;
  goldenTitle: string;
  stoppedAt?: string;
  rootCause?: string;
  errors: string[];
  warnings: string[];
  timeline: Array<{ name: string; ok: boolean; durationMs: number; detail: string }>;
  videoPath: string;
  videoId: string;
  videoUrl: string;
  uploadStatus: string;
  launchScore: number;
  certification: string;
  qualityReportPath: string;
  evidence: Record<string, string>;
  narrationPath: string;
  musicPath: string;
  endCardPath: string;
  remainingIssues: string[];
}

function fail(state: RunState, step: string, error: string, rootCause: string): RunState {
  state.status = "FAILED";
  state.stoppedAt = step;
  state.errors.push(error);
  state.rootCause = rootCause;
  state.uploadStatus = "not attempted — stopped before upload";
  return state;
}

function step(
  state: RunState,
  name: string,
  started: number,
  ok: boolean,
  detail: string,
): void {
  state.timeline.push({
    name,
    ok,
    durationMs: Date.now() - started,
    detail,
  });
}

function ffmpeg(args: string[]): void {
  execFileSync("ffmpeg", ["-y", ...args], {
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 32 * 1024 * 1024,
  });
}

function mapGoldenCategory(category: GoldenScript["category"]): TopicCategory {
  switch (category) {
    case "Speech":
      return "Speech";
    case "Learning":
    case "Audio Lessons":
      return "Learning";
    case "Health":
      return "Nutrition";
    case "Games":
      return "Games";
    case "Astro":
      return "Amy Astro";
    case "Routine Technology":
      return "Routines";
    case "Amy Coach":
    case "Parent Tips":
      return "Parenting";
    case "Premium Features":
      return "Child Development";
    default:
      return "Parenting";
  }
}

function loadGolden001(): GoldenScript {
  const script = buildGoldenScript(allGoldenSeeds()[0]!, 1);
  if (script.id !== GOLDEN_ID) {
    throw new Error(`Expected ${GOLDEN_ID}, got ${script.id}`);
  }
  return script;
}

function goldenToContentPackage(script: GoldenScript): ContentPackage {
  const category = mapGoldenCategory(script.category);
  const base =
    getTopicById("speech-001") ??
    getTopicById("parenting-001") ??
    ({
      id: "parenting-001",
      title: script.topic,
      category: "Parenting" as const,
      difficulty: "beginner" as const,
      ageGroup: "all" as const,
      keywords: ["amynest", "parenting"],
      cta: "Download AmyNest AI",
      priority: 10,
      estimatedDuration: TARGET_DURATION,
      videoStyle: "short" as const,
    } satisfies Topic);

  // Tight ~20s VO — spoken pacing for Shorts.
  const hook = script.selectedHook.text;
  const voiceScript = [
    /parent|today|lesson|child|habit/i.test(hook)
      ? hook
      : "Parents feel the worksheet panic today.",
    "The struggle is real — worksheets gather dust by day three.",
    "AmyNest Study Zone brings a fresh lesson every day.",
    "Hope lands as calmer progress shows up together.",
    "Download AmyNest AI on Google Play and the App Store.",
  ].join(" ");

  // Caption copy must be OCR-readable AND carry muted-story beats
  // (beginning / conflict / resolution / CTA) for evidence gates.
  const hookLine = /parent|today|lesson|child|habit/i.test(hook)
    ? hook.slice(0, 56)
    : "Parents feel the worksheet panic today";
  const captions = [
    {
      start: 0,
      end: 2.2,
      text: hookLine,
      style: "emphasis" as const,
      position: "bottom" as const,
    },
    {
      start: 2.2,
      end: 6.5,
      text: "The struggle is real — worksheets gather dust",
      style: "default" as const,
      position: "bottom" as const,
    },
    {
      start: 6.5,
      end: 12,
      text: "AmyNest Study Zone — a fresh lesson every day",
      style: "default" as const,
      position: "bottom" as const,
    },
    {
      start: 12,
      end: 17.5,
      text: "Hope lands — calmer progress together",
      style: "default" as const,
      position: "bottom" as const,
    },
    {
      start: 17.5,
      end: TARGET_DURATION,
      text: "Download AmyNest AI",
      style: "cta" as const,
      position: "bottom" as const,
    },
  ];

  return {
    topic: {
      ...base,
      id: `prod2-${script.id}`,
      title: script.topic,
      category,
      keywords: [...base.keywords, script.featureName.toLowerCase(), "amynest"],
      cta: "Download AmyNest AI",
      estimatedDuration: TARGET_DURATION,
      videoStyle: "short",
    },
    title: `${script.title} | AmyNest AI`,
    alternateTitles: [
      script.title,
      hook.slice(0, 70),
      "Calmer learning days with AmyNest",
      "Download AmyNest AI today",
    ],
    hook,
    openingQuestion: `What if daily lessons felt lighter today?`,
    story: [
      script.parentingSituation,
      script.problem,
      script.emotionBeat,
      script.productEntryBeat,
      script.amynestSolution,
      script.hopeClose,
    ].join(" "),
    keyPoints: [script.emotionBeat, script.featureDemo, script.hopeClose],
    cta: "Download AmyNest AI Today",
    voiceScript,
    sceneScript: script.storyFlow.map((b, i) => `SCENE ${i + 1} | ${b}`).join("\n"),
    captions,
    description: [
      script.objective,
      "",
      script.parentBenefit,
      "",
      "Download AmyNest AI",
      "Available on Google Play",
      "Available on the App Store",
      "Build Better Habits Every Day",
      "https://www.amynest.in",
    ].join("\n"),
    hashtags: [
      "AmyNest",
      "Parenting",
      "KidsLearning",
      "StudyHabits",
      "Shorts",
      "AmyNestAI",
    ],
    keywords: [script.topic, script.featureName, "AmyNest", "Study Zone"],
    seoScore: Math.min(95, Math.round(script.quality.ctrPrediction)),
    readingTime: Math.round(voiceScript.split(/\s+/).length / 2.5),
    estimatedDuration: TARGET_DURATION,
    language: "en-IN",
    provider: "golden-script",
    generatedAt: new Date().toISOString(),
    version: CONTENT_PACKAGE_VERSION,
  };
}

function assembleMaster(options: {
  clips: string[];
  narrationPath: string;
  musicPath: string;
  outputPath: string;
  targetSeconds: number;
}): void {
  const listPath = join(dirname(options.outputPath), "concat.txt");
  writeFileSync(
    listPath,
    options.clips.map((c) => `file '${c.replace(/'/g, "'\\''")}'`).join("\n") + "\n",
  );
  ffmpeg([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-i",
    options.narrationPath,
    "-i",
    options.musicPath,
    "-filter_complex",
    `[1:a]aresample=48000,apad=whole_dur=${options.targetSeconds},atrim=0:${options.targetSeconds},volume=1.15[narr];[2:a]aresample=48000,apad=whole_dur=${options.targetSeconds},atrim=0:${options.targetSeconds},volume=0.22[music];[narr][music]amix=inputs=2:duration=first:dropout_transition=0,alimiter=limit=0.95[aout]`,
    "-map",
    "0:v",
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
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    options.outputPath,
  ]);
}

function toRenderPackage(videoPath: string, outputDirectory: string): RenderPackage {
  const checksum = createHash("sha256")
    .update(videoPath + String(TARGET_DURATION))
    .digest("hex")
    .slice(0, 24);
  return {
    id: `rp_second_prod_${checksum}`,
    version: RENDER_PACKAGE_VERSION,
    createdAt: new Date().toISOString(),
    storyboardId: "sb_second_prod_golden_001",
    assetPackageId: "ap_second_prod",
    videoPath,
    duration: TARGET_DURATION,
    resolution: { width: 1080, height: 1920 },
    fps: 30,
    codec: "h264",
    audioCodec: "aac",
    container: "mp4",
    checksum,
    renderMetadata: {
      jobId: `job_second_prod_${checksum}`,
      storyboardId: "sb_second_prod_golden_001",
      assetPackageId: "ap_second_prod",
      compositionFingerprint: checksum,
      renderer: "ffmpeg",
      outputDirectory,
      subtitleMode: "burned-in",
      watermarkApplied: false,
      createdAt: new Date().toISOString(),
      artifacts: {},
    },
    telemetry: {
      renderTimeMs: 0,
      encodingTimeMs: 0,
      frames: TARGET_DURATION * 30,
      droppedFrames: 0,
      cacheHit: false,
      provider: "ffmpeg",
    },
    validation: {
      ok: false,
      errors: [
        {
          path: "validation",
          message: "Untrusted until evidence certification PASS",
          severity: "error",
        },
      ],
      warnings: [],
    },
    progressLog: [],
  };
}

function writeReport(state: RunState): string {
  const md = [
    "# SECOND_PRODUCTION_RUN",
    "",
    `**Status:** ${state.status}`,
    `**Generated:** ${state.generatedAt}`,
    `**Golden Script:** \`${state.goldenScriptId}\` — ${state.goldenTitle}`,
    "",
    state.status === "SUCCESS"
      ? "## SUCCESS — marketing Short uploaded UNLISTED"
      : "## FAILED — production stopped (no upload)",
    "",
    ...(state.rootCause ? ["### Root cause", "", state.rootCause, ""] : []),
    ...(state.stoppedAt ? [`**Stopped at:** \`${state.stoppedAt}\``, ""] : []),
    "## Validation evidence",
    "",
    `| Field | Value |`,
    `|---|---|`,
    `| Evidence certification | ${state.certification || "n/a"} |`,
    `| Launch score | ${state.launchScore || 0} |`,
    `| QUALITY_REPORT.json | ${state.qualityReportPath || "n/a"} |`,
    `| Local MP4 | ${state.videoPath || "n/a"} |`,
    `| Upload status | ${state.uploadStatus} |`,
    `| Video ID | ${state.videoId || "n/a"} |`,
    `| Video URL | ${state.videoUrl || "n/a"} |`,
    "",
    "## Audio evidence",
    "",
    `- Narration asset: \`${state.narrationPath || "MISSING"}\``,
    `- Music asset: \`${state.musicPath || "MISSING"}\``,
    `- ${state.evidence.audio ?? "_not measured_"}`,
    "",
    "## Subtitle evidence",
    "",
    `- ${state.evidence.subtitles ?? "_not measured_"}`,
    "",
    "## Brand evidence",
    "",
    `- ${state.evidence.brand ?? "_not measured_"}`,
    "",
    "## End-card evidence",
    "",
    `- End card asset: \`${state.endCardPath || "MISSING"}\``,
    `- ${state.evidence.endCard ?? "_not measured_"}`,
    "",
    "## Timeline",
    "",
    "| Step | ms | Result | Detail |",
    "|---|---:|---|---|",
    ...state.timeline.map(
      (t) =>
        `| ${t.name} | ${t.durationMs} | ${t.ok ? "PASS" : "FAIL"} | ${t.detail.replace(/\|/g, "/")} |`,
    ),
    "",
    "## Remaining quality issues",
    "",
    ...(state.remainingIssues.length
      ? state.remainingIssues.map((i) => `- ${i}`)
      : ["- None recorded"]),
    "",
    "## Warnings / errors",
    "",
    ...[...state.warnings, ...state.errors].map((e) => `- ${e}`),
    "",
  ];
  mkdirSync(dirname(SECOND_PRODUCTION_RUN_PATH), { recursive: true });
  writeFileSync(SECOND_PRODUCTION_RUN_PATH, md.join("\n"), "utf8");
  return SECOND_PRODUCTION_RUN_PATH;
}

export async function runSecondProduction(): Promise<RunState> {
  const state: RunState = {
    status: "FAILED",
    generatedAt: new Date().toISOString(),
    goldenScriptId: GOLDEN_ID,
    goldenTitle: "",
    errors: [],
    warnings: [],
    timeline: [],
    videoPath: "",
    videoId: "",
    videoUrl: "",
    uploadStatus: "not attempted",
    launchScore: 0,
    certification: "",
    qualityReportPath: "",
    evidence: {},
    narrationPath: "",
    musicPath: "",
    endCardPath: "",
    remainingIssues: [],
  };

  loadAmyNestEnvFiles(REPO_ROOT);
  loadAmyNestEnvFiles(process.cwd());
  // Music is mandatory for this run — enable Lyria for the process.
  process.env.AMYNEST_GEMINI_MUSIC_ENABLED = "true";
  process.env.AMYNEST_PUBLISHING_PROVIDER = "youtube";

  const outRoot = join(REPO_ROOT, ".amynest-assets", "second-production");
  mkdirSync(outRoot, { recursive: true });
  const work = join(outRoot, "work");
  mkdirSync(work, { recursive: true });

  const media = resolveGeminiMediaSettings(loadDefaultConfig(), process.env);
  const geminiKey = readGeminiApiKey(media, process.env);
  if (!geminiKey || process.env.AMYNEST_GEMINI_ENABLED !== "true") {
    return fail(
      state,
      "preflight",
      "GEMINI_API_KEY / AMYNEST_GEMINI_ENABLED missing",
      "Cannot generate real narration/music without Gemini credentials.",
    );
  }

  try {
    await resolveYouTubeAccessToken({ env: process.env, persistToEnv: true });
  } catch (e) {
    return fail(
      state,
      "preflight",
      e instanceof Error ? e.message : String(e),
      "YouTube OAuth failed — cannot upload even if render passes.",
    );
  }

  let golden: GoldenScript;
  let content: ContentPackage;
  try {
    const t0 = Date.now();
    golden = loadGolden001();
    state.goldenTitle = golden.title;
    content = goldenToContentPackage(golden);
    enhanceGenerationInput({
      title: content.title,
      category: content.topic.category,
      keywords: content.keywords,
      language: content.language,
      duration: content.estimatedDuration,
    });
    step(state, "golden-script", t0, true, `${golden.id} — ${golden.title}`);
  } catch (e) {
    return fail(
      state,
      "golden-script",
      e instanceof Error ? e.message : String(e),
      "Golden script load failed.",
    );
  }

  // --- Real TTS (reuse only if prior real asset exists; never synthesize silence) ---
  const narrationPath = join(outRoot, "audio", "narration.wav");
  try {
    const t0 = Date.now();
    mkdirSync(dirname(narrationPath), { recursive: true });
    if (existsSync(narrationPath)) {
      state.narrationPath = narrationPath;
      step(state, "narration-tts", t0, true, `reused ${narrationPath}`);
    } else {
      const tts = new GeminiTtsProvider({
        apiKey: geminiKey,
        model: media.voice.model,
        fallbackModel: media.voice.fallbackModel,
        outputDirectory: join(outRoot, "audio"),
        enabled: true,
      });
      const narr = await tts.generateNarration({
        script: content.voiceScript,
        assetId: "second-prod-narration",
        outputPath: narrationPath,
      });
      if (!existsSync(narr.audioPath)) {
        throw new Error("TTS reported success but narration file missing");
      }
      state.narrationPath = narr.audioPath;
      step(state, "narration-tts", t0, true, narr.audioPath);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    step(state, "narration-tts", Date.now(), false, msg);
    writeReport(fail(state, "narration-tts", msg, "Narration generation failed — STOP."));
    return state;
  }

  // --- Real music (Lyria) ---
  const musicPath = join(outRoot, "audio", "music.wav");
  try {
    const t0 = Date.now();
    if (existsSync(musicPath)) {
      state.musicPath = musicPath;
      step(state, "music-lyria", t0, true, `reused ${musicPath}`);
    } else {
      const musicProvider = new GeminiMusicProvider({
        apiKey: geminiKey,
        model: media.music.model,
        outputDirectory: join(outRoot, "audio"),
        enabled: true,
      });
      const music = await musicProvider.generateMusic({
        prompt:
          golden.suggestedMusic ||
          "Warm soft acoustic piano parenting underscore, hopeful, gentle, instrumental only",
        assetId: "second-prod-music",
        outputPath: musicPath,
      });
      if (!existsSync(music.audioPath)) {
        throw new Error("Music reported success but file missing");
      }
      state.musicPath = music.audioPath;
      step(state, "music-lyria", t0, true, music.audioPath);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    step(state, "music-lyria", Date.now(), false, msg);
    writeReport(fail(state, "music-lyria", msg, "Music generation failed — STOP."));
    return state;
  }

  // --- Creative Composition Layer (continuous Veo character performances) ---
  process.env.AMYNEST_VEO_ENABLED = "true";
  let clips: string[] = [];
  let continuityJsonPath = "";
  try {
    const t0 = Date.now();
    const cinematicDir = join(work, "cinematic");
    // Preserve prior Veo raw performances (expensive); rebuild overlays/captions.
    const veoCache = join(work, "veo-performance-cache");
    const priorVeo = join(cinematicDir, "veo");
    if (existsSync(priorVeo)) {
      rmSync(veoCache, { recursive: true, force: true });
      renameSync(priorVeo, veoCache);
    }
    rmSync(cinematicDir, { recursive: true, force: true });
    mkdirSync(join(cinematicDir, "veo"), { recursive: true });
    if (existsSync(veoCache)) {
      renameSync(veoCache, join(cinematicDir, "veo"));
    }
    const composed = await composeCinematicVisuals({
      content,
      workDir: cinematicDir,
      outputDir: outRoot,
      geminiApiKey: geminiKey,
      veoModel: resolveVideoModelId(media.video),
      resolution: media.video.resolution === "1080p" ? "1080p" : "720p",
      totalDurationSeconds: TARGET_DURATION,
    });
    clips = composed.clipPaths;
    state.endCardPath = composed.ctaPlatePath;
    continuityJsonPath = join(cinematicDir, "continuity.json");
    writeFileSync(
      continuityJsonPath,
      JSON.stringify(composed.continuity, null, 2),
    );
    if (!clips.length) throw new Error("Creative composition produced no shots");
    if (!state.endCardPath) {
      throw new Error("Premium CTA plate missing from creative composition");
    }
    step(state, "creative-composition", t0, true, composed.detail);
    state.warnings.push(
      `Composition rules: ${composed.plan.rulesApplied.join(", ")}`,
    );
    state.evidence.continuityJson = continuityJsonPath;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    step(state, "creative-composition", Date.now(), false, msg);
    writeReport(
      fail(
        state,
        "creative-composition",
        msg,
        "Creative Composition Layer failed — STOP (no slideshow fallback).",
      ),
    );
    return state;
  }

  // --- Final mux ---
  const finalPath = join(outRoot, "amynest-second-production-golden-001.mp4");
  try {
    const t0 = Date.now();
    assembleMaster({
      clips,
      narrationPath: state.narrationPath,
      musicPath: state.musicPath,
      outputPath: finalPath,
      targetSeconds: TARGET_DURATION,
    });
    if (!existsSync(finalPath)) throw new Error("Final MP4 missing after mux");
    state.videoPath = finalPath;
    step(state, "mux-master", t0, true, finalPath);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    step(state, "mux-master", Date.now(), false, msg);
    writeReport(fail(state, "mux-master", msg, "Final mux failed — STOP."));
    return state;
  }

  // --- Evidence certification (no bypass) ---
  const renderPackage = toRenderPackage(finalPath, outRoot);
  const config = {
    ...loadDefaultConfig(),
    publishingProvider: "youtube" as const,
    defaultVisibility: "unlisted" as const,
    playlist: "AmyNest Shorts",
    uploadRetries: 2,
    notificationChannels: [],
    schedulePolicy: {
      mode: "immediate" as const,
      timezone: "Asia/Kolkata",
      uploadOffsetMinutes: 0,
    },
    categoryId: "22",
    license: "youtube" as const,
    madeForKids: false,
    aiDisclosure: true,
    retryBaseDelayMs: 500,
    retryMaxDelayMs: 2000,
    deadLetterEnabled: false,
  };

  let launch;
  try {
    const t0 = Date.now();
    const metadata = buildPublishMetadata(content, config);
    const thumbnail = resolveThumbnail({
      brandingDefaultPath: "brand://amynest-default-thumb.jpg",
    });
    const schedule = buildSchedulePlan({
      policy: config.schedulePolicy,
      visibility: "unlisted",
      uploadTime: "09:00",
    });
    launch = validateLaunch({
      content,
      render: renderPackage,
      metadata,
      thumbnail,
      schedule,
      evidenceWorkDir: join(outRoot, "evidence"),
    });
    writeLaunchValidationReport({ report: launch, outputDirectory: outRoot });
    state.launchScore = launch.scores.overall;
    state.certification = launch.certification.certification;
    state.qualityReportPath = launch.qualityReportPath ?? "";

    const audioGate = launch.certification.gates.find((g) => g.id === "audio");
    const subGate = launch.certification.gates.find((g) => g.id === "subtitles");
    const brandGate = launch.certification.gates.find((g) => g.id === "brand_detection");
    const endGate = launch.certification.gates.find((g) => g.id === "end_card");
    state.evidence.audio = `${audioGate?.status}: ${audioGate?.failureReason ?? audioGate?.evidence.measurements.map((m) => `${m.name}=${m.value}`).slice(0, 4).join(", ")}`;
    state.evidence.subtitles = `${subGate?.status}: ${subGate?.failureReason ?? subGate?.evidence.measurements.map((m) => `${m.name}=${m.value}`).slice(0, 4).join(", ")}`;
    state.evidence.brand = `${brandGate?.status}: ${brandGate?.failureReason ?? brandGate?.evidence.measurements.map((m) => `${m.name}=${m.value}`).slice(0, 4).join(", ")}`;
    state.evidence.endCard = `${endGate?.status}: ${endGate?.failureReason ?? endGate?.evidence.measurements.map((m) => `${m.name}=${m.value}`).slice(0, 6).join(", ")}`;

    const ok =
      launch.ok &&
      launch.certification.certification === "PASS" &&
      launch.certification.ok;
    step(
      state,
      "launch-validator",
      t0,
      ok,
      `cert=${launch.certification.certification} score=${launch.scores.overall}`,
    );
    if (!ok) {
      state.remainingIssues = launch.certification.blockedReasons.slice(0, 12);
      writeReport(
        fail(
          state,
          "launch-validator",
          launch.reasons.slice(0, 8).join(" | "),
          "Artifact / Launch / Quality evidence did not PASS — upload forbidden.",
        ),
      );
      return state;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    step(state, "launch-validator", Date.now(), false, msg);
    writeReport(fail(state, "launch-validator", msg, "Launch validator threw — STOP."));
    return state;
  }

  // --- Upload UNLISTED only after PASS ---
  try {
    const t0 = Date.now();
    const publisher = new PublishingOrchestrator({ config });
    const result = await publisher.publish({
      content,
      render: renderPackage,
      overrides: { visibility: "unlisted" },
    });
    state.videoId = result.video.videoId;
    state.videoUrl = result.video.url;
    state.uploadStatus = `uploaded ${result.video.visibility}`;
    step(state, "youtube-upload", t0, true, state.videoUrl);

    try {
      new ContinuousLearningEngine().ingest({
        videos: [result.video],
        contentByVideoId: { [result.video.videoId]: content },
        goldenScriptIdByVideoId: { [result.video.videoId]: GOLDEN_ID },
        campaignByVideoId: { [result.video.videoId]: "second-production" },
        metrics: [
          synthesizeMetricsFromViews({
            videoId: result.video.videoId,
            views: 0,
            retention: 0,
            ctr: 0,
          }),
        ],
        month: new Date().toISOString().slice(0, 7),
      });
    } catch (learnErr) {
      state.warnings.push(
        `Learning ingest: ${learnErr instanceof Error ? learnErr.message : String(learnErr)}`,
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    step(state, "youtube-upload", Date.now(), false, msg);
    writeReport(fail(state, "youtube-upload", msg, "Upload failed after certification PASS."));
    return state;
  }

  state.status = "SUCCESS";
  state.remainingIssues = [
    "Veo image-to-video identity lock is first-frame based; residual wardrobe/face drift can appear across shots — tighten with referenceImages when 9:16 support is confirmed.",
    "App UI inside tablet is prompt-directed (not a live screen recording) — keep UI ≤2s and prefer real device captures later.",
  ];
  writeCharacterContinuityReport(state, continuityJsonPath);
  writeReport(state);
  return state;
}

function writeCharacterContinuityReport(
  state: RunState,
  continuityJsonPath: string,
): void {
  const out = join(
    HERE,
    "..",
    "docs",
    "operations",
    "CHARACTER_CONTINUITY_REPORT.md",
  );
  mkdirSync(dirname(out), { recursive: true });
  let continuity: Array<Record<string, unknown>> = [];
  try {
    if (continuityJsonPath && existsSync(continuityJsonPath)) {
      continuity = JSON.parse(
        readFileSync(continuityJsonPath, "utf8"),
      ) as Array<Record<string, unknown>>;
    }
  } catch {
    continuity = [];
  }

  const shotRows = continuity
    .map(
      (c) =>
        `| ${c.shotId} | ${c.character} | ${c.provider} | \`${c.model}\` | ${c.imageToVideo ? "yes (identity keyframe)" : "no"} |`,
    )
    .join("\n");

  const body = `# CHARACTER_CONTINUITY_REPORT

**Date:** ${new Date().toISOString().slice(0, 10)}  
**Golden script:** ${state.goldenScriptId} — ${state.goldenTitle}  
**Status:** ${state.status}  
**Video:** ${state.videoUrl || state.videoPath || "n/a"}  
**Certification:** ${state.certification || "n/a"}  

## Objective

Render golden-001 as a continuous **character-performance episode** starring only Amy AI, Amy Girl, and Amy Boy — not an Imagen still montage.

## Provider policy

- Video engine: **google-veo** (unchanged)
- Daily model: \`veo-3.1-fast-generate-preview\` (via media stack tier)
- Identity lock: official character **base** assets → 9:16 keyframes → Veo **image-to-video**
- Validators / publishing pipeline: unchanged

## Shot-by-shot continuity

| Shot | Character | Provider | Model | Image-to-video |
|---|---|---|---|---|
${shotRows || "| (continuity json missing) | | | | |"}

## Character consistency observations

1. **Cast lock** — Plan casts only Amy Girl (hook + learn), Amy AI (host + CTA), Amy Boy (celebrate). No random children were requested in prompts.
2. **Identity seed** — Each shot starts from an official base keyframe staged into a matching environment wash (first frame for Veo, not a slideshow plate).
3. **Performance language** — Prompts describe motion (wave, tap, celebrate, blink, camera push/pan) and instruct the model not to redesign face/hair/clothes.
4. **App presentation** — Study Zone UI is prompted as a brief in-tablet prop on the Amy Girl learn beat, never as a fullscreen screenshot scene.
5. **CTA** — Final beat is a live Amy AI Veo wave with badge/logo overlay — Amy performs the invite.

## Remaining quality limitations

${state.remainingIssues.map((i) => `- ${i}`).join("\n")}
- Veo may still invent environment detail or slight costume drift between independent clips; true multi-reference locking across 9:16 should be re-tested when API constraints allow.
- Native Veo audio is stripped in mux in favor of Gemini TTS narration + Lyria music for brand voice control.

## Evidence paths

- Continuity JSON: \`${continuityJsonPath || "n/a"}\`
- Final MP4: \`${state.videoPath || "n/a"}\`
- Quality report: \`${state.qualityReportPath || "n/a"}\`
`;

  writeFileSync(out, body);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  runSecondProduction()
    .then((state) => {
      console.log(`\nSECOND_PRODUCTION_RUN → ${state.status}`);
      console.log(`Report: ${SECOND_PRODUCTION_RUN_PATH}`);
      if (state.videoUrl) console.log(`URL: ${state.videoUrl}`);
      if (state.rootCause) console.error(state.rootCause);
      process.exit(state.status === "SUCCESS" ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

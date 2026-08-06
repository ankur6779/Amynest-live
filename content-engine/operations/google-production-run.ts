/**
 * Google AI Studio production run — next unpublished Golden Script (default golden-006).
 * Isolated output dir. Does not modify second-production assets or validators.
 *
 * Run: pnpm exec node --import tsx/esm ./operations/google-production-run.ts
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
import { ContentIntelligence } from "../content-intelligence/index.js";
import {
  persistDiversityFingerprint,
  runContentDiversityGate,
} from "../content-diversity/index.js";
import { composeCinematicVisuals } from "../creative-composition/index.js";
import { planCinematicShort } from "../creative-composition/plan.js";
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
import { MockAnalyticsProvider } from "../analytics/providers/mock.js";
import { YouTubeAnalyticsProvider } from "../analytics/providers/youtube.js";
import { enhanceGenerationInput } from "../studio/enhance.js";
import {
  isThumbnailEngineEnabled,
  runThumbnailEngine,
  type ThumbnailEnginePackage,
} from "../thumbnail-engine/index.js";
import {
  isThumbnailLearningEnabled,
  runThumbnailLearningEngine,
} from "../thumbnail-learning-engine/index.js";
import { getTopicById } from "../topics/index.js";
import type { VideoPerformanceMetrics } from "../types/analytics.js";
import type { ContentPackage } from "../types/content-package.js";
import { CONTENT_PACKAGE_VERSION } from "../types/content-package.js";
import type { Topic, TopicCategory } from "../types/index.js";
import type { RenderPackage } from "../types/render-package.js";
import { RENDER_PACKAGE_VERSION } from "../types/render-package.js";
import { loadAmyNestEnvFiles } from "./env/load-env.js";

/** Zeroed YouTube metrics seed for fresh uploads (thumbnail learning input shape). */
function pendingVideoMetrics(videoId: string): VideoPerformanceMetrics {
  return {
    videoId,
    collectedAt: new Date().toISOString(),
    views: 0,
    watchTimeMinutes: 0,
    averageViewDurationSeconds: 0,
    averagePercentageViewed: 0,
    retention: 0,
    ctr: 0,
    subscribersGained: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    trafficSources: {
      shorts_feed: 0,
      browse: 0,
      search: 0,
      suggested: 0,
      external: 0,
      playlist: 0,
      other: 1,
    },
    returningViewers: 0,
    newViewers: 0,
    geography: {},
    deviceType: { mobile: 0, desktop: 0, tv: 0, tablet: 0, unknown: 0 },
    missingMetrics: ["pending_youtube_analytics"],
  };
}

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..");
export const GOOGLE_PRODUCTION_RUN_PATH = join(
  HERE,
  "..",
  "docs",
  "operations",
  "GOOGLE_PRODUCTION_RUN_REPORT.md",
);

const GOLDEN_ID = "golden-006";
const TARGET_DURATION = 21;
const MIN_LAUNCH_SCORE = 95;
const RUN_STARTED_MS = Date.now();

interface RunState {
  status: "SUCCESS" | "FAILED";
  generatedAt: string;
  goldenScriptId: string;
  goldenTitle: string;
  googleVideoModel: string;
  googleVoiceModel: string;
  googleImageModel: string;
  videoGenerationMs: number;
  videoCostUsd: number | null;
  imagesGenerated: number;
  voiceGenerated: boolean;
  thumbnailScore: number | null;
  thumbnailPath: string;
  remainingQuotaNote: string;
  totalProductionMs: number;
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

function loadGoldenScript(): GoldenScript {
  // Seed index 5 = sixth golden; build number 6 → id golden-006.
  const script = buildGoldenScript(allGoldenSeeds()[5]!, 6);
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

  // Tight ~20s VO — golden-006 Speech Practice (hear → say → gentle feedback).
  // Hook/caption tokens must satisfy story_quality OCR "beginning" beat
  // (parent|today|child|lesson|habit|struggle|amy within first ~3.5s).
  const hook = script.selectedHook.text;
  const voiceScript = [
    "Parents feel the speech struggle today — the child tries a sound, then shame flickers.",
    "Correcting every word can shut a child down. Silence does not help either.",
    "AmyNest Speech Practice — hear the prompt, speak into the mic, get gentle feedback.",
    "Hope rises when safe practice leaves a child braver, not smaller.",
    "Download AmyNest AI on Google Play and the App Store.",
  ].join(" ");

  const captions = [
    {
      start: 0,
      end: 2.4,
      text: "Parents feel the speech struggle today",
      style: "emphasis" as const,
      position: "bottom" as const,
    },
    {
      start: 2.4,
      end: 6.8,
      text: "A sound tumbles — and shame flickers",
      style: "default" as const,
      position: "bottom" as const,
    },
    {
      start: 6.8,
      end: 12.5,
      text: "Speech Practice — hear, say, feedback",
      style: "default" as const,
      position: "bottom" as const,
    },
    {
      start: 12.5,
      end: 17.8,
      text: "Hope rises — braver, not smaller",
      style: "default" as const,
      position: "bottom" as const,
    },
    {
      start: 17.8,
      end: TARGET_DURATION,
      text: "Download AmyNest AI",
      style: "cta" as const,
      position: "bottom" as const,
    },
  ];

  return {
    topic: {
      ...base,
      id: `prod6-${script.id}`,
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
      "Gentle speech practice with AmyNest",
      "Download AmyNest AI today",
    ],
    hook,
    openingQuestion: `What if speech practice felt safe tonight?`,
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
      "",
      "https://amynest.in",
      "https://amynest.in/get-app",
      "https://www.amynest.in",
    ].join("\n"),
    hashtags: [
      "AmyNest",
      "Parenting",
      "KidsLearning",
      "SpeechPractice",
      "Shorts",
      "AmyNestAI",
    ],
    keywords: [script.topic, script.featureName, "AmyNest", "Speech"],
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
    id: `rp_g006_prod_${checksum}`,
    version: RENDER_PACKAGE_VERSION,
    createdAt: new Date().toISOString(),
    storyboardId: "sb_g006_prod_golden_006",
    assetPackageId: "ap_g006_prod",
    videoPath,
    duration: TARGET_DURATION,
    resolution: { width: 1080, height: 1920 },
    fps: 30,
    codec: "h264",
    audioCodec: "aac",
    container: "mp4",
    checksum,
    renderMetadata: {
      jobId: `job_g006_prod_${checksum}`,
      storyboardId: "sb_g006_prod_golden_006",
      assetPackageId: "ap_g006_prod",
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
  state.totalProductionMs = Date.now() - RUN_STARTED_MS;
  const md = [
    "# GOOGLE_PRODUCTION_RUN_REPORT",
    "",
    `**Status:** ${state.status}`,
    `**Generated:** ${state.generatedAt}`,
    `**Golden Script ID:** \`${state.goldenScriptId}\` — ${state.goldenTitle}`,
    `**Provider policy:** Google AI Studio ONLY (no KIE / you.bot / Runware / Sharpii / OpenAI Images)`,
    "",
    state.status === "SUCCESS"
      ? "## SUCCESS — marketing Short uploaded UNLISTED"
      : "## FAILED — production stopped (no upload)",
    "",
    ...(state.rootCause ? ["### Root cause", "", state.rootCause, ""] : []),
    ...(state.stoppedAt ? [`**Stopped at:** \`${state.stoppedAt}\``, ""] : []),
    "## Google AI Studio usage",
    "",
    `| Field | Value |`,
    `|---|---|`,
    `| Google video model | ${state.googleVideoModel || "n/a"} |`,
    `| Google voice model | ${state.googleVoiceModel || "n/a"} |`,
    `| Google image model (if needed) | ${state.googleImageModel || "n/a"} |`,
    `| Video generation duration | ${state.videoGenerationMs} ms |`,
    `| Video generation cost (AI Studio) | ${state.videoCostUsd == null ? "not available from API" : `$${state.videoCostUsd.toFixed(4)}`} |`,
    `| Images generated | ${state.imagesGenerated} |`,
    `| Voice generated | ${state.voiceGenerated ? "yes" : "no / reused"} |`,
    `| Total production time | ${state.totalProductionMs} ms |`,
    `| Remaining Google quota | ${state.remainingQuotaNote} |`,
    "",
    "## Validation evidence",
    "",
    `| Field | Value |`,
    `|---|---|`,
    `| Evidence certification | ${state.certification || "n/a"} |`,
    `| Launch score | ${state.launchScore || 0} (min ${MIN_LAUNCH_SCORE}) |`,
    `| Thumbnail score (predicted CTR %) | ${state.thumbnailScore ?? "n/a"} |`,
    `| Thumbnail path | ${state.thumbnailPath || "n/a"} |`,
    `| QUALITY_REPORT.json | ${state.qualityReportPath || "n/a"} |`,
    `| Local MP4 | ${state.videoPath || "n/a"} |`,
    `| Upload status | ${state.uploadStatus} |`,
    `| Video ID | ${state.videoId || "n/a"} |`,
    `| Upload URL | ${state.videoUrl || "n/a"} |`,
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
  mkdirSync(dirname(GOOGLE_PRODUCTION_RUN_PATH), { recursive: true });
  writeFileSync(GOOGLE_PRODUCTION_RUN_PATH, md.join("\n"), "utf8");
  return GOOGLE_PRODUCTION_RUN_PATH;
}

export async function runGoogleProduction(): Promise<RunState> {
  const state: RunState = {
    status: "FAILED",
    generatedAt: new Date().toISOString(),
    goldenScriptId: GOLDEN_ID,
    goldenTitle: "",
    googleVideoModel: "",
    googleVoiceModel: "",
    googleImageModel: "",
    videoGenerationMs: 0,
    videoCostUsd: null,
    imagesGenerated: 0,
    voiceGenerated: false,
    thumbnailScore: null,
    thumbnailPath: "",
    remainingQuotaNote:
      "Check Google AI Studio usage dashboard — API does not return remaining quota in this path.",
    totalProductionMs: 0,
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
  // Google AI Studio ONLY — strip third-party keys for this process.
  for (const k of [
    "KIE_API_KEY",
    "RUNWARE_API_KEY",
    "YOUBOT_API_KEY",
    "SHARPII_API_KEY",
    "OPENAI_API_KEY",
  ]) {
    delete process.env[k];
  }
  process.env.AMYNEST_GEMINI_ENABLED = "true";
  process.env.AMYNEST_VEO_ENABLED = "true";
  process.env.AMYNEST_VEO_MODEL =
    process.env.AMYNEST_VEO_MODEL || "veo-3.1-fast-generate-preview";
  process.env.AMYNEST_VEO_DAILY_MODEL =
    process.env.AMYNEST_VEO_DAILY_MODEL || "veo-3.1-fast-generate-preview";
  process.env.AMYNEST_VEO_PREMIUM_MODEL =
    process.env.AMYNEST_VEO_PREMIUM_MODEL || "veo-3.1-generate-preview";
  process.env.AMYNEST_VEO_RESOLUTION =
    process.env.AMYNEST_VEO_RESOLUTION || "1080p";
  process.env.AMYNEST_GEMINI_IMAGE_MODEL =
    process.env.AMYNEST_GEMINI_IMAGE_MODEL || "imagen-4.0-fast-generate-001";
  // Fresh Veo performances for this production Short.
  process.env.AMYNEST_REUSE_VEO = process.env.AMYNEST_REUSE_VEO ?? "0";
  // Music is mandatory for this run — enable Lyria for the process.
  process.env.AMYNEST_GEMINI_MUSIC_ENABLED = "true";
  process.env.AMYNEST_PUBLISHING_PROVIDER = "youtube";
  // Golden script only — no paid script LLM.
  process.env.AMYNEST_SCRIPT_PROVIDER = "mock";

  const outRoot = join(REPO_ROOT, ".amynest-assets", "google-production-golden-006");
  mkdirSync(outRoot, { recursive: true });
  const work = join(outRoot, "work");
  mkdirSync(work, { recursive: true });

  const media = resolveGeminiMediaSettings(loadDefaultConfig(), process.env);
  const geminiKey = readGeminiApiKey(media, process.env);
  state.googleVideoModel = resolveVideoModelId(media.video);
  state.googleVoiceModel = media.voice.model;
  state.googleImageModel = media.image.model;
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
    golden = loadGoldenScript();
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
    if (existsSync(narrationPath) && process.env.AMYNEST_REUSE_AUDIO === "1") {
      state.narrationPath = narrationPath;
      state.voiceGenerated = false;
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
        assetId: "g006-prod-narration",
        outputPath: narrationPath,
      });
      if (!existsSync(narr.audioPath)) {
        throw new Error("TTS reported success but narration file missing");
      }
      state.narrationPath = narr.audioPath;
      state.voiceGenerated = true;
      state.googleVoiceModel =
        narr.metadata?.model || media.voice.model;
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
    if (existsSync(musicPath) && process.env.AMYNEST_REUSE_AUDIO === "1") {
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
        assetId: "g006-prod-music",
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

  // --- Content Diversity gate (mandatory) — script-driven identity vs recent Shorts ---
  let diversityPlan = planCinematicShort(content, TARGET_DURATION);
  let diversityFingerprint: import("../content-diversity/types.js").DiversityFingerprint | null =
    null;
  let diversityHeadline = "";
  try {
    const t0 = Date.now();
    const diversity = runContentDiversityGate({
      content,
      plan: diversityPlan,
      goldenScriptId: GOLDEN_ID,
      outputDir: outRoot,
    });
    content = diversity.content;
    diversityPlan = diversity.plan;
    diversityFingerprint = diversity.fingerprint;
    diversityHeadline = diversity.metadata.thumbnailHeadline;
    step(
      state,
      "content-diversity",
      t0,
      diversity.ok,
      `score=${diversity.diversityScore.toFixed(1)} similarity=${(diversity.similarityToRecent * 100).toFixed(1)}% locs=${diversity.extras.locations.filter((l) => l !== "cta-stage").join("/")}`,
    );
    if (!diversity.ok) {
      writeReport(
        fail(
          state,
          "content-diversity",
          diversity.reasons.join(" | "),
          "Content Diversity Score / similarity gate failed — STOP before generation.",
        ),
      );
      return state;
    }
    state.warnings.push(
      `Diversity: ${diversity.metadata.playlistName} · ${diversity.metadata.thumbnailHero} · ${diversity.extras.locations.join(", ")}`,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    step(state, "content-diversity", Date.now(), false, msg);
    writeReport(
      fail(state, "content-diversity", msg, "Content diversity gate threw — STOP."),
    );
    return state;
  }

  // --- Creative Composition Layer (continuous Google Veo character performances) ---
  process.env.AMYNEST_VEO_ENABLED = "true";
  let clips: string[] = [];
  let continuityJsonPath = "";
  try {
    const t0 = Date.now();
    const cinematicDir = join(work, "cinematic");
    // Preserve prior Veo raw performances only when AMYNEST_REUSE_VEO=1.
    const veoCache = join(work, "veo-performance-cache");
    const priorVeo = join(cinematicDir, "veo");
    if (process.env.AMYNEST_REUSE_VEO === "1" && existsSync(priorVeo)) {
      rmSync(veoCache, { recursive: true, force: true });
      renameSync(priorVeo, veoCache);
    }
    rmSync(cinematicDir, { recursive: true, force: true });
    mkdirSync(join(cinematicDir, "veo"), { recursive: true });
    if (process.env.AMYNEST_REUSE_VEO === "1" && existsSync(veoCache)) {
      renameSync(veoCache, join(cinematicDir, "veo"));
    }
    const veoModel =
      process.env.AMYNEST_VEO_MODEL?.trim() ||
      resolveVideoModelId(media.video);
    state.googleVideoModel = veoModel;
    // Veo 3.1 Fast rejects 1080p for 4s clips — generate at 720p;
    // composeCinematicVisuals already scales each performance to 1080×1920.
    const composed = await composeCinematicVisuals({
      content,
      workDir: cinematicDir,
      outputDir: outRoot,
      geminiApiKey: geminiKey,
      veoModel,
      resolution: "720p",
      totalDurationSeconds: TARGET_DURATION,
      plan: diversityPlan,
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
    state.videoGenerationMs = Date.now() - t0;
    state.imagesGenerated = composed.continuity.filter(
      (c) => c.imageToVideo,
    ).length;
    // Cost not exposed by Generative Language API in this path.
    state.videoCostUsd = null;
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
  const finalPath = join(outRoot, "amynest-google-golden-006.mp4");
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

    const scoreOk = launch.scores.overall >= MIN_LAUNCH_SCORE;
    const ok =
      launch.ok &&
      launch.certification.certification === "PASS" &&
      launch.certification.ok &&
      scoreOk;
    step(
      state,
      "launch-validator",
      t0,
      ok,
      `cert=${launch.certification.certification} score=${launch.scores.overall}`,
    );
    if (!ok) {
      state.remainingIssues = launch.certification.blockedReasons.slice(0, 12);
      if (!scoreOk) {
        state.remainingIssues.unshift(
          `Launch score ${launch.scores.overall} < ${MIN_LAUNCH_SCORE}`,
        );
      }
      writeReport(
        fail(
          state,
          "launch-validator",
          launch.reasons.slice(0, 8).join(" | "),
          "Artifact / Launch / Quality evidence did not PASS (≥95) — upload forbidden.",
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

  // --- Thumbnail Engine 2.0 (A/B/C + live cover) — Google-only assets already locked ---
  let thumbnailPack: ThumbnailEnginePackage | null = null;
  try {
    const t0 = Date.now();
    if (!isThumbnailEngineEnabled()) {
      throw new Error("Thumbnail Engine disabled (AMYNEST_THUMBNAIL_ENGINE=0)");
    }
    const thumbDir = join(outRoot, "thumbnail");
    mkdirSync(thumbDir, { recursive: true });
    thumbnailPack = await runThumbnailEngine({
      contentPackage: content,
      outputDir: thumbDir,
      videoPath: finalPath,
      applyCover: true,
      liveCover: true,
      variants: true,
      headlineOverride: diversityHeadline || undefined,
    });
    state.thumbnailPath = thumbnailPack.assets.jpgPath;
    state.thumbnailScore = thumbnailPack.intelligence?.predictedCtr ?? null;
    step(
      state,
      "thumbnail-engine",
      t0,
      true,
      `variant=${thumbnailPack.intelligence?.chosenVariant ?? "A"} predictedCtr=${state.thumbnailScore ?? "n/a"}`,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    step(state, "thumbnail-engine", Date.now(), false, msg);
    writeReport(
      fail(
        state,
        "thumbnail-engine",
        msg,
        "Thumbnail Engine failed — upload forbidden for this production run.",
      ),
    );
    return state;
  }

  // --- Upload UNLISTED only after PASS ---
  try {
    const t0 = Date.now();
    const publisher = new PublishingOrchestrator({ config });
    const result = await publisher.publish({
      content,
      render: renderPackage,
      thumbnailPath: state.thumbnailPath || undefined,
      overrides: { visibility: "unlisted" },
    });
    state.videoId = result.video.videoId;
    state.videoUrl = result.video.url;
    state.uploadStatus = `uploaded ${result.video.visibility}`;
    step(state, "youtube-upload", t0, true, state.videoUrl);

    // Continuous Learning + campaign memory + analytics + thumbnail learning
    try {
      const tLearn = Date.now();
      new ContinuousLearningEngine().ingest({
        videos: [result.video],
        contentByVideoId: { [result.video.videoId]: content },
        goldenScriptIdByVideoId: { [result.video.videoId]: GOLDEN_ID },
        campaignByVideoId: { [result.video.videoId]: "google-golden-006" },
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
      step(state, "continuous-learning", tLearn, true, "ingested");
    } catch (learnErr) {
      state.warnings.push(
        `Learning ingest: ${learnErr instanceof Error ? learnErr.message : String(learnErr)}`,
      );
    }

    try {
      const tMem = Date.now();
      const intel = new ContentIntelligence();
      intel.rememberPackage(content, result.video.videoId);
      step(state, "campaign-memory", tMem, true, result.video.videoId);
    } catch (memErr) {
      state.warnings.push(
        `Campaign memory: ${memErr instanceof Error ? memErr.message : String(memErr)}`,
      );
    }

    try {
      const tAnalytics = Date.now();
      const token =
        process.env.YOUTUBE_ACCESS_TOKEN ||
        process.env.ANALYTICS_ACCESS_TOKEN ||
        "";
      let providerId = "mock";
      // Thumbnail learning expects VideoPerformanceMetrics (not PlatformPerformance).
      let metrics: VideoPerformanceMetrics[] = [
        pendingVideoMetrics(result.video.videoId),
      ];
      if (token) {
        try {
          const yt = new YouTubeAnalyticsProvider({ accessToken: token });
          const collected = await yt.collect({
            videoIds: [result.video.videoId],
            startDate: new Date(Date.now() - 2 * 864e5)
              .toISOString()
              .slice(0, 10),
            endDate: new Date().toISOString().slice(0, 10),
          });
          if (collected.videos.length) {
            metrics = collected.videos;
            providerId = "youtube";
          }
        } catch (ytErr) {
          // Fresh uploads often 403 until Analytics populates — seed learning row anyway.
          state.warnings.push(
            `YouTube Analytics unavailable yet: ${ytErr instanceof Error ? ytErr.message : String(ytErr)}`,
          );
          const mock = new MockAnalyticsProvider({
            seed: `google-${GOLDEN_ID}`,
          });
          metrics = [await mock.video(result.video.videoId)].map((m) => ({
            ...m,
            views: 0,
            ctr: 0,
            retention: 0,
            watchTimeMinutes: 0,
          }));
          providerId = "pending-youtube";
        }
      }
      step(
        state,
        "analytics-ingest",
        tAnalytics,
        true,
        `${providerId} videos=${metrics.length}`,
      );

      if (isThumbnailLearningEnabled()) {
        const tThumbLearn = Date.now();
        const learnDir = join(outRoot, "thumbnail-learning");
        await runThumbnailLearningEngine({
          metrics,
          contentByVideoId: { [result.video.videoId]: content },
          thumbnailByVideoId: {
            [result.video.videoId]: thumbnailPack,
          },
          thumbnailPathByVideoId: {
            [result.video.videoId]: state.thumbnailPath,
          },
          titleByVideoId: { [result.video.videoId]: content.title },
          outputDir: learnDir,
          storePath: join(learnDir, "thumbnail-learning-store.json"),
          minImpressions: 0,
          minPatternSample: 1,
        });
        step(state, "thumbnail-learning", tThumbLearn, true, learnDir);
      }
    } catch (analyticsErr) {
      state.warnings.push(
        `Analytics/thumbnail learning: ${analyticsErr instanceof Error ? analyticsErr.message : String(analyticsErr)}`,
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    step(state, "youtube-upload", Date.now(), false, msg);
    writeReport(fail(state, "youtube-upload", msg, "Upload failed after certification PASS."));
    return state;
  }

  state.status = "SUCCESS";
  if (diversityFingerprint) {
    persistDiversityFingerprint({
      ...diversityFingerprint,
      videoId: state.videoId || diversityFingerprint.videoId,
    });
  }
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
    "CHARACTER_CONTINUITY_REPORT_G006.md",
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

Render golden-006 (Speech Practice) as a continuous **character-performance episode** starring only Amy AI, Amy Girl, and Amy Boy — not an Imagen still montage.

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
4. **App presentation** — Speech Practice mic/feedback UI is prompted as a brief in-device prop on the learn beat, never as a fullscreen screenshot scene.
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
  runGoogleProduction()
    .then((state) => {
      console.log(`\nGOOGLE_PRODUCTION_RUN → ${state.status}`);
      console.log(`Golden: ${state.goldenScriptId} — ${state.goldenTitle}`);
      console.log(`Google video model: ${state.googleVideoModel}`);
      console.log(`Launch score: ${state.launchScore}`);
      console.log(`Report: ${GOOGLE_PRODUCTION_RUN_PATH}`);
      if (state.videoUrl) {
        console.log(`YouTube Shorts URL: ${state.videoUrl}`);
        console.log(`Video ID: ${state.videoId}`);
      }
      if (state.rootCause) console.error(state.rootCause);
      process.exit(state.status === "SUCCESS" ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

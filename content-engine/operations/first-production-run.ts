/**
 * FIRST real production run — golden-001 → YouTube UNLISTED.
 * Execution only. Stops immediately on failure. Writes FIRST_PRODUCTION_RUN.md.
 *
 * Run: pnpm exec node --import tsx/esm ./operations/first-production-run.ts
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { AssetOrchestrator } from "../asset-engine/orchestrator.js";
import { createDefaultAssetRegistry } from "../asset-engine/registry/index.js";
import { evaluateBrandQualityGate } from "../brand/quality-gate.js";
import { loadDefaultConfig } from "../config/index.js";
import {
  readGeminiApiKey,
  resolveGeminiMediaSettings,
} from "../config/gemini-media.js";
import { resolveVideoModelId } from "../types/gemini-media.js";
import { ContentIntelligence } from "../content-intelligence/index.js";
import {
  ContinuousLearningEngine,
  synthesizeMetricsFromViews,
} from "../continuous-learning/index.js";
import { allGoldenSeeds } from "../golden-scripts/seeds.js";
import { buildGoldenScript } from "../golden-scripts/build.js";
import type { GoldenScript } from "../golden-scripts/types.js";
import { validateLaunch } from "../launch-validator/validate.js";
import { writeLaunchValidationReport } from "../launch-validator/report.js";
import { loadAmyNestEnvFiles } from "./env/load-env.js";
import {
  buildPublishMetadata,
  resolveThumbnail,
} from "../publishing/metadata/index.js";
import { PublishingOrchestrator } from "../publishing/orchestrator.js";
import { buildSchedulePlan } from "../publishing/scheduler/index.js";
import { resolveYouTubeAccessToken } from "../publishing/youtube/oauth.js";
import { RenderOrchestrator } from "../render-engine/orchestrator.js";
import { createDefaultRenderRegistry } from "../render-engine/providers/index.js";
import { FFmpegRenderer } from "../render-engine/providers/ffmpeg.js";
import { composeProductionScenes } from "../scene-composer/compose.js";
import { StoryboardPlanner } from "../storyboard/planner.js";
import { enhanceGenerationInput } from "../studio/enhance.js";
import { getTopicById } from "../topics/index.js";
import type { ContentPackage } from "../types/content-package.js";
import { CONTENT_PACKAGE_VERSION } from "../types/content-package.js";
import type { Topic, TopicCategory } from "../types/index.js";
import type { PublishedVideo } from "../types/published-video.js";
import type { RenderPackage } from "../types/render-package.js";
import { RENDER_PACKAGE_VERSION } from "../types/render-package.js";
import { getBrandIdentityKit } from "../brand/identity.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..");
export const FIRST_PRODUCTION_RUN_PATH = join(
  HERE,
  "..",
  "docs",
  "operations",
  "FIRST_PRODUCTION_RUN.md",
);

const GOLDEN_ID = "golden-001";
const TARGET_DURATION = 20 as const;

interface PreflightCheck {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

interface TimelineStep {
  name: string;
  ok: boolean;
  durationMs: number;
  detail: string;
}

interface RunState {
  status: "SUCCESS" | "FAILED";
  generatedAt: string;
  goldenScriptId: string;
  goldenTitle: string;
  sceneCount: number;
  providerUsed: string;
  generationTimeMs: number;
  renderDurationMs: number;
  validationScore: number;
  launchScore: number;
  uploadStatus: string;
  videoUrl: string;
  videoId: string;
  videoPath: string;
  warnings: string[];
  errors: string[];
  rootCause?: string;
  learningSummary?: string;
  metadata?: Record<string, string>;
  stoppedAt?: string;
  preflight: PreflightCheck[];
  timeline: TimelineStep[];
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
  const seeds = allGoldenSeeds();
  const script = buildGoldenScript(seeds[0]!, 1);
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

  const duration = TARGET_DURATION;
  const hook = script.selectedHook.text;
  const story = [
    script.parentingSituation,
    script.problem,
    script.emotionBeat,
    script.productEntryBeat,
    script.amynestSolution,
    script.featureDemo,
    script.hopeClose,
  ].join(" ");
  const keyPoints = [
    script.emotionBeat,
    script.featureDemo,
    script.parentBenefit,
    script.hopeClose,
  ];
  const voiceScript = [
    hook,
    script.parentingSituation,
    script.emotionBeat,
    script.productEntryBeat,
    script.featureDemo,
    script.hopeClose,
    "Download AmyNest AI. Available on Google Play and the App Store.",
  ].join(" ");

  return {
    topic: {
      ...base,
      id: `prod-${script.id}`,
      title: script.topic,
      category,
      keywords: [...base.keywords, script.featureName.toLowerCase(), "amynest"],
      cta: "Download AmyNest AI",
      estimatedDuration: duration,
      videoStyle: "short",
    },
    title: `${script.title} | AmyNest AI`,
    alternateTitles: [
      script.title,
      `${script.topic} — AmyNest AI`,
      hook.slice(0, 70),
      `${script.featureName} tip for parents`,
      "Calmer learning days with AmyNest",
      script.hopeClose.slice(0, 60),
      "Download AmyNest AI today",
      "Study Zone habit tip | AmyNest",
    ],
    hook,
    openingQuestion: script.parentingSituation.includes("?")
      ? script.parentingSituation
      : `What if ${script.topic.toLowerCase()} felt lighter today?`,
    story,
    keyPoints,
    cta: script.cta,
    voiceScript,
    sceneScript: script.storyFlow
      .map((beat, i) => `SCENE ${i + 1} | ${beat}`)
      .join("\n"),
    captions: [
      { start: 0, end: 3, text: hook, style: "emphasis", position: "bottom" },
      {
        start: 3,
        end: 8,
        text: script.emotionBeat.slice(0, 80),
        style: "default",
        position: "bottom",
      },
      {
        start: 8,
        end: 15,
        text: script.featureDemo.slice(0, 80),
        style: "default",
        position: "bottom",
      },
      {
        start: 15,
        end: duration,
        text: "Download AmyNest AI",
        style: "cta",
        position: "bottom",
      },
    ],
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
      "ParentingTips",
      "KidsLearning",
      "StudyHabits",
      "MomLife",
      "DadLife",
      "Shorts",
      "ChildDevelopment",
      "FamilyRoutine",
      "GentleParenting",
      "AmyNestAI",
    ],
    keywords: [script.topic, script.featureName, "AmyNest", "Study Zone", category],
    seoScore: Math.min(95, Math.round(script.quality.ctrPrediction)),
    readingTime: Math.round(voiceScript.split(/\s+/).length / 2.5),
    estimatedDuration: duration,
    language: "en-IN",
    provider: "golden-script",
    generatedAt: new Date().toISOString(),
    version: CONTENT_PACKAGE_VERSION,
  };
}

function writeReport(state: RunState): string {
  const passFail = (ok: boolean) => (ok ? "PASS" : "FAIL");
  const md = [
    "# FIRST_PRODUCTION_RUN",
    "",
    `**Status:** ${state.status}`,
    `**Generated:** ${state.generatedAt}`,
    `**Golden Script ID:** \`${state.goldenScriptId}\``,
    `**Title:** ${state.goldenTitle}`,
    "",
    state.status === "FAILED"
      ? "## FAILURE — production stopped"
      : "## SUCCESS — first production video live (UNLISTED)",
    "",
    ...(state.rootCause
      ? ["### Root cause", "", state.rootCause, ""]
      : []),
    ...(state.stoppedAt
      ? [`**Stopped at step:** \`${state.stoppedAt}\``, ""]
      : []),
    "## Pre-flight checks",
    "",
    "| Check | Result | Detail |",
    "|---|---|---|",
    ...state.preflight.map(
      (c) =>
        `| ${c.label} | ${passFail(c.ok)} | ${c.detail.replace(/\|/g, "/")} |`,
    ),
    "",
    "## Execution timeline",
    "",
    ...(state.timeline.length
      ? [
          "| Step | Duration (ms) | Result | Detail |",
          "|---|---:|---|---|",
          ...state.timeline.map(
            (t) =>
              `| ${t.name} | ${t.durationMs} | ${passFail(t.ok)} | ${t.detail.replace(/\|/g, "/")} |`,
          ),
        ]
      : ["_No pipeline steps executed — stopped at pre-flight._"]),
    "",
    "## Pipeline results",
    "",
    `| Field | Value |`,
    `|---|---|`,
    `| Scene count | ${state.sceneCount || "n/a"} |`,
    `| Provider used | ${state.providerUsed || "n/a"} |`,
    `| Generation time | ${state.generationTimeMs || 0} ms |`,
    `| Render duration | ${state.renderDurationMs || 0} ms |`,
    `| Validation score | ${state.validationScore || 0} |`,
    `| Launch score | ${state.launchScore || 0} |`,
    `| Upload status | ${state.uploadStatus || "not attempted"} |`,
    `| Video ID | ${state.videoId || "n/a"} |`,
    `| Video URL | ${state.videoUrl || "n/a"} |`,
    `| Local video path | ${state.videoPath || "n/a"} |`,
    "",
    "## YouTube metadata",
    "",
    ...(state.metadata
      ? Object.entries(state.metadata).map(([k, v]) => `- **${k}:** ${v}`)
      : ["- _(not generated — run stopped early)_"]),
    "",
    "## Warnings",
    "",
    ...(state.warnings.length
      ? state.warnings.map((w) => `- ${w}`)
      : ["- None"]),
    "",
    "## Errors",
    "",
    ...(state.errors.length
      ? state.errors.map((e) => `- ${e}`)
      : ["- None"]),
    "",
    "## Continuous Learning",
    "",
    state.learningSummary ?? "_Not ingested — run did not reach learning step._",
    "",
    "## Remediation",
    "",
    ...(state.status === "FAILED"
      ? state.stoppedAt === "preflight"
        ? [
            "Add missing secrets to repo-root `.env.development`, then re-run.",
            "",
          ]
        : [
            `Fix the failure at \`${state.stoppedAt}\`, then re-run:`,
            "",
            "```bash",
            "cd content-engine && pnpm exec node --import tsx/esm ./operations/first-production-run.ts --reuse-assets",
            "```",
            "",
          ]
      : [
          "Video is **UNLISTED**. Review in YouTube Studio before making public.",
          "",
        ]),
  ].join("\n");

  mkdirSync(dirname(FIRST_PRODUCTION_RUN_PATH), { recursive: true });
  writeFileSync(FIRST_PRODUCTION_RUN_PATH, md, "utf8");
  return FIRST_PRODUCTION_RUN_PATH;
}

function fail(
  state: RunState,
  step: string,
  error: string,
  rootCause: string,
): RunState {
  state.status = "FAILED";
  state.stoppedAt = step;
  state.errors.push(error);
  state.rootCause = rootCause;
  return state;
}

/** Discover first narration/music audio file under candidate directories. */
function findFirstAudio(
  dirs: string[],
  nameHints: string[] = ["narration", "voice", "tts", "speech"],
): string | undefined {
  const exts = new Set([".wav", ".mp3", ".m4a", ".aac", ".flac"]);
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    const ranked = entries
      .filter((f) => exts.has(extname(f).toLowerCase()))
      .sort((a, b) => {
        const ah = nameHints.some((h) => a.toLowerCase().includes(h)) ? 0 : 1;
        const bh = nameHints.some((h) => b.toLowerCase().includes(h)) ? 0 : 1;
        return ah - bh || a.localeCompare(b);
      });
    if (ranked[0]) return join(dir, ranked[0]);
  }
  return undefined;
}

function probeVideo(path: string): { ok: boolean; detail: string; duration?: number } {
  if (!existsSync(path)) return { ok: false, detail: "file missing" };
  try {
    const out = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height,codec_name,duration",
        "-of",
        "csv=p=0",
        path,
      ],
      { encoding: "utf8" },
    ).trim();
    const [codec, width, height, duration] = out.split(",");
    const durationN = Number(duration);
    const ok =
      codec === "h264" &&
      Number(width) === 1080 &&
      Number(height) === 1920 &&
      durationN >= 15 &&
      durationN <= 30;
    return {
      ok,
      detail: `${codec} ${width}x${height} ${duration}s`,
      duration: durationN,
    };
  } catch (e) {
    return {
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Stitch real Veo clips + brand end-card beat into a 20–22s Short.
 * Refuses silent anullsrc — narration + music paths are required for production.
 */
function assembleVerticalShort(options: {
  clipDir: string;
  outputPath: string;
  targetSeconds?: number;
  /** Required production narration/TTS audio (wav/mp3/m4a). */
  narrationPath?: string;
  /** Required production music bed. */
  musicPath?: string;
  /** Optional burned-in subtitle file (.srt / .ass). */
  subtitlePath?: string;
}): { ok: boolean; detail: string; path: string } {
  const target = options.targetSeconds ?? TARGET_DURATION;
  const endSeconds = 2.5;
  const bodySeconds = target - endSeconds;
  const kit = getBrandIdentityKit();
  const endCardImage =
    kit.appIconAsset && existsSync(kit.appIconAsset)
      ? kit.appIconAsset
      : join(HERE, "..", "brand", "assets", "app-icon.png");

  if (!options.narrationPath || !existsSync(options.narrationPath)) {
    return {
      ok: false,
      detail:
        "Production stitch refused: narrationPath required (silent anullsrc is forbidden)",
      path: "",
    };
  }
  if (!options.musicPath || !existsSync(options.musicPath)) {
    return {
      ok: false,
      detail:
        "Production stitch refused: musicPath required (silent / music-less masters are forbidden)",
      path: "",
    };
  }

  const clips = readdirSync(options.clipDir)
    .filter((f) => f.endsWith(".mp4"))
    .map((f) => join(options.clipDir, f))
    .sort();
  if (clips.length === 0) {
    return { ok: false, detail: "No Veo mp4 clips found to stitch", path: "" };
  }

  // Take up to 4 clips; trim evenly into the body window.
  const selected = clips.slice(0, 4);
  const perClip = Math.max(3, bodySeconds / selected.length);
  mkdirSync(dirname(options.outputPath), { recursive: true });

  const args: string[] = ["-y"];
  for (const clip of selected) {
    args.push("-i", clip);
  }
  args.push("-loop", "1", "-t", String(endSeconds), "-i", endCardImage);
  args.push("-i", options.narrationPath);
  args.push("-i", options.musicPath);

  const filters: string[] = [];
  const concatLabels: string[] = [];
  selected.forEach((_, i) => {
    filters.push(
      `[${i}:v]trim=0:${perClip.toFixed(3)},setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v${i}]`,
    );
    concatLabels.push(`[v${i}]`);
  });
  const endIdx = selected.length;
  filters.push(
    `[${endIdx}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x461EA8,setsar=1,fps=30,format=yuv420p,trim=0:${endSeconds},setpts=PTS-STARTPTS[vend]`,
  );
  concatLabels.push("[vend]");
  const n = concatLabels.length;
  const narrIdx = selected.length + 1;
  const musicIdx = selected.length + 2;
  // Mix narration + ducked music — never anullsrc.
  filters.push(
    `[${narrIdx}:a]atrim=0:${target},asetpts=PTS-STARTPTS,volume=1.0[narr]`,
  );
  filters.push(
    `[${musicIdx}:a]atrim=0:${target},asetpts=PTS-STARTPTS,volume=0.22[music]`,
  );
  filters.push(`[narr][music]amix=inputs=2:duration=first:dropout_transition=0[aout]`);

  let voutLabel = "vout";
  filters.push(`${concatLabels.join("")}concat=n=${n}:v=1:a=0[${voutLabel}]`);
  if (options.subtitlePath && existsSync(options.subtitlePath)) {
    const esc = options.subtitlePath.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
    filters.push(`[${voutLabel}]subtitles='${esc}'[vsub]`);
    voutLabel = "vsub";
  }

  args.push(
    "-filter_complex",
    filters.join(";"),
    "-map",
    `[${voutLabel}]`,
    "-map",
    "[aout]",
    "-t",
    String(target),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    options.outputPath,
  );

  try {
    execFileSync("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    return {
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
      path: "",
    };
  }
  const probe = probeVideo(options.outputPath);
  return {
    ok: probe.ok,
    detail: `stitched ${selected.length} Veo clips + end card → ${probe.detail}`,
    path: options.outputPath,
  };
}

function toRenderPackage(input: {
  videoPath: string;
  storyboardId: string;
  assetPackageId: string;
  duration: number;
  outputDirectory: string;
}): RenderPackage {
  const checksum = createHash("sha256")
    .update(input.videoPath + String(input.duration))
    .digest("hex")
    .slice(0, 24);
  return {
    id: `rp_first_prod_${checksum}`,
    version: RENDER_PACKAGE_VERSION,
    createdAt: new Date().toISOString(),
    storyboardId: input.storyboardId,
    assetPackageId: input.assetPackageId,
    videoPath: input.videoPath,
    duration: input.duration,
    resolution: { width: 1080, height: 1920 },
    fps: 30,
    codec: "h264",
    audioCodec: "aac",
    container: "mp4",
    checksum,
    renderMetadata: {
      jobId: `job_first_prod_${checksum}`,
      storyboardId: input.storyboardId,
      assetPackageId: input.assetPackageId,
      compositionFingerprint: checksum,
      renderer: "ffmpeg",
      outputDirectory: input.outputDirectory,
      // Never claim burned-in / watermark without evidence — probe decides.
      subtitleMode: "none",
      watermarkApplied: false,
      createdAt: new Date().toISOString(),
      artifacts: {},
    },
    telemetry: {
      renderTimeMs: 0,
      encodingTimeMs: 0,
      frames: Math.round(input.duration * 30),
      droppedFrames: 0,
      cacheHit: false,
      provider: "ffmpeg",
    },
    validation: {
      ok: false,
      errors: [
        {
          path: "validation",
          message:
            "Render package claims are untrusted until evidence certification PASS",
          severity: "error",
        },
      ],
      warnings: [],
    },
    progressLog: [],
  };
}

export async function runFirstProduction(): Promise<RunState> {
  const started = Date.now();
  const state: RunState = {
    status: "FAILED",
    generatedAt: new Date().toISOString(),
    goldenScriptId: GOLDEN_ID,
    goldenTitle: "",
    sceneCount: 0,
    providerUsed: "",
    generationTimeMs: 0,
    renderDurationMs: 0,
    validationScore: 0,
    launchScore: 0,
    uploadStatus: "not attempted",
    videoUrl: "",
    videoId: "",
    videoPath: "",
    warnings: [],
    errors: [],
    preflight: [],
    timeline: [],
  };

  loadAmyNestEnvFiles(REPO_ROOT);
  loadAmyNestEnvFiles(process.cwd());

  // Identify golden script up front for failure reporting.
  try {
    const preview = loadGolden001();
    state.goldenTitle = preview.title;
  } catch {
    state.goldenTitle = "A Fresh Lesson Every Day — Without the Worksheet Panic";
  }

  // --- Pre-flight / secrets gate (hard stop — no mock bypass) ---
  const geminiEnabled = process.env.AMYNEST_GEMINI_ENABLED === "true";
  const veoEnabled = process.env.AMYNEST_VEO_ENABLED === "true";
  const media = resolveGeminiMediaSettings(loadDefaultConfig(), process.env);
  const geminiKey = readGeminiApiKey(media, process.env);

  state.preflight.push({
    id: "gemini-key",
    label: "GEMINI_API_KEY",
    ok: Boolean(geminiKey),
    detail: geminiKey
      ? `present (len=${geminiKey.length})`
      : "MISSING in .env.development / process.env",
  });
  state.preflight.push({
    id: "gemini-enabled",
    label: "AMYNEST_GEMINI_ENABLED=true",
    ok: geminiEnabled,
    detail: process.env.AMYNEST_GEMINI_ENABLED ?? "MISSING",
  });
  state.preflight.push({
    id: "veo-enabled",
    label: "AMYNEST_VEO_ENABLED=true",
    ok: veoEnabled,
    detail: process.env.AMYNEST_VEO_ENABLED ?? "MISSING",
  });

  let accessToken = "";
  try {
    accessToken = await resolveYouTubeAccessToken({
      env: process.env,
      persistToEnv: true,
    });
    state.preflight.push({
      id: "youtube-oauth",
      label: "YouTube OAuth refresh",
      ok: Boolean(accessToken),
      detail: accessToken ? `OK (token len=${accessToken.length})` : "EMPTY token",
    });
  } catch (e) {
    state.preflight.push({
      id: "youtube-oauth",
      label: "YouTube OAuth refresh",
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    });
  }

  // Provider access probes only when key is present — never invent access.
  if (geminiKey) {
    const baseUrl = (
      media.baseUrl || "https://generativelanguage.googleapis.com/v1beta"
    ).replace(/\/$/, "");
    const probes: Array<{ id: string; label: string; model: string }> = [
      { id: "gemini-api", label: "Gemini API access", model: media.script.model },
      { id: "imagen", label: "Imagen access", model: media.image.model },
      {
        id: "veo",
        label: "Veo access",
        model: resolveVideoModelId(media.video),
      },
      { id: "tts", label: "Gemini TTS access", model: media.voice.model },
    ];
    for (const probe of probes) {
      try {
        const url = `${baseUrl}/models/${probe.model}?key=${encodeURIComponent(geminiKey)}`;
        const t0 = Date.now();
        const res = await fetch(url);
        const ok = res.ok;
        state.preflight.push({
          id: probe.id,
          label: probe.label,
          ok,
          detail: ok
            ? `${probe.model} reachable (${Date.now() - t0}ms)`
            : `${probe.model} HTTP ${res.status}`,
        });
      } catch (e) {
        state.preflight.push({
          id: probe.id,
          label: probe.label,
          ok: false,
          detail: e instanceof Error ? e.message : String(e),
        });
      }
    }
  } else {
    for (const probe of [
      { id: "gemini-api", label: "Gemini API access" },
      { id: "imagen", label: "Imagen access" },
      { id: "veo", label: "Veo access" },
      { id: "tts", label: "Gemini TTS access" },
    ]) {
      state.preflight.push({
        id: probe.id,
        label: probe.label,
        ok: false,
        detail: "SKIPPED — GEMINI_API_KEY missing",
      });
    }
  }

  const preflightFailed = state.preflight.filter((c) => !c.ok);
  if (preflightFailed.length > 0) {
    return fail(
      state,
      "preflight",
      preflightFailed.map((c) => `${c.label}: ${c.detail}`).join(" | "),
      [
        "Root cause: Pre-flight failed — required production secrets/providers are not available.",
        "Secrets gate was NOT bypassed. Mock/placeholder providers were NOT used.",
        `Failed checks: ${preflightFailed.map((c) => c.id).join(", ")}.`,
        "Local `.env.development` currently has YouTube OAuth; Gemini flags/key are still absent.",
        "Add GEMINI_API_KEY + AMYNEST_GEMINI_ENABLED=true + AMYNEST_VEO_ENABLED=true, then resume.",
      ].join(" "),
    );
  }

  // Real providers only for this process.
  process.env.AMYNEST_PUBLISHING_PROVIDER = "youtube";
  process.env.AMYNEST_RENDERER = "ffmpeg";

  const outRoot = join(REPO_ROOT, ".amynest-assets", "first-production");
  mkdirSync(outRoot, { recursive: true });

  let golden: GoldenScript;
  try {
    golden = loadGolden001();
    state.goldenTitle = golden.title;
  } catch (e) {
    return fail(
      state,
      "golden-script",
      e instanceof Error ? e.message : String(e),
      "Failed to load golden-001 from the Golden Script Library.",
    );
  }

  const content = goldenToContentPackage(golden);
  enhanceGenerationInput({
    title: content.title,
    category: content.topic.category,
    keywords: content.keywords,
    language: content.language,
    duration: content.estimatedDuration,
  });

  // Content Intelligence + Campaign
  try {
    const intel = new ContentIntelligence({
      campaignMode: "7-day-reading-challenge",
    });
    const gate = intel.evaluateTopic(content.topic, {
      campaignMode: "7-day-reading-challenge",
    });
    if (!gate.ok) {
      return fail(
        state,
        "content-intelligence",
        `Topic gate rejected: ${gate.reasons.join("; ")}`,
        "Content Intelligence gate failed for golden-001 under 7-day-reading-challenge.",
      );
    }
    intel.plan({ campaignMode: "7-day-reading-challenge" });
    intel.rememberPackage(content, "first-prod-preview");
  } catch (e) {
    return fail(
      state,
      "content-intelligence",
      e instanceof Error ? e.message : String(e),
      "Content Intelligence / Campaign Manager threw during planning.",
    );
  }

  // Scene Composer + AI Director
  let composed;
  try {
    composed = composeProductionScenes({
      contentPackage: content,
      duration: TARGET_DURATION,
    });
    state.sceneCount = composed.scenes.length;
    if (!composed.director?.quality.ok) {
      return fail(
        state,
        "ai-director",
        composed.director?.quality.summary ?? "AI Director quality failed",
        "AI Director rejected the directed scene package.",
      );
    }
    if (!composed.endCard?.required) {
      return fail(
        state,
        "scene-composer",
        "End card missing from Scene Composer package",
        "Brand end card was not planned — cannot ship without official end card.",
      );
    }
  } catch (e) {
    return fail(
      state,
      "scene-composer",
      e instanceof Error ? e.message : String(e),
      "Scene Composer / AI Director failed.",
    );
  }

  const config = {
    ...loadDefaultConfig(),
    scriptProvider: "gemini" as const,
    fallbackProvider: "mock" as const,
    renderer: "ffmpeg" as const,
    preferredRenderer: "ffmpeg" as const,
    publishingProvider: "youtube" as const,
    analyticsProvider: "mock" as const,
    defaultVisibility: "unlisted" as const,
    maximumRetries: 1,
    outputDirectory: outRoot,
    aspectRatio: "9:16" as const,
    resolution: "1080x1920" as const,
    maximumAIAssets: 8,
    preferredProviders: [
      "google-imagen" as const,
      "google-veo" as const,
      "local-library" as const,
    ],
    // Fail closed — no mock/placeholder asset fallbacks on first production.
    allowFallbacks: false,
  };

  // Storyboard + Brand
  let storyboard;
  try {
    storyboard = new StoryboardPlanner({ config }).planFromContentPackage(
      content,
      TARGET_DURATION,
    ).package;
    // Storyboard-only brand check — do NOT claim final-MP4 media evidence here.
    const brandGate = evaluateBrandQualityGate({
      storyboard,
      content,
      width: 1080,
      height: 1920,
      durationSeconds: TARGET_DURATION,
      requireMediaEvidence: false,
    });
    if (!brandGate.ok) {
      return fail(
        state,
        "brand-layer",
        brandGate.findings.map((f) => f.message).join("; "),
        "Brand Validator rejected the storyboard/content package.",
      );
    }
  } catch (e) {
    return fail(
      state,
      "storyboard-planner",
      e instanceof Error ? e.message : String(e),
      "Storyboard Planner failed.",
    );
  }

  // Asset + Video generation (Gemini stack — registry auto-wires when key present)
  process.env.AMYNEST_GEMINI_OUTPUT_DIR = outRoot;
  process.env.AMYNEST_VEO_OUTPUT_DIR = join(outRoot, "video");
  const reuseAssets =
    process.argv.includes("--reuse-assets") ||
    process.env.AMYNEST_FIRST_PROD_REUSE_ASSETS === "1";
  const existingClipDir = join(outRoot, "video");
  const existingClips =
    existsSync(existingClipDir) &&
    readdirSync(existingClipDir).filter((f) => f.endsWith(".mp4")).length >= 2;

  let assetPackage;
  if (reuseAssets && existingClips) {
    state.warnings.push(
      "Reusing existing Veo clips from .amynest-assets/first-production/video (no placeholder).",
    );
    state.providerUsed = "google-veo (reused), google-imagen (reused), ffmpeg";
    state.timeline.push({
      name: "video-generation",
      ok: true,
      durationMs: 0,
      detail: `reuse-assets: ${readdirSync(existingClipDir).filter((f) => f.endsWith(".mp4")).length} clips`,
    });
  } else {
    try {
      const t0 = Date.now();
      const registry = createDefaultAssetRegistry();
      const assets = await new AssetOrchestrator({
        config,
        registry,
      }).orchestrate(storyboard);
      assetPackage = assets.package;
      state.providerUsed =
        assetPackage.providerMetadata
          .map((p) => p.providerId)
          .filter(Boolean)
          .slice(0, 6)
          .join(", ") || "gemini-media";
      state.timeline.push({
        name: "video-generation",
        ok: true,
        durationMs: Date.now() - t0,
        detail: `providers=${state.providerUsed} assets=${assetPackage.resolvedAssets.length}`,
      });
      if (
        !assetPackage.validation.ok &&
        assetPackage.resolvedAssets.length === 0
      ) {
        return fail(
          state,
          "asset-generation",
          assetPackage.warnings.join("; ") || "No assets resolved",
          "Asset / Video generation produced no usable media.",
        );
      }
    } catch (e) {
      return fail(
        state,
        "video-generation",
        e instanceof Error ? e.message : String(e),
        "Gemini Imagen/Veo/TTS asset generation failed. Check GEMINI_API_KEY billing and model access.",
      );
    }
  }

  // Render: prefer stitched Veo clips → 20s Short (composition timeline alone can under-run).
  let renderPackage: RenderPackage;
  try {
    const t0 = Date.now();
    const finalPath = join(outRoot, "amynest-first-production-golden-001.mp4");
    const clipDir = existsSync(existingClipDir)
      ? existingClipDir
      : join(outRoot, "video");
    const narrationPath = findFirstAudio([
      join(outRoot, "audio"),
      join(outRoot, "voice"),
      join(outRoot, "tts"),
      join(clipDir, "..", "audio"),
      join(clipDir, "..", "voice"),
    ]);
    const musicPath = findFirstAudio([
      join(outRoot, "music"),
      join(outRoot, "audio", "music"),
      join(clipDir, "..", "music"),
    ], ["bed", "music", "score"]);
    const subtitlePath = [
      join(outRoot, "captions.srt"),
      join(outRoot, "subtitles.srt"),
      join(outRoot, "captions.ass"),
    ].find((p) => existsSync(p));

    const assembled = assembleVerticalShort({
      clipDir,
      outputPath: finalPath,
      targetSeconds: TARGET_DURATION,
      narrationPath,
      musicPath,
      subtitlePath,
    });
    if (!assembled.ok) {
      // Never fall back to a silent master. Missing narration/music is a hard fail.
      if (/narrationPath required|musicPath required|anullsrc/i.test(assembled.detail)) {
        return fail(
          state,
          "rendering",
          assembled.detail,
          "Production stitch requires real narration + music assets. Silent AAC is forbidden.",
        );
      }
      // Fallback to RenderOrchestrator only when stitch fails and we have a fresh asset package.
      if (!assetPackage) {
        return fail(
          state,
          "rendering",
          assembled.detail,
          "Could not stitch Veo clips into a 20s Short, and no fresh AssetPackage for RenderOrchestrator.",
        );
      }
      const renderRegistry = createDefaultRenderRegistry();
      renderRegistry.register(new FFmpegRenderer());
      const rendered = await new RenderOrchestrator({
        config,
        registry: renderRegistry,
      }).render({ storyboard, assets: assetPackage });
      renderPackage = rendered.package;
      const probe = probeVideo(renderPackage.videoPath);
      if (!probe.ok) {
        return fail(
          state,
          "rendering",
          `Render+stitch failed. stitch=${assembled.detail}; render=${probe.detail}`,
          "FFmpeg did not produce a valid 1080x1920 H.264 Short in the 15–30s window.",
        );
      }
    } else {
      renderPackage = toRenderPackage({
        videoPath: assembled.path,
        storyboardId: storyboard.id,
        assetPackageId: assetPackage?.id ?? "ap_reused_veo_clips",
        duration: TARGET_DURATION,
        outputDirectory: outRoot,
      });
      state.warnings.push(assembled.detail);
    }
    state.renderDurationMs = Date.now() - t0;
    state.videoPath = renderPackage.videoPath;
    const probe = probeVideo(renderPackage.videoPath);
    if (!probe.ok) {
      return fail(
        state,
        "rendering",
        `Final video failed probe: ${probe.detail}`,
        "Assembled Short is not a valid 1080x1920 H.264 15–30s file.",
      );
    }
    state.timeline.push({
      name: "rendering",
      ok: true,
      durationMs: state.renderDurationMs,
      detail: probe.detail,
    });
    state.warnings.push(`Render probe OK: ${probe.detail}`);
  } catch (e) {
    return fail(
      state,
      "rendering",
      e instanceof Error ? e.message : String(e),
      "Render / stitch step failed.",
    );
  }

  // Launch Validator ≥ 95
  try {
    const settings = {
      ...config,
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
    const metadata = buildPublishMetadata(content, settings);
    const thumbnail = resolveThumbnail({
      brandingDefaultPath: "brand://amynest-default-thumb.jpg",
    });
    const schedule = buildSchedulePlan({
      policy: settings.schedulePolicy,
      visibility: "unlisted",
      uploadTime: "09:00",
    });
    const launch = validateLaunch({
      content,
      render: renderPackage,
      metadata,
      thumbnail,
      schedule,
      storyboard,
      evidenceWorkDir: join(outRoot, "evidence"),
    });
    state.launchScore = launch.scores.overall;
    state.validationScore = launch.scores.overall;
    writeLaunchValidationReport({
      report: launch,
      outputDirectory: outRoot,
    });
    if (launch.qualityReportPath) {
      state.warnings.push(`QUALITY_REPORT.json → ${launch.qualityReportPath}`);
    }
    state.metadata = {
      "SEO Title": metadata.title,
      "SEO Description": metadata.description.slice(0, 280) + "…",
      Hashtags: content.hashtags.map((h) => `#${h}`).join(" "),
      Keywords: content.keywords.join(", "),
      Language: metadata.language ?? content.language,
      Category: metadata.categoryId ?? "22",
      Playlist: settings.playlist,
      Visibility: "unlisted",
      "Thumbnail recommendation":
        "Emotion close-up of child at Study Zone + calm parent — end with AmyNest app icon.",
    };
    if (!launch.ok || launch.scores.overall < 95) {
      return fail(
        state,
        "launch-validator",
        `Launch score ${launch.scores.overall} < 95; recommendation=${launch.recommendation}; ${launch.reasons.slice(0, 5).join(" | ")}`,
        "Launch Validator did not reach the required ≥95 auto-approve threshold.",
      );
    }
  } catch (e) {
    return fail(
      state,
      "launch-validator",
      e instanceof Error ? e.message : String(e),
      "Launch Validator threw before upload.",
    );
  }

  // YouTube upload UNLISTED
  let published: PublishedVideo;
  try {
    const publisher = new PublishingOrchestrator({ config });
    const result = await publisher.publish({
      content,
      render: renderPackage,
      overrides: { visibility: "unlisted" },
    });
    published = result.video;
    state.videoId = published.videoId;
    state.videoUrl = published.url;
    state.uploadStatus = published.verification.ok
      ? "uploaded+verified"
      : "uploaded-unverified";
    if (!published.verification.videoExists) {
      return fail(
        state,
        "youtube-verify",
        published.verification.issues.join("; ") || "Video not found after upload",
        "YouTube upload completed but verification failed (not playable / missing).",
      );
    }
  } catch (e) {
    return fail(
      state,
      "youtube-upload",
      e instanceof Error ? e.message : String(e),
      "YouTube upload failed. Video was generated but not published.",
    );
  }

  // Continuous Learning
  try {
    const learning = new ContinuousLearningEngine().ingest({
      videos: [published],
      contentByVideoId: { [published.videoId]: content },
      goldenScriptIdByVideoId: { [published.videoId]: golden.id },
      campaignByVideoId: { [published.videoId]: "7-day-reading-challenge" },
      metrics: [
        synthesizeMetricsFromViews({
          videoId: published.videoId,
          views: 0,
          retention: 0,
          ctr: 0,
        }),
      ],
      month: new Date().toISOString().slice(0, 7),
    });
    state.learningSummary = [
      `DNA profiles: ${learning.dnaProfiles.length}`,
      `Knowledge entries: ${learning.knowledge.length}`,
      `Experiments planned: ${learning.experiments.length}`,
      `Prompt addendum:`,
      learning.promptHints.systemPromptAddendum,
    ].join("\n");
  } catch (e) {
    state.warnings.push(
      `Continuous Learning ingest warning: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  state.status = "SUCCESS";
  state.generationTimeMs = Date.now() - started;
  state.providerUsed = state.providerUsed || "google-veo+imagen+ffmpeg+youtube";
  return state;
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const state = await runFirstProduction();
  const path = writeReport(state);
  console.log(
    JSON.stringify(
      {
        status: state.status,
        path,
        stoppedAt: state.stoppedAt,
        launchScore: state.launchScore,
        videoId: state.videoId,
        videoUrl: state.videoUrl,
        rootCause: state.rootCause,
        errors: state.errors,
      },
      null,
      2,
    ),
  );
  process.exitCode = state.status === "SUCCESS" ? 0 : 1;
}

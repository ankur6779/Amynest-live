/**
 * REAL PRODUCTION RUN — KIE.ai media provider override for THIS run only.
 *
 * Does NOT modify production pipeline, validators, rendering, publishing, or architecture.
 * Reuses golden-001 assets (keyframes, captions, CTA, narration, music, metadata path).
 * Generates Veo performances via KIE.ai, validates with existing Launch Validator,
 * uploads UNLISTED via existing PublishingOrchestrator only if cert=PASS.
 *
 * Run:
 *   pnpm exec node --import tsx/esm ./operations/kie-production-run.ts
 *
 * Optional:
 *   AMYNEST_KIE_REUSE_RAWS=1     — remux existing bakeoff KIE raws (no new KIE spend)
 *   AMYNEST_KIE_VEO_QUALITY=1    — use Veo 3.1 Quality (veo3) instead of Fast
 *   AMYNEST_KIE_VEO_RESOLUTION=720p|1080p  — default 1080p native
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDefaultConfig } from "../config/index.js";
import { performancePrompt } from "../creative-composition/performances.js";
import type { CompositionShotPlan } from "../creative-composition/types.js";
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
import { getTopicById } from "../topics/index.js";
import type { ContentPackage } from "../types/content-package.js";
import { CONTENT_PACKAGE_VERSION } from "../types/content-package.js";
import type { Topic, TopicCategory } from "../types/index.js";
import type { RenderPackage } from "../types/render-package.js";
import { RENDER_PACKAGE_VERSION } from "../types/render-package.js";
import { loadAmyNestEnvFiles } from "./env/load-env.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "../..");
const PROD = join(REPO_ROOT, ".amynest-assets/second-production");
const PROD_WORK = join(PROD, "work/cinematic");
const BAKEOFF_RAW = join(
  REPO_ROOT,
  ".amynest-assets/provider-bakeoff-final/kie/work/veo",
);
const OUT = (() => {
  const override = process.env.AMYNEST_KIE_OUT_DIR?.trim();
  if (!override) return join(REPO_ROOT, ".amynest-assets/kie-production");
  return override.startsWith("/") ? override : join(REPO_ROOT, override);
})();
const REPORT_PATH =
  process.env.AMYNEST_KIE_REPORT_PATH ||
  join(HERE, "../docs/operations/KIE_PRODUCTION_RUN.md");
const MASTER_NAME =
  process.env.AMYNEST_KIE_MASTER_NAME || "amynest-kie-production-golden-001.mp4";
const GOLDEN_ID = "golden-001";
const TARGET = 21;
const KIE_CREDIT_USD = 0.005;
/** Measured 2026-07-31 probe: Fast@1080p ≈65 credits/shot; Quality@1080p ≈255. */
const KIE_CREDITS_FAST_1080 = 65;
const KIE_CREDITS_QUALITY_1080 = 255;
const X264_QUALITY = ["-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high"];

function resolveKieMediaQuality(): {
  model: "veo3" | "veo3_fast";
  resolution: "720p" | "1080p";
  label: string;
  creditsPerShot: number;
} {
  const wantQuality =
    process.env.AMYNEST_KIE_VEO_QUALITY === "1" ||
    process.env.AMYNEST_KIE_VEO_MODEL === "veo3";
  const resolution =
    process.env.AMYNEST_KIE_VEO_RESOLUTION === "720p" ? "720p" : "1080p";
  if (wantQuality) {
    return {
      model: "veo3",
      resolution,
      label: `Veo 3.1 Quality @ ${resolution}`,
      creditsPerShot:
        resolution === "1080p" ? KIE_CREDITS_QUALITY_1080 : KIE_CREDITS_QUALITY_1080,
    };
  }
  return {
    model: "veo3_fast",
    resolution,
    label: `Veo 3.1 Fast @ ${resolution} (native, quality-boosted prompts)`,
    creditsPerShot:
      resolution === "1080p" ? KIE_CREDITS_FAST_1080 : 60,
  };
}

/** KIE-only prompt boost — does not modify shared creative-composition prompts. */
function boostKiePrompt(base: string, shot: CompositionShotPlan): string {
  return [
    base,
    "Premium Pixar-quality animated commercial — living continuous performance, never a slideshow, never Ken Burns, never static pose.",
    "Motion: natural body weight shifts, eye blinks every 1–2 seconds, micro facial expression changes, clear hand gestures, soft hair and fabric movement.",
    "Camera: cinematic language with slow push-in or gentle dolly, subtle parallax between foreground/midground/background, shallow depth of field, professional framing.",
    "Lighting: soft cinematic key light, consistent grounded shadows, warm family color grade, rich contrast without oversaturation.",
    "Identity lock: keep the exact same character face, wardrobe, proportions, and colors from the first frame across every frame — AmyNest official character only.",
    "Render: sharp facial detail, clean edges, high clarity, minimal compression artifacts.",
    `Shot role: ${shot.role}.`,
  ].join(" ");
}

const SHOTS: CompositionShotPlan[] = [
  {
    id: "shot-hook",
    durationSeconds: 4,
    character: "amy-girl",
    role: "hook",
    environment: "study-desk",
    camera: "push-in",
    kind: "veo-performance",
    caption: "Parents feel the worksheet panic today",
    performance:
      "looks at unfinished worksheets, soft bored expression, blinks, small sigh, glances toward window",
    notes: "kie-production",
  },
  {
    id: "shot-amy-host",
    durationSeconds: 4,
    character: "amy-ai",
    role: "amy-host",
    environment: "living-room",
    camera: "pan-right",
    kind: "veo-performance",
    caption: "The struggle is real — worksheets gather dust",
    performance:
      "floats into frame, waves hello, welcomes parents, points toward a tablet on the table, soft smile, blinks",
    notes: "kie-production",
  },
  {
    id: "shot-amy-girl-learn",
    durationSeconds: 6,
    character: "amy-girl",
    role: "amy-girl-learn",
    environment: "study-desk",
    camera: "push-in",
    kind: "veo-performance",
    caption: "AmyNest Study Zone — a fresh lesson every day",
    performance:
      "opens a tablet, taps Study Zone lesson card, eyes light up, small smile, finger taps progress ring briefly visible on device screen",
    notes: "kie-production",
  },
  {
    id: "shot-amy-boy-celebrate",
    durationSeconds: 4,
    character: "amy-boy",
    role: "amy-boy-celebrate",
    environment: "child-bedroom",
    camera: "orbit-soft",
    kind: "veo-performance",
    caption: "Hope lands — calmer progress together",
    performance:
      "celebrates finishing a lesson, small jump, fist pump, big smile, looks toward camera warmly",
    notes: "kie-production",
  },
  {
    id: "shot-cta",
    durationSeconds: 4,
    character: "amy-ai",
    role: "cta",
    environment: "cta-stage",
    camera: "slow-zoom",
    kind: "cta-overlay",
    caption: "Download AmyNest AI",
    performance:
      "waves inviting parents to download, gentle float, eye contact with camera, warm smile",
    notes: "kie-production",
  },
];

interface RunState {
  status: "SUCCESS" | "FAILED";
  generatedAt: string;
  provider: "kie.ai";
  model: string;
  goldenScriptId: string;
  goldenTitle: string;
  stoppedAt?: string;
  rootCause?: string;
  errors: string[];
  warnings: string[];
  timeline: Array<{ name: string; ok: boolean; durationMs: number; detail: string }>;
  creditsBefore: number | null;
  creditsAfter: number | null;
  creditsConsumed: number | null;
  actualBilledUsd: number | null;
  generationDurationMs: number;
  renderingDurationMs: number;
  uploadDurationMs: number;
  videoPath: string;
  videoId: string;
  videoUrl: string;
  uploadStatus: string;
  launchScore: number;
  certification: string;
  qualityReportPath: string;
  reusedRaws: boolean;
  qualityMode: string;
  generationResolution: string;
  fps: number;
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

function fail(state: RunState, at: string, error: string, rootCause: string): RunState {
  state.status = "FAILED";
  state.stoppedAt = at;
  state.errors.push(error);
  state.rootCause = rootCause;
  state.uploadStatus = "not attempted — stopped before upload";
  writeReport(state);
  return state;
}

function ensureDir(p: string): void {
  mkdirSync(p, { recursive: true });
}

function ffmpeg(args: string[]): void {
  execFileSync("ffmpeg", ["-y", ...args], {
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 32 * 1024 * 1024,
  });
}

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function httpJson(
  url: string,
  options: { method?: string; key: string; body?: unknown },
): Promise<{ ok: boolean; status: number; json: any }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.key}`,
    Accept: "application/json",
    "User-Agent": "AmyNestKieProduction/1.0",
  };
  let body: string | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body,
  });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

async function kieCredits(key: string): Promise<number> {
  const r = await httpJson("https://api.kie.ai/api/v1/chat/credit", { key });
  return Number(r.json?.data ?? NaN);
}

async function kieUpload(key: string, filePath: string, fileName: string): Promise<string> {
  const b64 = readFileSync(filePath).toString("base64");
  const r = await httpJson("https://kieai.redpandaai.co/api/file-base64-upload", {
    method: "POST",
    key,
    body: {
      base64Data: `data:image/png;base64,${b64}`,
      uploadPath: "amynest-kie-production",
      fileName,
    },
  });
  const url = r.json?.data?.downloadUrl || r.json?.data?.fileUrl;
  if (!url) throw new Error(`KIE upload failed: ${JSON.stringify(r.json).slice(0, 400)}`);
  return url;
}

async function kieGenerate(
  key: string,
  shot: CompositionShotPlan,
  imageUrl: string,
  prompt: string,
  media: { model: "veo3" | "veo3_fast"; resolution: "720p" | "1080p" },
): Promise<string> {
  const create = await httpJson("https://api.kie.ai/api/v1/veo/generate", {
    method: "POST",
    key,
    body: {
      prompt,
      imageUrls: [imageUrl],
      model: media.model,
      generationType: "FIRST_AND_LAST_FRAMES_2_VIDEO",
      aspect_ratio: "9:16",
      resolution: media.resolution,
      duration: shot.durationSeconds,
      enableTranslation: false,
    },
  });
  const taskId = create.json?.data?.taskId;
  if (!create.ok || !taskId) {
    throw new Error(`KIE create failed: ${JSON.stringify(create.json).slice(0, 500)}`);
  }
  for (let i = 0; i < 120; i++) {
    await sleep(8000);
    const poll = await httpJson(
      `https://api.kie.ai/api/v1/veo/record-info?taskId=${encodeURIComponent(taskId)}`,
      { key },
    );
    const flag = poll.json?.data?.successFlag;
    if (flag === 1) {
      const urls = poll.json?.data?.response?.resultUrls || [];
      if (!urls[0]) throw new Error("KIE success without result URL");
      return urls[0] as string;
    }
    if (flag === 2 || flag === 3) {
      throw new Error(poll.json?.data?.errorMessage || "KIE generation failed");
    }
  }
  throw new Error(`KIE timeout taskId=${taskId}`);
}

async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url, {
    headers: { "User-Agent": "AmyNestKieProduction/1.0" },
  });
  if (!res.ok) throw new Error(`download ${res.status}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

function burnCaption(
  videoPath: string,
  captionPng: string,
  outputPath: string,
  seconds: number,
): void {
  ffmpeg([
    "-i",
    videoPath,
    "-loop",
    "1",
    "-t",
    String(seconds),
    "-i",
    captionPng,
    "-filter_complex",
    `[0:v]trim=0:${seconds},setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p[base];[1:v]format=rgba[cap];[base][cap]overlay=(W-w)/2:H-h-150:format=auto,format=yuv420p[v]`,
    "-map",
    "[v]",
    "-an",
    "-t",
    String(seconds),
    ...X264_QUALITY,
    "-pix_fmt",
    "yuv420p",
    outputPath,
  ]);
}

function burnCta(
  veoPath: string,
  ctaPlatePath: string,
  captionPng: string,
  outputPath: string,
  workDir: string,
  seconds: number,
): void {
  const wave = join(workDir, "cta-wave.mp4");
  const card = join(workDir, "cta-card.mp4");
  const waveSec = Math.min(1.5, seconds - 2.5);
  const cardSec = seconds - waveSec;
  ffmpeg([
    "-i",
    veoPath,
    "-filter_complex",
    `[0:v]trim=0:${waveSec},setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p[v]`,
    "-map",
    "[v]",
    "-an",
    "-t",
    String(waveSec),
    ...X264_QUALITY,
    "-pix_fmt",
    "yuv420p",
    wave,
  ]);
  ffmpeg([
    "-loop",
    "1",
    "-t",
    String(cardSec),
    "-i",
    ctaPlatePath,
    "-loop",
    "1",
    "-t",
    String(cardSec),
    "-i",
    captionPng,
    "-filter_complex",
    `[0:v]scale=1300:2310:force_original_aspect_ratio=increase,crop=1080:1920:x='min(180,22*t)':y='min(120,18*t)',fps=30,format=yuv420p[base];[1:v]format=rgba[cap];[base][cap]overlay=(W-w)/2:H-h-120:format=auto,format=yuv420p[v]`,
    "-map",
    "[v]",
    "-an",
    "-t",
    String(cardSec),
    ...X264_QUALITY,
    "-pix_fmt",
    "yuv420p",
    card,
  ]);
  const list = join(workDir, "cta-concat.txt");
  writeFileSync(
    list,
    `file '${wave.replace(/'/g, "'\\''")}'\nfile '${card.replace(/'/g, "'\\''")}'\n`,
  );
  ffmpeg([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    list,
    "-an",
    ...X264_QUALITY,
    "-pix_fmt",
    "yuv420p",
    "-t",
    String(seconds),
    outputPath,
  ]);
}

function assembleMaster(
  clips: string[],
  narrationPath: string,
  musicPath: string,
  outputPath: string,
): void {
  const listPath = join(dirname(outputPath), "concat.txt");
  writeFileSync(
    listPath,
    clips.map((c) => `file '${c.replace(/'/g, "'\\''")}'`).join("\n") + "\n",
  );
  ffmpeg([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-i",
    narrationPath,
    "-i",
    musicPath,
    "-filter_complex",
    `[1:a]aresample=48000,apad=whole_dur=${TARGET},atrim=0:${TARGET},volume=1.15[narr];[2:a]aresample=48000,apad=whole_dur=${TARGET},atrim=0:${TARGET},volume=0.22[music];[narr][music]amix=inputs=2:duration=first:dropout_transition=0,alimiter=limit=0.95[aout]`,
    "-map",
    "0:v",
    "-map",
    "[aout]",
    "-t",
    String(TARGET),
    ...X264_QUALITY,
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    outputPath,
  ]);
}

function goldenToContentPackage(script: GoldenScript): ContentPackage {
  const category = (script.category || "Learning") as TopicCategory;
  const base =
    getTopicById("learning-habits") ??
    ({
      id: "learning-habits",
      title: script.topic,
      category: "Parenting" as TopicCategory,
      difficulty: "beginner" as const,
      ageGroup: "all" as const,
      keywords: ["amynest", "parenting"],
      cta: "Download AmyNest AI",
      priority: 10,
      estimatedDuration: TARGET,
      videoStyle: "short" as const,
    } satisfies Topic);

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

  const hookLine = /parent|today|lesson|child|habit/i.test(hook)
    ? hook.slice(0, 56)
    : "Parents feel the worksheet panic today";

  return {
    topic: {
      ...base,
      id: `kie-prod-${script.id}`,
      title: script.topic,
      category,
      keywords: [...base.keywords, script.featureName.toLowerCase(), "amynest"],
      cta: "Download AmyNest AI",
      estimatedDuration: TARGET,
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
    openingQuestion: "What if daily lessons felt lighter today?",
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
    captions: [
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
        end: TARGET,
        text: "Download AmyNest AI",
        style: "cta" as const,
        position: "bottom" as const,
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
      "KidsLearning",
      "StudyHabits",
      "Shorts",
      "AmyNestAI",
    ],
    keywords: [script.topic, script.featureName, "AmyNest", "Study Zone"],
    seoScore: Math.min(95, Math.round(script.quality.ctrPrediction)),
    readingTime: Math.round(voiceScript.split(/\s+/).length / 2.5),
    estimatedDuration: TARGET,
    language: "en-IN",
    provider: "golden-script",
    generatedAt: new Date().toISOString(),
    version: CONTENT_PACKAGE_VERSION,
  };
}

function toRenderPackage(videoPath: string, outputDirectory: string): RenderPackage {
  const checksum = createHash("sha256")
    .update(videoPath + String(TARGET) + "kie")
    .digest("hex")
    .slice(0, 24);
  return {
    id: `rp_kie_prod_${checksum}`,
    version: RENDER_PACKAGE_VERSION,
    createdAt: new Date().toISOString(),
    storyboardId: "sb_kie_prod_golden_001",
    assetPackageId: "ap_kie_prod",
    videoPath,
    duration: TARGET,
    resolution: { width: 1080, height: 1920 },
    fps: 30,
    codec: "h264",
    audioCodec: "aac",
    container: "mp4",
    checksum,
    renderMetadata: {
      jobId: `job_kie_prod_${checksum}`,
      storyboardId: "sb_kie_prod_golden_001",
      assetPackageId: "ap_kie_prod",
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
      frames: TARGET * 30,
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

function writeReport(state: RunState): void {
  ensureDir(dirname(REPORT_PATH));
  const totalMs =
    state.generationDurationMs +
    state.renderingDurationMs +
    state.uploadDurationMs +
    state.timeline
      .filter((t) => !["kie-generate", "mux-master", "youtube-upload"].includes(t.name))
      .reduce((a, t) => a + t.durationMs, 0);
  const ok = state.status === "SUCCESS";
  const md = [
    "# KIE_PRODUCTION_RUN",
    "",
    `**Status:** ${state.status}`,
    `**Generated:** ${state.generatedAt}`,
    `**Provider used:** ${state.provider} (\`${state.model}\`)`,
    `**Golden Script:** \`${state.goldenScriptId}\` — ${state.goldenTitle}`,
    "",
    ok
      ? "## SUCCESS — KIE Short uploaded UNLISTED"
      : "## FAILED — production stopped (no upload)",
    "",
    "## Summary",
    "",
    "| Field | Value |",
    "|---|---|",
    `| Provider | ${state.provider} |`,
    `| Model | \`${state.model}\` |`,
    `| Launch score / cert | ${state.launchScore} / ${state.certification || "n/a"} |`,
    `| Quality report | ${state.qualityReportPath || "n/a"} |`,
    `| Credits before | ${state.creditsBefore ?? "n/a"} |`,
    `| Credits after | ${state.creditsAfter ?? "n/a"} |`,
    `| Credits consumed | ${state.creditsConsumed ?? "n/a"} |`,
    `| Actual billed cost | ${state.actualBilledUsd != null ? `$${state.actualBilledUsd.toFixed(4)}` : "n/a"} |`,
    `| Generation duration | ${state.generationDurationMs} ms |`,
    `| Rendering duration | ${state.renderingDurationMs} ms |`,
    `| Upload duration | ${state.uploadDurationMs} ms |`,
    `| Total production time | ${totalMs} ms |`,
    `| Local MP4 | ${state.videoPath || "n/a"} |`,
    `| Upload status | ${state.uploadStatus} |`,
    `| Video ID | ${state.videoId || "n/a"} |`,
    `| Final YouTube URL | ${state.videoUrl || "n/a"} |`,
    `| Reused bakeoff raws | ${state.reusedRaws ? "yes" : "no"} |`,
    `| Quality mode | ${state.qualityMode} |`,
    `| Generation resolution | ${state.generationResolution} |`,
    `| FPS | ${state.fps} |`,
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
  ];
  if (!ok) {
    md.push(
      "## Failure",
      "",
      `- Stopped at: \`${state.stoppedAt}\``,
      `- Root cause: ${state.rootCause}`,
      `- Errors:`,
      ...state.errors.map((e) => `  - ${e}`),
      "",
    );
  }
  if (state.warnings.length) {
    md.push("## Warnings", "", ...state.warnings.map((w) => `- ${w}`), "");
  }
  md.push(
    "## Isolation notes",
    "",
    "- Production pipeline / validators / rendering / publishing code: **unchanged**",
    `- Media provider override for this run only: **KIE.ai ${state.model} @ ${state.generationResolution}**`,
    "- Assets reused: golden-001 keyframes, captions, CTA plate, narration, music",
    "- Quality boost: native resolution + motion/cinema prompt boost + CRF16 encode (KIE runner only)",
    "",
  );
  writeFileSync(REPORT_PATH, md.join("\n"));
  writeJson(join(OUT, "run-state.json"), state);
}

export async function runKieProduction(): Promise<RunState> {
  const state: RunState = {
    status: "FAILED",
    generatedAt: new Date().toISOString(),
    provider: "kie.ai",
    model: "veo3_fast",
    goldenScriptId: GOLDEN_ID,
    goldenTitle: "",
    errors: [],
    warnings: [],
    timeline: [],
    creditsBefore: null,
    creditsAfter: null,
    creditsConsumed: null,
    actualBilledUsd: null,
    generationDurationMs: 0,
    renderingDurationMs: 0,
    uploadDurationMs: 0,
    videoPath: "",
    videoId: "",
    videoUrl: "",
    uploadStatus: "not attempted",
    launchScore: 0,
    certification: "",
    qualityReportPath: "",
    reusedRaws: false,
    qualityMode: "",
    generationResolution: "1080p",
    fps: 30,
  };

  loadAmyNestEnvFiles(REPO_ROOT);
  loadAmyNestEnvFiles(process.cwd());
  process.env.AMYNEST_PUBLISHING_PROVIDER = "youtube";

  const mediaQuality = resolveKieMediaQuality();
  state.model = mediaQuality.model;
  state.qualityMode = mediaQuality.label;
  state.generationResolution = mediaQuality.resolution;
  state.fps = 30;

  ensureDir(OUT);
  const work = join(OUT, "work");
  const veoDir = join(work, "veo");
  ensureDir(veoDir);

  const key = (process.env.KIE_API_KEY || "").trim();
  if (!key) {
    return fail(state, "preflight", "KIE_API_KEY missing", "Cannot call KIE without API key.");
  }

  try {
    const t0 = Date.now();
    await resolveYouTubeAccessToken({ env: process.env, persistToEnv: true });
    step(state, "youtube-oauth", t0, true, "token ready");
  } catch (e) {
    return fail(
      state,
      "preflight",
      e instanceof Error ? e.message : String(e),
      "YouTube OAuth failed — cannot upload even if render passes.",
    );
  }

  const script = buildGoldenScript(allGoldenSeeds()[0]!, 1);
  if (script.id !== GOLDEN_ID) {
    return fail(state, "golden-script", `Expected ${GOLDEN_ID}`, "Wrong golden script.");
  }
  state.goldenTitle = script.title;
  const content = goldenToContentPackage(script);
  writeJson(join(OUT, "content-package.json"), content);
  step(state, "golden-script", Date.now(), true, `${GOLDEN_ID} — ${script.title}`);

  const creditsBefore = await kieCredits(key);
  state.creditsBefore = creditsBefore;
  const creditsNeeded = mediaQuality.creditsPerShot * SHOTS.length;
  if (!Number.isFinite(creditsBefore) || creditsBefore < creditsNeeded) {
    return fail(
      state,
      "preflight",
      `Insufficient KIE credits: ${creditsBefore} (need ~${creditsNeeded} for ${mediaQuality.label})`,
      `Top up KIE before quality production run (~$${((creditsNeeded - Math.max(0, creditsBefore)) * KIE_CREDIT_USD).toFixed(2)} more at $0.005/credit).`,
    );
  }

  const reuse =
    process.env.AMYNEST_KIE_REUSE_RAWS === "1" &&
    SHOTS.every((s) => existsSync(join(BAKEOFF_RAW, `${s.id}-raw.mp4`)));
  state.reusedRaws = reuse;

  const clips: string[] = [];
  const genStart = Date.now();
  try {
    for (const shot of SHOTS) {
      const rawPath = join(veoDir, `${shot.id}-raw.mp4`);
      const outClip = join(work, `${shot.id}.mp4`);
      const caption = join(PROD_WORK, `${shot.id}-caption.png`);
      const keyframe = join(PROD_WORK, "keyframes", `${shot.id}-identity.png`);
      if (!existsSync(caption) || !existsSync(keyframe)) {
        throw new Error(`Missing production asset for ${shot.id}`);
      }

      if (reuse) {
        copyFileSync(join(BAKEOFF_RAW, `${shot.id}-raw.mp4`), rawPath);
      } else {
        const { prompt } = performancePrompt(shot);
        const boosted = boostKiePrompt(prompt, shot);
        const imageUrl = await kieUpload(key, keyframe, `prod-${shot.id}.png`);
        const videoUrl = await kieGenerate(key, shot, imageUrl, boosted, {
          model: mediaQuality.model,
          resolution: mediaQuality.resolution,
        });
        await download(videoUrl, rawPath);
      }

      if (shot.kind === "cta-overlay") {
        burnCta(
          rawPath,
          join(PROD_WORK, "cta-premium-plate.png"),
          caption,
          outClip,
          work,
          shot.durationSeconds,
        );
      } else {
        burnCaption(rawPath, caption, outClip, shot.durationSeconds);
      }
      clips.push(outClip);
    }
    state.generationDurationMs = Date.now() - genStart;
    step(
      state,
      "kie-generate",
      genStart,
      true,
      reuse
        ? `Reused 5 KIE bakeoff raws + caption/CTA burn`
        : `Generated 5 KIE ${mediaQuality.label} performances`,
    );
  } catch (e) {
    state.generationDurationMs = Date.now() - genStart;
    const msg = e instanceof Error ? e.message : String(e);
    step(state, "kie-generate", genStart, false, msg);
    const after = await kieCredits(key).catch(() => NaN);
    state.creditsAfter = after;
    if (Number.isFinite(creditsBefore) && Number.isFinite(after)) {
      state.creditsConsumed = creditsBefore - after;
      state.actualBilledUsd = Number(
        ((creditsBefore - after) * KIE_CREDIT_USD).toFixed(4),
      );
    }
    return fail(state, "kie-generate", msg, "KIE media generation failed — STOP.");
  }

  const master = join(OUT, MASTER_NAME);
  try {
    const t0 = Date.now();
    assembleMaster(
      clips,
      join(PROD, "audio/narration.wav"),
      join(PROD, "audio/music.wav"),
      master,
    );
    state.renderingDurationMs = Date.now() - t0;
    state.videoPath = master;
    step(state, "mux-master", t0, true, master);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return fail(state, "mux-master", msg, "Final mux failed — STOP.");
  }

  const creditsAfterGen = await kieCredits(key);
  state.creditsAfter = creditsAfterGen;
  state.creditsConsumed = creditsBefore - creditsAfterGen;
  state.actualBilledUsd = Number(
    ((creditsBefore - creditsAfterGen) * KIE_CREDIT_USD).toFixed(4),
  );

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
    const renderPackage = toRenderPackage(master, OUT);
    launch = validateLaunch({
      content,
      render: renderPackage,
      metadata,
      thumbnail,
      schedule,
      evidenceWorkDir: join(OUT, "evidence"),
    });
    writeLaunchValidationReport({ report: launch, outputDirectory: OUT });
    state.launchScore = launch.scores.overall;
    state.certification = launch.certification.certification;
    state.qualityReportPath = launch.qualityReportPath ?? "";
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
      return fail(
        state,
        "launch-validator",
        launch.reasons.slice(0, 8).join(" | ") ||
          launch.certification.blockedReasons.join(" | "),
        "Artifact / Launch / Quality evidence did not PASS — upload forbidden.",
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return fail(state, "launch-validator", msg, "Launch validator threw — STOP.");
  }

  try {
    const t0 = Date.now();
    const publisher = new PublishingOrchestrator({ config });
    const result = await publisher.publish({
      content,
      render: toRenderPackage(master, OUT),
      overrides: { visibility: "unlisted" },
    });
    state.uploadDurationMs = Date.now() - t0;
    state.videoId = result.video.videoId;
    state.videoUrl = result.video.url;
    state.uploadStatus = `uploaded ${result.video.visibility}`;
    step(state, "youtube-upload", t0, true, state.videoUrl);

    try {
      new ContinuousLearningEngine().ingest({
        videos: [result.video],
        contentByVideoId: { [result.video.videoId]: content },
        goldenScriptIdByVideoId: { [result.video.videoId]: GOLDEN_ID },
        campaignByVideoId: { [result.video.videoId]: "kie-production" },
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
    return fail(
      state,
      "youtube-upload",
      msg,
      "Upload failed after certification PASS.",
    );
  }

  const creditsFinal = await kieCredits(key).catch(() => creditsAfterGen);
  state.creditsAfter = creditsFinal;
  state.creditsConsumed = creditsBefore - creditsFinal;
  state.actualBilledUsd = Number(
    ((creditsBefore - creditsFinal) * KIE_CREDIT_USD).toFixed(4),
  );

  state.status = "SUCCESS";
  writeReport(state);
  return state;
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  runKieProduction()
    .then((state) => {
      console.log(`\nKIE_PRODUCTION_RUN → ${state.status}`);
      console.log(`Report: ${REPORT_PATH}`);
      if (state.videoUrl) console.log(`URL: ${state.videoUrl}`);
      if (state.rootCause) console.error(state.rootCause);
      process.exit(state.status === "SUCCESS" ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

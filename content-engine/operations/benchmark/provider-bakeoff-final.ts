/**
 * ISOLATED PRODUCTION PROVIDER BAKE-OFF (FINAL)
 *
 * Does NOT modify production pipeline, defaults, rendering code, validators, or publishing.
 * Reuses golden-001 assets (keyframes, captions, CTA plate, narration, music).
 * Only variable: remote Veo Fast media provider (kie | youbot).
 * Google baseline = existing second-production master (same golden script / workflow).
 *
 * Run:
 *   pnpm exec node --import tsx/esm ./operations/benchmark/provider-bakeoff-final.ts
 *   PROVIDER=kie|youbot|google|all ...
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
import { loadDefaultConfig } from "../../config/index.js";
import { allGoldenSeeds } from "../../golden-scripts/seeds.js";
import { buildGoldenScript } from "../../golden-scripts/build.js";
import type { GoldenScript } from "../../golden-scripts/types.js";
import { validateLaunch } from "../../launch-validator/validate.js";
import { writeLaunchValidationReport } from "../../launch-validator/report.js";
import {
  buildPublishMetadata,
  resolveThumbnail,
} from "../../publishing/metadata/index.js";
import { buildSchedulePlan } from "../../publishing/scheduler/index.js";
import { getTopicById } from "../../topics/index.js";
import type { ContentPackage } from "../../types/content-package.js";
import { CONTENT_PACKAGE_VERSION } from "../../types/content-package.js";
import type { Topic, TopicCategory } from "../../types/index.js";
import type { RenderPackage } from "../../types/render-package.js";
import { RENDER_PACKAGE_VERSION } from "../../types/render-package.js";
import { loadAmyNestEnvFiles } from "../env/load-env.js";
import { performancePrompt } from "../../creative-composition/performances.js";
import type { CompositionShotPlan } from "../../creative-composition/types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "../../..");
const PROD = join(REPO_ROOT, ".amynest-assets/second-production");
const PROD_WORK = join(PROD, "work/cinematic");
const OUT_ROOT = join(REPO_ROOT, ".amynest-assets/provider-bakeoff-final");
const DOCS = join(HERE, "../../docs/operations/benchmark");
const GOLDEN_ID = "golden-001";
const TARGET = 21;

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
    notes: "bakeoff",
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
    notes: "bakeoff",
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
    notes: "bakeoff",
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
    notes: "bakeoff",
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
    notes: "bakeoff",
  },
];

function env(name: string): string {
  return (process.env[name] || "").trim();
}

function ensureDir(p: string): void {
  mkdirSync(p, { recursive: true });
}

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

function ffmpeg(args: string[]): void {
  execFileSync("ffmpeg", ["-y", ...args], {
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 32 * 1024 * 1024,
  });
}

function probeDuration(path: string): number {
  return Number(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
      { encoding: "utf8" },
    ).trim(),
  );
}

function probeWxH(path: string): { width: number; height: number } {
  const raw = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height",
      "-of",
      "csv=p=0",
      path,
    ],
    { encoding: "utf8" },
  ).trim();
  const [w, h] = raw.split(",").map(Number);
  return { width: w || 0, height: h || 0 };
}

function hasAudio(path: string): boolean {
  try {
    const out = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-select_streams",
        "a",
        "-show_entries",
        "stream=codec_type",
        "-of",
        "csv=p=0",
        path,
      ],
      { encoding: "utf8" },
    ).trim();
    return out.includes("audio");
  } catch {
    return false;
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function httpJson(
  url: string,
  options: {
    method?: string;
    key: string;
    body?: unknown;
    formData?: FormData;
  },
): Promise<{ ok: boolean; status: number; json: any; text: string }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.key}`,
    Accept: "application/json",
    "User-Agent": "AmyNestBakeoffFinal/1.0",
  };
  let body: string | FormData | undefined;
  if (options.formData) body = options.formData;
  else if (options.body !== undefined) {
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
  return { ok: res.ok, status: res.status, json, text };
}

async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url, {
    headers: { "User-Agent": "AmyNestBakeoffFinal/1.0" },
  });
  if (!res.ok) throw new Error(`download ${res.status} ${url}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

function loadGolden001(): GoldenScript {
  const script = buildGoldenScript(allGoldenSeeds()[0]!, 1);
  if (script.id !== GOLDEN_ID) throw new Error(`Expected ${GOLDEN_ID}`);
  return script;
}

function goldenToContentPackage(script: GoldenScript): ContentPackage {
  const category = (script.category || "Learning") as TopicCategory;
  const base =
    getTopicById("learning-habits") ??
    getTopicById("speech-001") ??
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
      end: TARGET,
      text: "Download AmyNest AI",
      style: "cta" as const,
      position: "bottom" as const,
    },
  ];

  return {
    topic: {
      ...base,
      id: `bakeoff-${script.id}`,
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
    estimatedDuration: TARGET,
    language: "en-IN",
    provider: "golden-script",
    generatedAt: new Date().toISOString(),
    version: CONTENT_PACKAGE_VERSION,
  };
}

function toRenderPackage(videoPath: string, outputDirectory: string): RenderPackage {
  const checksum = createHash("sha256")
    .update(videoPath + String(TARGET))
    .digest("hex")
    .slice(0, 24);
  return {
    id: `rp_bakeoff_${checksum}`,
    version: RENDER_PACKAGE_VERSION,
    createdAt: new Date().toISOString(),
    storyboardId: "sb_bakeoff_golden_001",
    assetPackageId: "ap_bakeoff",
    videoPath,
    duration: TARGET,
    resolution: { width: 1080, height: 1920 },
    fps: 30,
    codec: "h264",
    audioCodec: "aac",
    container: "mp4",
    checksum,
    renderMetadata: {
      jobId: `job_bakeoff_${checksum}`,
      storyboardId: "sb_bakeoff_golden_001",
      assetPackageId: "ap_bakeoff",
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

function burnCaption(videoPath: string, captionPng: string, outputPath: string, seconds: number): void {
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
    "-c:v",
    "libx264",
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
    "-c:v",
    "libx264",
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
    "-c:v",
    "libx264",
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
    "-c:v",
    "libx264",
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
    outputPath,
  ]);
}

async function kieCredits(key: string): Promise<number> {
  const r = await httpJson("https://api.kie.ai/api/v1/chat/credit", { key });
  return Number(r.json?.data ?? NaN);
}

async function youbotCredits(key: string): Promise<number> {
  const r = await httpJson("https://you.bot/api/v1/credits", { key });
  return Number(r.json?.credits ?? NaN);
}

async function kieUpload(key: string, filePath: string, fileName: string): Promise<string> {
  const b64 = readFileSync(filePath).toString("base64");
  const r = await httpJson("https://kieai.redpandaai.co/api/file-base64-upload", {
    method: "POST",
    key,
    body: {
      base64Data: `data:image/png;base64,${b64}`,
      uploadPath: "amynest-bakeoff-final",
      fileName,
    },
  });
  const url = r.json?.data?.downloadUrl || r.json?.data?.fileUrl || r.json?.downloadUrl;
  if (!url) throw new Error(`KIE upload failed: ${JSON.stringify(r.json).slice(0, 400)}`);
  return url;
}

async function youbotUpload(key: string, filePath: string): Promise<string> {
  const form = new FormData();
  form.append(
    "file",
    new Blob([readFileSync(filePath)], { type: "image/png" }),
    filePath.split("/").pop()!,
  );
  const r = await httpJson("https://you.bot/api/v1/files/upload", {
    method: "POST",
    key,
    formData: form,
  });
  const url = r.json?.url || r.json?.fileUrl || r.json?.data?.url || r.json?.result?.url;
  if (!url) throw new Error(`you.bot upload failed: ${JSON.stringify(r.json).slice(0, 400)}`);
  return url;
}

async function kieGenerate(
  key: string,
  shot: (typeof SHOTS)[number],
  imageUrl: string,
  prompt: string,
): Promise<{
  ok: boolean;
  taskId?: string;
  videoUrl?: string;
  elapsedMs: number;
  queueMs?: number;
  create: any;
  poll?: any;
  error?: string;
}> {
  const t0 = Date.now();
  const create = await httpJson("https://api.kie.ai/api/v1/veo/generate", {
    method: "POST",
    key,
    body: {
      prompt,
      imageUrls: [imageUrl],
      model: "veo3_fast",
      generationType: "FIRST_AND_LAST_FRAMES_2_VIDEO",
      aspect_ratio: "9:16",
      resolution: "720p",
      duration: shot.durationSeconds,
      enableTranslation: false,
    },
  });
  const taskId = create.json?.data?.taskId;
  if (!create.ok || !taskId) {
    return {
      ok: false,
      elapsedMs: Date.now() - t0,
      create,
      error: JSON.stringify(create.json).slice(0, 500),
    };
  }
  const acceptedAt = Date.now();
  let poll;
  for (let i = 0; i < 120; i++) {
    await sleep(8000);
    poll = await httpJson(
      `https://api.kie.ai/api/v1/veo/record-info?taskId=${encodeURIComponent(taskId)}`,
      { key },
    );
    const flag = poll.json?.data?.successFlag;
    if (flag === 1) {
      const urls = poll.json?.data?.response?.resultUrls || [];
      return {
        ok: Boolean(urls[0]),
        taskId,
        videoUrl: urls[0],
        elapsedMs: Date.now() - t0,
        queueMs: acceptedAt - t0,
        create,
        poll,
      };
    }
    if (flag === 2 || flag === 3) {
      return {
        ok: false,
        taskId,
        elapsedMs: Date.now() - t0,
        queueMs: acceptedAt - t0,
        create,
        poll,
        error: poll.json?.data?.errorMessage || "generation failed",
      };
    }
  }
  return {
    ok: false,
    taskId,
    elapsedMs: Date.now() - t0,
    create,
    poll,
    error: "timeout",
  };
}

async function youbotGenerate(
  key: string,
  shot: (typeof SHOTS)[number],
  imageUrl: string,
  prompt: string,
): Promise<{
  ok: boolean;
  taskId?: string;
  videoUrl?: string;
  elapsedMs: number;
  queueMs?: number;
  creditsCharged?: number;
  create: any;
  poll?: any;
  error?: string;
}> {
  const t0 = Date.now();
  const create = await httpJson("https://you.bot/api/v1/generate", {
    method: "POST",
    key,
    body: {
      modelId: "veo-3-1-fast",
      input: {
        prompt,
        imageUrls: [imageUrl],
        aspectRatio: "9:16",
        resolution: "720p",
        duration: `${shot.durationSeconds}s`,
      },
    },
  });
  const taskId = create.json?.taskId;
  const creditsCharged = create.json?.creditsCharged;
  if (!create.ok || !taskId) {
    return {
      ok: false,
      elapsedMs: Date.now() - t0,
      creditsCharged,
      create,
      error: JSON.stringify(create.json).slice(0, 500),
    };
  }
  const acceptedAt = Date.now();
  let poll;
  for (let i = 0; i < 120; i++) {
    await sleep(8000);
    poll = await httpJson(
      `https://you.bot/api/v1/task/${encodeURIComponent(taskId)}?model=veo-3-1-fast`,
      { key },
    );
    const status = String(
      poll.json?.status || poll.json?.state || poll.json?.data?.status || "",
    ).toLowerCase();
    const urls =
      poll.json?.resultUrls ||
      poll.json?.output?.urls ||
      poll.json?.result?.urls ||
      poll.json?.data?.resultUrls ||
      [];
    const videoUrl =
      (Array.isArray(urls) && urls[0]) ||
      poll.json?.url ||
      poll.json?.result?.url ||
      poll.json?.output?.url;
    if (videoUrl || ["succeeded", "success", "completed", "done"].includes(status)) {
      return {
        ok: Boolean(videoUrl),
        taskId,
        videoUrl,
        elapsedMs: Date.now() - t0,
        queueMs: acceptedAt - t0,
        creditsCharged,
        create,
        poll,
      };
    }
    if (["failed", "error", "cancelled"].includes(status)) {
      return {
        ok: false,
        taskId,
        elapsedMs: Date.now() - t0,
        queueMs: acceptedAt - t0,
        creditsCharged,
        create,
        poll,
        error: poll.json?.error || poll.json?.message || status,
      };
    }
  }
  return {
    ok: false,
    taskId,
    elapsedMs: Date.now() - t0,
    creditsCharged,
    create,
    poll,
    error: "timeout",
  };
}

async function runValidator(content: ContentPackage, videoPath: string, outDir: string) {
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
  const metadata = buildPublishMetadata(content, config);
  const thumbnail = resolveThumbnail({
    brandingDefaultPath: "brand://amynest-default-thumb.jpg",
  });
  const schedule = buildSchedulePlan({
    policy: config.schedulePolicy,
    visibility: "unlisted",
    uploadTime: "09:00",
  });
  const render = toRenderPackage(videoPath, outDir);
  const launch = validateLaunch({
    content,
    render,
    metadata,
    thumbnail,
    schedule,
    evidenceWorkDir: join(outDir, "evidence"),
  });
  writeLaunchValidationReport({ report: launch, outputDirectory: outDir });
  return launch;
}

type ProviderReport = Record<string, unknown>;

async function bakeKie(content: ContentPackage): Promise<ProviderReport> {
  const key = env("KIE_API_KEY");
  const dir = join(OUT_ROOT, "kie");
  const work = join(dir, "work");
  const rawDir = join(work, "veo");
  ensureDir(rawDir);
  const report: ProviderReport = {
    provider: "kie",
    model: "veo3_fast",
    startedAt: new Date().toISOString(),
    shots: [] as any[],
    retries: 0,
    failures: 0,
    successes: 0,
  };
  if (!key) {
    report.blockedReason = "KIE_API_KEY missing";
    writeJson(join(dir, "run.json"), report);
    return report;
  }

  const creditsBefore = await kieCredits(key);
  report.creditsBefore = creditsBefore;
  report.startBalance = creditsBefore;
  const clips: string[] = [];
  const genStart = Date.now();

  for (const shot of SHOTS) {
    const { prompt } = performancePrompt(shot);
    const keyframe = join(PROD_WORK, "keyframes", `${shot.id}-identity.png`);
    const caption = join(PROD_WORK, `${shot.id}-caption.png`);
    const rawPath = join(rawDir, `${shot.id}-raw.mp4`);
    const outClip = join(work, `${shot.id}.mp4`);
    let attempt = 0;
    let gen: Awaited<ReturnType<typeof kieGenerate>> | null = null;
    while (attempt < 2) {
      attempt += 1;
      try {
        const url = await kieUpload(key, keyframe, `kie-${shot.id}.png`);
        gen = await kieGenerate(key, shot, url, prompt);
        if (gen.ok && gen.videoUrl) break;
        report.retries = Number(report.retries) + (attempt < 2 ? 1 : 0);
      } catch (e) {
        gen = {
          ok: false,
          elapsedMs: 0,
          create: {},
          error: e instanceof Error ? e.message : String(e),
        };
        report.retries = Number(report.retries) + (attempt < 2 ? 1 : 0);
      }
    }
    if (!gen?.ok || !gen.videoUrl) {
      report.failures = Number(report.failures) + 1;
      (report.shots as any[]).push({
        id: shot.id,
        ok: false,
        error: gen?.error,
        create: gen?.create,
        poll: gen?.poll,
      });
      writeJson(join(dir, "run.json"), report);
      throw new Error(`KIE shot failed: ${shot.id} — ${gen?.error}`);
    }
    await download(gen.videoUrl, rawPath);
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
    report.successes = Number(report.successes) + 1;
    (report.shots as any[]).push({
      id: shot.id,
      ok: true,
      taskId: gen.taskId,
      elapsedMs: gen.elapsedMs,
      queueMs: gen.queueMs,
      videoUrl: gen.videoUrl,
      localRaw: rawPath,
      localClip: outClip,
      duration: probeDuration(rawPath),
    });
    writeJson(join(dir, "run.json"), report);
  }

  report.generationDurationMs = Date.now() - genStart;
  const master = join(dir, "amynest-bakeoff-kie-golden-001.mp4");
  assembleMaster(
    clips,
    join(PROD, "audio/narration.wav"),
    join(PROD, "audio/music.wav"),
    master,
  );
  const creditsAfter = await kieCredits(key);
  report.creditsAfter = creditsAfter;
  report.endBalance = creditsAfter;
  report.creditsConsumed = creditsBefore - creditsAfter;
  report.realBilledUsd = Number((((creditsBefore - creditsAfter) * 0.005)).toFixed(4));
  report.creditUsdRate = 0.005;
  report.masterPath = master;
  report.videoDurationSec = probeDuration(master);
  report.outputResolution = probeWxH(master);
  report.audioPresent = hasAudio(master);
  report.subtitlePresent = true; // burned-in captions reused from production

  const launch = await runValidator(content, master, dir);
  report.launch = {
    ok: launch.ok,
    certification: launch.certification.certification,
    score: launch.scores.overall,
    blockedReasons: launch.certification.blockedReasons,
    qualityReportPath: launch.qualityReportPath,
    gates: launch.certification.gates.map((g) => ({
      id: g.id,
      status: g.status,
      failureReason: g.failureReason,
    })),
  };
  report.finishedAt = new Date().toISOString();
  writeJson(join(dir, "run.json"), report);
  return report;
}

async function bakeYoubot(content: ContentPackage): Promise<ProviderReport> {
  const key = env("YOUBOT_API_KEY");
  const dir = join(OUT_ROOT, "youbot");
  const work = join(dir, "work");
  const rawDir = join(work, "veo");
  ensureDir(rawDir);
  const report: ProviderReport = {
    provider: "youbot",
    model: "veo-3-1-fast",
    startedAt: new Date().toISOString(),
    shots: [] as any[],
    retries: 0,
    failures: 0,
    successes: 0,
    creditsChargedSum: 0,
  };
  if (!key) {
    report.blockedReason = "YOUBOT_API_KEY missing";
    writeJson(join(dir, "run.json"), report);
    return report;
  }

  const creditsBefore = await youbotCredits(key);
  report.creditsBefore = creditsBefore;
  report.startBalance = creditsBefore;
  const clips: string[] = [];
  const genStart = Date.now();

  for (const shot of SHOTS) {
    const { prompt } = performancePrompt(shot);
    const keyframe = join(PROD_WORK, "keyframes", `${shot.id}-identity.png`);
    const caption = join(PROD_WORK, `${shot.id}-caption.png`);
    const rawPath = join(rawDir, `${shot.id}-raw.mp4`);
    const outClip = join(work, `${shot.id}.mp4`);
    let attempt = 0;
    let gen: Awaited<ReturnType<typeof youbotGenerate>> | null = null;
    while (attempt < 2) {
      attempt += 1;
      try {
        const url = await youbotUpload(key, keyframe);
        gen = await youbotGenerate(key, shot, url, prompt);
        if (gen.ok && gen.videoUrl) break;
        report.retries = Number(report.retries) + (attempt < 2 ? 1 : 0);
      } catch (e) {
        gen = {
          ok: false,
          elapsedMs: 0,
          create: {},
          error: e instanceof Error ? e.message : String(e),
        };
        report.retries = Number(report.retries) + (attempt < 2 ? 1 : 0);
      }
    }
    if (!gen?.ok || !gen.videoUrl) {
      report.failures = Number(report.failures) + 1;
      (report.shots as any[]).push({
        id: shot.id,
        ok: false,
        error: gen?.error,
        creditsCharged: gen?.creditsCharged,
        create: gen?.create,
        poll: gen?.poll,
      });
      writeJson(join(dir, "run.json"), report);
      throw new Error(`you.bot shot failed: ${shot.id} — ${gen?.error}`);
    }
    await download(gen.videoUrl, rawPath);
    if (typeof gen.creditsCharged === "number") {
      report.creditsChargedSum =
        Number(report.creditsChargedSum) + gen.creditsCharged;
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
    report.successes = Number(report.successes) + 1;
    (report.shots as any[]).push({
      id: shot.id,
      ok: true,
      taskId: gen.taskId,
      elapsedMs: gen.elapsedMs,
      queueMs: gen.queueMs,
      creditsCharged: gen.creditsCharged ?? null,
      videoUrl: gen.videoUrl,
      localRaw: rawPath,
      localClip: outClip,
      duration: probeDuration(rawPath),
    });
    writeJson(join(dir, "run.json"), report);
  }

  report.generationDurationMs = Date.now() - genStart;
  const master = join(dir, "amynest-bakeoff-youbot-golden-001.mp4");
  assembleMaster(
    clips,
    join(PROD, "audio/narration.wav"),
    join(PROD, "audio/music.wav"),
    master,
  );
  const creditsAfter = await youbotCredits(key);
  report.creditsAfter = creditsAfter;
  report.endBalance = creditsAfter;
  report.creditsConsumed = creditsBefore - creditsAfter;
  report.realBilledUsd = Number((((creditsBefore - creditsAfter) * 0.01)).toFixed(4));
  report.creditUsdRate = 0.01;
  report.masterPath = master;
  report.videoDurationSec = probeDuration(master);
  report.outputResolution = probeWxH(master);
  report.audioPresent = hasAudio(master);
  report.subtitlePresent = true;

  const launch = await runValidator(content, master, dir);
  report.launch = {
    ok: launch.ok,
    certification: launch.certification.certification,
    score: launch.scores.overall,
    blockedReasons: launch.certification.blockedReasons,
    qualityReportPath: launch.qualityReportPath,
    gates: launch.certification.gates.map((g) => ({
      id: g.id,
      status: g.status,
      failureReason: g.failureReason,
    })),
  };
  report.finishedAt = new Date().toISOString();
  writeJson(join(dir, "run.json"), report);
  return report;
}

async function bakeGoogleBaseline(content: ContentPackage): Promise<ProviderReport> {
  const dir = join(OUT_ROOT, "google");
  ensureDir(dir);
  const src = join(PROD, "amynest-second-production-golden-001.mp4");
  const master = join(dir, "amynest-bakeoff-google-golden-001.mp4");
  copyFileSync(src, master);
  // Copy prior quality report if present for reference
  if (existsSync(join(PROD, "QUALITY_REPORT.json"))) {
    copyFileSync(join(PROD, "QUALITY_REPORT.json"), join(dir, "PRIOR_QUALITY_REPORT.json"));
  }
  const report: ProviderReport = {
    provider: "google",
    model: "veo-3.1-fast-generate-preview",
    startedAt: new Date().toISOString(),
    notes: [
      "Baseline = existing second-production golden-001 Short (same golden script / assets / workflow).",
      "No new Google Veo spend in this bake-off (avoids regenerating paid media for an unchanged baseline).",
      "Google AI Studio does not expose a credit-balance API via GEMINI_API_KEY — billed USD still requires Cloud Billing export.",
    ],
    creditsBefore: null,
    creditsAfter: null,
    creditsConsumed: null,
    realBilledUsd: null,
    billedUsdAvailable: false,
    generationDurationMs: null,
    retries: 0,
    failures: 0,
    successes: 5,
    masterPath: master,
    videoDurationSec: probeDuration(master),
    outputResolution: probeWxH(master),
    audioPresent: hasAudio(master),
    subtitlePresent: true,
    sourcePath: src,
  };
  const launch = await runValidator(content, master, dir);
  report.launch = {
    ok: launch.ok,
    certification: launch.certification.certification,
    score: launch.scores.overall,
    blockedReasons: launch.certification.blockedReasons,
    qualityReportPath: launch.qualityReportPath,
    gates: launch.certification.gates.map((g) => ({
      id: g.id,
      status: g.status,
      failureReason: g.failureReason,
    })),
  };
  report.finishedAt = new Date().toISOString();
  writeJson(join(dir, "run.json"), report);
  return report;
}

async function main(): Promise<void> {
  loadAmyNestEnvFiles(REPO_ROOT);
  ensureDir(OUT_ROOT);
  ensureDir(DOCS);
  const which = (process.env.PROVIDER || "all").toLowerCase();
  const script = loadGolden001();
  const content = goldenToContentPackage(script);
  writeJson(join(OUT_ROOT, "content-package.json"), content);

  const summary: Record<string, unknown> = {
    isolated: true,
    productionUntouched: true,
    goldenScriptId: GOLDEN_ID,
    startedAt: new Date().toISOString(),
    providers: {} as Record<string, unknown>,
  };

  if (which === "google" || which === "all") {
    console.log("[bakeoff] Google baseline validate…");
    (summary.providers as any).google = await bakeGoogleBaseline(content);
  }
  if (which === "kie" || which === "all") {
    console.log("[bakeoff] KIE full Short…");
    (summary.providers as any).kie = await bakeKie(content);
  }
  if (which === "youbot" || which === "all") {
    console.log("[bakeoff] you.bot full Short…");
    (summary.providers as any).youbot = await bakeYoubot(content);
  }

  summary.finishedAt = new Date().toISOString();
  writeJson(join(OUT_ROOT, "bakeoff-summary.json"), summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

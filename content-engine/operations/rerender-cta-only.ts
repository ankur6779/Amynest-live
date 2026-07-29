/**
 * Rebuild ONLY the final CTA clip and remux into the existing Short.
 * Does not regenerate character scenes. Validators/publishing code unchanged.
 *
 * Run: pnpm exec node --import tsx/esm ./operations/rerender-cta-only.ts
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  animatePremiumCta,
  writePremiumAdCtaPlate,
} from "../creative-composition/cta-premium.js";
import { loadDefaultConfig } from "../config/index.js";
import { allGoldenSeeds } from "../golden-scripts/seeds.js";
import { buildGoldenScript } from "../golden-scripts/build.js";
import type { GoldenScript } from "../golden-scripts/types.js";
import { validateLaunch } from "../launch-validator/validate.js";
import { writeLaunchValidationReport } from "../launch-validator/report.js";
import { resolveThumbnail } from "../publishing/metadata/index.js";
import { buildPublishMetadata } from "../publishing/metadata/index.js";
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
const REPO_ROOT = join(HERE, "..", "..");
const OUT = join(REPO_ROOT, ".amynest-assets", "second-production");
const WORK = join(OUT, "work", "cinematic");
const CTA_GUIDE = join(HERE, "..", "docs", "operations", "CTA_DESIGN_GUIDE.md");
const TARGET = 21;
const GOLDEN_ID = "golden-001";

const SCENE_CLIPS = [
  "shot-hook.mp4",
  "shot-amy-host.mp4",
  "shot-amy-girl-learn.mp4",
  "shot-amy-boy-celebrate.mp4",
] as const;

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

function loadGolden001(): GoldenScript {
  const script = buildGoldenScript(allGoldenSeeds()[0]!, 1);
  if (script.id !== GOLDEN_ID) {
    throw new Error(`Expected ${GOLDEN_ID}, got ${script.id}`);
  }
  return script;
}

function goldenToContentPackage(script: GoldenScript): ContentPackage {
  const category = (script.category || "Learning") as TopicCategory;
  const base =
    getTopicById("learning-habits") ??
    ({
      id: "learning-habits",
      title: script.topic,
      category,
      keywords: ["learning", "habits"],
      cta: "Download AmyNest AI",
      estimatedDuration: TARGET,
      videoStyle: "short",
    } as Topic);

  const hook = script.parentingSituation.slice(0, 90);
  const voiceScript = [
    script.parentingSituation,
    script.problem,
    script.emotionBeat,
    script.amynestSolution,
    script.hopeClose,
    "Download AmyNest AI today.",
  ].join(" ");

  return {
    topic: {
      ...base,
      id: `cta-rerender-${script.id}`,
      title: script.topic,
      category,
      keywords: [...base.keywords, "amynest"],
      cta: "Download AmyNest AI",
      estimatedDuration: TARGET,
      videoStyle: "short",
    },
    title: `${script.title} | AmyNest AI`,
    alternateTitles: [script.title, "Download AmyNest AI today"],
    hook,
    openingQuestion: "What if daily lessons felt lighter today?",
    story: [
      script.parentingSituation,
      script.problem,
      script.emotionBeat,
      script.amynestSolution,
      script.hopeClose,
    ].join(" "),
    keyPoints: [script.emotionBeat, script.featureDemo, script.hopeClose],
    cta: "Download AmyNest AI Today",
    voiceScript,
    sceneScript: script.storyFlow.map((b, i) => `SCENE ${i + 1} | ${b}`).join("\n"),
    captions: [
      { start: 0, end: 4, text: hook, style: "default" as const, position: "bottom" as const },
      {
        start: 4,
        end: 8,
        text: "The struggle is real — worksheets gather dust",
        style: "default" as const,
        position: "bottom" as const,
      },
      {
        start: 8,
        end: 14,
        text: "AmyNest Study Zone — a fresh lesson every day",
        style: "default" as const,
        position: "bottom" as const,
      },
      {
        start: 14,
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
      "Download AmyNest AI",
      "Available on Google Play",
      "Available on the App Store",
      "https://www.amynest.in",
    ].join("\n"),
    hashtags: ["AmyNest", "Parenting", "KidsLearning", "Shorts", "AmyNestAI"],
    keywords: [script.topic, script.featureName, "AmyNest"],
    seoScore: 90,
    readingTime: 40,
    estimatedDuration: TARGET,
    language: "en-IN",
    provider: "golden-script",
    generatedAt: new Date().toISOString(),
    version: CONTENT_PACKAGE_VERSION,
  };
}

function toRenderPackage(videoPath: string): RenderPackage {
  const checksum = createHash("sha256")
    .update(videoPath + String(TARGET) + "-cta")
    .digest("hex")
    .slice(0, 24);
  return {
    id: `rp_cta_${checksum}`,
    version: RENDER_PACKAGE_VERSION,
    createdAt: new Date().toISOString(),
    storyboardId: "sb_cta_rerender",
    assetPackageId: "ap_cta_rerender",
    videoPath,
    duration: TARGET,
    resolution: { width: 1080, height: 1920 },
    fps: 30,
    codec: "h264",
    audioCodec: "aac",
    container: "mp4",
    checksum,
    renderMetadata: {
      jobId: `job_cta_${checksum}`,
      storyboardId: "sb_cta_rerender",
      assetPackageId: "ap_cta_rerender",
      compositionFingerprint: checksum,
      renderer: "ffmpeg",
      outputDirectory: OUT,
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

async function main(): Promise<void> {
  loadAmyNestEnvFiles(REPO_ROOT);
  mkdirSync(WORK, { recursive: true });

  for (const name of SCENE_CLIPS) {
    const p = join(WORK, name);
    if (!existsSync(p)) {
      throw new Error(`Missing scene clip (refusing to regenerate): ${p}`);
    }
  }

  const narration = join(OUT, "audio", "narration.wav");
  const music = join(OUT, "audio", "music.wav");
  if (!existsSync(narration) || !existsSync(music)) {
    throw new Error("Missing narration/music");
  }

  // Natural Amy AI pose from Veo host raw (no caption burn-in).
  const amyFrame = join(WORK, "cta-amy-frame.png");
  const hostRaw = join(WORK, "veo", "shot-amy-host-raw.mp4");
  const hostFallback = join(WORK, "shot-amy-host.mp4");
  const amySource = existsSync(hostRaw) ? hostRaw : hostFallback;
  ffmpeg(["-ss", "1.4", "-i", amySource, "-frames:v", "1", amyFrame]);

  const plate = join(WORK, "cta-premium-ad-plate.png");
  console.log("[cta] Building premium ad plate…");
  writePremiumAdCtaPlate({
    path: plate,
    amySourcePath: amyFrame,
  });

  const sceneDur = SCENE_CLIPS.reduce(
    (a, n) => a + probeDuration(join(WORK, n)),
    0,
  );
  const ctaSeconds = Number(
    Math.max(3.2, Math.min(4.0, TARGET - sceneDur)).toFixed(2),
  );
  const ctaClip = join(WORK, "shot-cta.mp4");
  console.log(`[cta] Animating CTA ${ctaSeconds}s (scenes untouched)…`);
  animatePremiumCta({
    platePath: plate,
    outputPath: ctaClip,
    seconds: ctaSeconds,
  });

  const finalPath = join(OUT, "amynest-second-production-golden-001.mp4");
  if (existsSync(finalPath)) {
    copyFileSync(
      finalPath,
      join(OUT, "amynest-second-production-golden-001.before-cta.mp4"),
    );
  }

  const clips = [...SCENE_CLIPS.map((n) => join(WORK, n)), ctaClip];
  const listPath = join(OUT, "concat-cta-rerender.txt");
  writeFileSync(
    listPath,
    clips.map((c) => `file '${c.replace(/'/g, "'\\''")}'`).join("\n") + "\n",
  );

  console.log("[cta] Remuxing master…");
  ffmpeg([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-i",
    narration,
    "-i",
    music,
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
    finalPath,
  ]);

  const golden = loadGolden001();
  const content = goldenToContentPackage(golden);
  const renderPackage = toRenderPackage(finalPath);
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

  console.log("[cta] Evidence certification…");
  const launch = validateLaunch({
    content,
    render: renderPackage,
    metadata,
    thumbnail,
    schedule,
    evidenceWorkDir: join(OUT, "evidence"),
  });
  writeLaunchValidationReport({ report: launch, outputDirectory: OUT });

  const ok =
    launch.ok &&
    launch.certification.certification === "PASS" &&
    launch.certification.ok;
  console.log(
    `CTA remux certification → ${launch.certification.certification} score=${launch.scores.overall}`,
  );
  if (!ok) {
    console.error(
      launch.certification.blockedReasons.slice(0, 8).join(" | ") ||
        launch.reasons.slice(0, 8).join(" | "),
    );
    process.exit(1);
  }

  await resolveYouTubeAccessToken({ env: process.env, persistToEnv: true });
  const publisher = new PublishingOrchestrator({ config });
  const result = await publisher.publish({
    content,
    render: renderPackage,
    overrides: { visibility: "unlisted" },
  });

  console.log("CTA-ONLY RERENDER → SUCCESS");
  console.log(`URL: ${result.video.url}`);
  console.log(`Guide: ${CTA_GUIDE}`);
  console.log(`Plate: ${plate}`);
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

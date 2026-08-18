/**
 * Upload an already-rendered local master to YouTube (unlisted by default).
 * Does not regenerate video. Uses existing PublishingOrchestrator.
 *
 * Example:
 *   AMYNEST_GOLDEN_NUM=9 \
 *   AMYNEST_MASTER_PATH=../.amynest-assets/v5-inspect-golden-009/amynest-veo-720p-golden-009.mp4 \
 *   AMYNEST_LAUNCH_VALIDATOR=0 \
 *   pnpm exec node --import tsx/esm ./operations/upload-local-master.ts
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { loadDefaultConfig } from "../config/index.js";
import { allGoldenSeeds } from "../golden-scripts/seeds.js";
import { buildGoldenScript } from "../golden-scripts/build.js";
import type { GoldenScript } from "../golden-scripts/types.js";
import { PublishingOrchestrator } from "../publishing/orchestrator.js";
import { resolveYouTubeAccessToken } from "../publishing/youtube/oauth.js";
import { getTopicById } from "../topics/index.js";
import type { ContentPackage } from "../types/content-package.js";
import { CONTENT_PACKAGE_VERSION } from "../types/content-package.js";
import type { Topic } from "../types/index.js";
import type { RenderPackage } from "../types/render-package.js";
import { RENDER_PACKAGE_VERSION } from "../types/render-package.js";
import { loadAmyNestEnvFiles } from "./env/load-env.js";
import { buildGoldenVoiceAndCaptions } from "./golden-voice.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..");
const TARGET_DURATION = 21;

function resolveGoldenNum(): number {
  const raw =
    process.env.AMYNEST_GOLDEN_NUM?.trim() ||
    process.env.AMYNEST_GOLDEN_ID?.trim();
  if (!raw) return 9;
  const fromId = raw.match(/(\d{1,3})$/);
  const n = Number(fromId?.[1] ?? raw);
  if (!Number.isFinite(n) || n < 1) return 9;
  return Math.floor(n);
}

function mapGoldenCategory(category: string): Topic["category"] {
  switch (category.toLowerCase()) {
    case "speech":
      return "Speech";
    case "learning":
      return "Learning";
    case "health":
      return "Health";
    case "games":
      return "Games";
    default:
      return "Parenting";
  }
}

function probeDurationSeconds(path: string): number {
  try {
    const out = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        path,
      ],
      { encoding: "utf8" },
    ).trim();
    const n = Number(out);
    return Number.isFinite(n) ? n : TARGET_DURATION;
  } catch {
    return TARGET_DURATION;
  }
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

  const hook = script.selectedHook.text;
  const { voiceScript, captions } = buildGoldenVoiceAndCaptions(
    script,
    TARGET_DURATION,
  );

  return {
    id: `prod-upload-${script.id}`,
    version: CONTENT_PACKAGE_VERSION,
    createdAt: new Date().toISOString(),
    title: script.title,
    topic: { ...base, title: script.topic, category },
    hook,
    voiceScript,
    sceneScript: script.storyFlow.map((b, i) => `SCENE ${i + 1} | ${b}`).join("\n"),
    captions,
    description: [
      script.title,
      "",
      script.parentingSituation,
      "",
      "Download AmyNest AI — Google Play · App Store · amynest.in",
    ].join("\n"),
    hashtags: ["AmyNest", "Parenting", "Shorts", script.category],
    keywords: ["amynest", "parenting", script.category.toLowerCase()],
    cta: "Download AmyNest AI",
    readingTime: Math.round(voiceScript.split(/\s+/).length / 2.5),
    estimatedDuration: TARGET_DURATION,
    language: "en-IN",
    provider: "golden-script",
  };
}

function toRenderPackage(
  videoPath: string,
  outputDirectory: string,
  goldenId: string,
  duration: number,
): RenderPackage {
  const checksum = createHash("sha256")
    .update(videoPath + String(duration))
    .digest("hex")
    .slice(0, 24);
  return {
    id: `rp_upload_${goldenId}_${checksum}`,
    version: RENDER_PACKAGE_VERSION,
    createdAt: new Date().toISOString(),
    storyboardId: `sb_upload_${goldenId}`,
    assetPackageId: `ap_upload_${goldenId}`,
    videoPath,
    duration,
    resolution: { width: 1080, height: 1920 },
    fps: 30,
    codec: "h264",
    audioCodec: "aac",
    container: "mp4",
    checksum,
    renderMetadata: {
      jobId: `job_upload_${goldenId}_${checksum}`,
      storyboardId: `sb_upload_${goldenId}`,
      assetPackageId: `ap_upload_${goldenId}`,
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
      frames: Math.round(duration * 30),
      droppedFrames: 0,
      cacheHit: true,
      provider: "ffmpeg",
    },
    validation: {
      ok: true,
      errors: [],
      warnings: ["Uploaded via upload-local-master (inspector path)"],
    },
    progressLog: [],
  };
}

async function main(): Promise<void> {
  loadAmyNestEnvFiles(REPO_ROOT);
  process.env.AMYNEST_PUBLISHING_PROVIDER = "youtube";

  const goldenNum = resolveGoldenNum();
  const goldenId = `golden-${String(goldenNum).padStart(3, "0")}`;
  const masterPath = resolve(
    process.env.AMYNEST_MASTER_PATH?.trim() ||
      join(
        REPO_ROOT,
        ".amynest-assets",
        `v5-inspect-${goldenId}`,
        `amynest-veo-720p-${goldenId}.mp4`,
      ),
  );
  if (!existsSync(masterPath)) {
    throw new Error(`Master not found: ${masterPath}`);
  }

  const visibility =
    (process.env.AMYNEST_YOUTUBE_VISIBILITY?.trim().toLowerCase() as
      | "public"
      | "private"
      | "unlisted") || "unlisted";

  await resolveYouTubeAccessToken({ env: process.env, persistToEnv: true });

  const seed = allGoldenSeeds()[goldenNum - 1];
  if (!seed) throw new Error(`No golden seed for ${goldenId}`);
  const script = buildGoldenScript(seed, goldenNum);
  const content = goldenToContentPackage(script);
  const duration = Math.max(TARGET_DURATION, Math.round(probeDurationSeconds(masterPath)));
  const outDir = dirname(masterPath);
  const render = toRenderPackage(masterPath, outDir, goldenId, duration);

  const config = {
    ...loadDefaultConfig(),
    publishingProvider: "youtube" as const,
    defaultVisibility: visibility,
    playlist: "AmyNest Shorts",
    uploadRetries: 2,
    notificationChannels: [] as string[],
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
  const publisher = new PublishingOrchestrator({ config });
  const result = await publisher.publish({
    content,
    render,
    overrides: { visibility },
  });

  console.log(
    JSON.stringify(
      {
        status: "UPLOADED",
        goldenScriptId: goldenId,
        videoId: result.video.videoId,
        url: result.video.url,
        visibility: result.video.visibility,
        masterPath,
        launchValidator: process.env.AMYNEST_LAUNCH_VALIDATOR ?? "on",
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

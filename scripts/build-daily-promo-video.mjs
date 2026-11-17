#!/usr/bin/env node
/**
 * Build today's calendar-themed vertical Short (1080×1920, 15s) when no promo MP4 exists.
 *
 * Usage:
 *   pnpm run youtube:build-daily-video
 *   pnpm run youtube:build-daily-video -- --out=/path/to/out.mp4
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptsDir, "..");
const calendarPath = join(scriptsDir, "promo-video-calendar.json");
const outDir = join(repoRoot, "artifacts/promo-automation/daily-videos");
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Theme → reel still + optional app demo clip */
const THEME_ASSETS = {
  astro: {
    still: "artifacts/kidschedule/public/promo/social/reels/amy-coach.png",
    clip: "artifacts/kidschedule/public/promo/get-app/demo-15s.mp4",
  },
  routines: {
    still: "artifacts/kidschedule/public/promo/social/reels/daily-routines.png",
    clip: "artifacts/kidschedule/public/promo/get-app/demo-15s.mp4",
  },
  speech: {
    still: "artifacts/kidschedule/public/promo/social/reels/speech-coach.png",
    clip: "artifacts/kidschedule/public/promo/get-app/demo-15s.mp4",
  },
  stories: {
    still: "artifacts/kidschedule/public/promo/social/reels/learning-zone.png",
    clip: "artifacts/kidschedule/public/promo/get-app/demo-15s.mp4",
  },
  download: {
    still: "artifacts/kidschedule/public/promo/social/reels/amy-coach.png",
    clip: "artifacts/kidschedule/public/promo/google-ads/videos/01-vertical-15s-9x16.mp4",
  },
  family: {
    still: "artifacts/kidschedule/public/promo/social/reels/nutrition-hub.png",
    clip: "artifacts/kidschedule/public/promo/get-app/demo-15s.mp4",
  },
  general: {
    still: "artifacts/kidschedule/public/promo/social/reels/amy-coach.png",
    clip: "artifacts/kidschedule/public/promo/get-app/demo-15s.mp4",
  },
};

function parseArgs(argv) {
  let out = "";
  for (const arg of argv) {
    if (arg.startsWith("--out=")) out = arg.slice("--out=".length);
  }
  return { out };
}

function todayEntry() {
  const calendar = JSON.parse(readFileSync(calendarPath, "utf8"));
  const day = DAYS[new Date().getDay()];
  return calendar.find((e) => e.day === day) ?? calendar[0];
}

function run(cmd, args) {
  execFileSync(cmd, args, { stdio: "inherit" });
}

function ensureFfmpeg() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
  } catch {
    console.error("Error: ffmpeg is required.");
    process.exit(1);
  }
}

const { out: outArg } = parseArgs(process.argv.slice(2));
const entry = todayEntry();
const assets = THEME_ASSETS[entry.theme] ?? THEME_ASSETS.general;
const stillPath = join(repoRoot, assets.still);
const clipPath = join(repoRoot, assets.clip);

if (!existsSync(stillPath)) {
  console.error(`Error: missing still image: ${stillPath}`);
  process.exit(1);
}

const dateSlug = new Date().toISOString().slice(0, 10);
mkdirSync(outDir, { recursive: true });
const outPath = outArg || join(outDir, `${entry.day}-${dateSlug}.mp4`);
const introPath = join(outDir, `.${entry.day}-${dateSlug}-intro.mp4`);

ensureFfmpeg();

console.log("Building daily promo video");
console.log("==========================");
console.log(`Day:     ${entry.day}`);
console.log(`Theme:   ${entry.theme}`);
console.log(`Title:   ${entry.title}`);
console.log(`Output:  ${outPath}`);

// 5s Ken Burns intro from themed still → 10s app demo (scaled to 9:16) if clip exists.
run("ffmpeg", [
  "-y",
  "-loop",
  "1",
  "-framerate",
  "30",
  "-i",
  stillPath,
  "-vf",
  "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920," +
    "zoompan=z='min(zoom+0.0012,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=150:s=1080x1920:fps=30",
  "-t",
  "5",
  "-pix_fmt",
  "yuv420p",
  "-c:v",
  "libx264",
  "-preset",
  "veryfast",
  introPath,
]);

if (existsSync(clipPath)) {
  run("ffmpeg", [
    "-y",
    "-i",
    introPath,
    "-i",
    clipPath,
    "-filter_complex",
    "[1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30[v1];" +
      "[0:v][v1]concat=n=2:v=1:a=0,format=yuv420p[vout]",
    "-map",
    "[vout]",
    "-t",
    "15",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-pix_fmt",
    "yuv420p",
    outPath,
  ]);
} else {
  run("ffmpeg", [
    "-y",
    "-i",
    introPath,
    "-vf",
    "tpad=stop_mode=clone:stop_duration=10",
    "-t",
    "15",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-pix_fmt",
    "yuv420p",
    outPath,
  ]);
}

console.log(`\nBUILT_VIDEO=${outPath}`);

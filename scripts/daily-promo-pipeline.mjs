#!/usr/bin/env node
/**
 * Daily promo pipeline: pick calendar entry → upload newest MP4 from promo folder → log result.
 *
 * Usage:
 *   pnpm run youtube:daily-promo
 *   pnpm run youtube:daily-promo -- --file=/path/to/video.mp4
 *   pnpm run youtube:daily-promo -- --dry-run
 *
 * Cron (Render, UTC): schedule "30 0 * * *" for 6:00 AM IST
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles, repoRoot } from "./lib/load-env.mjs";

loadEnvFiles();

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const calendarPath = join(scriptsDir, "promo-video-calendar.json");
const defaultPromoDir = join(repoRoot, "Promotional images and video new");
const logDir = join(repoRoot, "artifacts/promo-automation");
const logPath = join(logDir, "upload-log.jsonl");

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function parseArgs(argv) {
  let file = "";
  let dryRun = false;
  let promoDir = process.env.PROMO_VIDEO_DIR?.trim() || defaultPromoDir;
  for (const arg of argv) {
    if (arg.startsWith("--file=")) file = arg.slice("--file=".length);
    else if (arg.startsWith("--promo-dir=")) promoDir = arg.slice("--promo-dir=".length);
    else if (arg === "--dry-run") dryRun = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(`Usage:
  pnpm run youtube:daily-promo [--file=video.mp4] [--promo-dir=PATH] [--dry-run]

Without --file, picks the newest .mp4 in the promo folder.
Uses promo-video-calendar.json for title/tags by weekday.
`);
      process.exit(0);
    }
  }
  return { file, dryRun, promoDir };
}

function todayEntry() {
  const calendar = JSON.parse(readFileSync(calendarPath, "utf8"));
  const day = DAYS[new Date().getDay()];
  return calendar.find((e) => e.day === day) ?? calendar[0];
}

function newestMp4(dir) {
  if (!existsSync(dir)) return "";
  const files = readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".mp4"))
    .map((f) => {
      const p = join(dir, f);
      return { p, mtime: statSync(p).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
  return files[0]?.p ?? "";
}

function appendLog(entry) {
  mkdirSync(logDir, { recursive: true });
  writeFileSync(logPath, `${JSON.stringify(entry)}\n`, { flag: "a" });
}

const { file, dryRun, promoDir } = parseArgs(process.argv.slice(2));
const entry = todayEntry();
let videoPath = file || newestMp4(promoDir);

if (!videoPath || !existsSync(videoPath)) {
  const buildScript = join(scriptsDir, "build-daily-promo-video.mjs");
  console.log("No promo MP4 found — building today's themed Short…");
  try {
    const built = execFileSync(process.execPath, [buildScript], {
      encoding: "utf8",
      env: process.env,
    });
    process.stdout.write(built);
    const match = built.match(/BUILT_VIDEO=(\S+)/);
    videoPath = match?.[1] ?? "";
  } catch (err) {
    console.error(`Build failed. Put videos in:\n  ${promoDir}\nOr pass --file=/path/to/video.mp4`);
    throw err;
  }
}

if (!videoPath || !existsSync(videoPath)) {
  console.error(`No MP4 found after build. Put videos in:\n  ${promoDir}\nOr pass --file=/path/to/video.mp4`);
  process.exit(1);
}

console.log("Daily promo pipeline");
console.log("====================");
console.log(`Day:     ${entry.day}`);
console.log(`Title:   ${entry.title}`);
console.log(`Video:   ${videoPath}`);
console.log(`Privacy: ${process.env.YOUTUBE_DEFAULT_PRIVACY || "unlisted"}`);

if (dryRun) {
  console.log("\n(dry-run — no upload)");
  process.exit(0);
}

const uploadScript = join(scriptsDir, "youtube-upload.mjs");
const out = execFileSync(
  process.execPath,
  [
    uploadScript,
    videoPath,
    `--title=${entry.title}`,
    `--tags=${entry.tags.join(",")}`,
  ],
  { encoding: "utf8", env: process.env },
);

console.log(out);

const idMatch = out.match(/YOUTUBE_VIDEO_ID=(\S+)/);
const videoId = idMatch?.[1] ?? "";
if (videoId) {
  appendLog({
    at: new Date().toISOString(),
    videoId,
    url: `https://youtube.com/shorts/${videoId}`,
    title: entry.title,
    sourceFile: videoPath,
    privacy: process.env.YOUTUBE_DEFAULT_PRIVACY || "unlisted",
  });
  console.log(`\nLog appended: ${logPath}`);
  console.log("\nApprove karne ke baad public karo:");
  console.log(`  pnpm run youtube:publish -- ${videoId}`);
}

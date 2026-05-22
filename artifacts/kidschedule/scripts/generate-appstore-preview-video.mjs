#!/usr/bin/env node
/**
 * Records real AmyNest app screens and composes a 15-second App Store Preview video.
 *
 * Output: screenshots/appstore-preview-iphone-15s.mp4 (1080×1920, H.264)
 *
 * Usage:
 *   STRESS_TEST_EMAIL=demo@amynest.in STRESS_TEST_PASSWORD='AmyNest@2025' \
 *   PLAYWRIGHT_BASE_URL=https://www.amynest.in \
 *   node scripts/generate-appstore-preview-video.mjs
 */
import { chromium } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { mkdir, rm, readdir, copyFile } from "node:fs/promises";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.resolve(ROOT, "../../screenshots");
const WORK_DIR = path.resolve(ROOT, ".appstore-preview-work");
const FINAL_PATH = path.join(OUT_DIR, "appstore-preview-iphone-15s.mp4");
const LOGO_PATH = path.join(ROOT, "public/amynest-hero-logo.png");
const MASCOT_PATH = path.join(ROOT, "public/pwa-icon-512.png");

const BASE_URL = normalizeBaseUrl(process.env.PLAYWRIGHT_BASE_URL ?? "https://www.amynest.in");
const EMAIL = process.env.STRESS_TEST_EMAIL ?? "demo@amynest.in";
const PASSWORD = process.env.STRESS_TEST_PASSWORD ?? "AmyNest@2025";

const WIDTH = 1080;
const HEIGHT = 1920;
const VIEWPORT = { width: 360, height: 640 };
const SCALE = 3;

const SCENES = [
  { id: "launch", duration: 2, caption: "Your Child's AI Learning Companion" },
  { id: "personalize", duration: 4, caption: "Personalized for every child" },
  { id: "learning", duration: 4, caption: "Interactive AI Learning" },
  { id: "progress", duration: 3, caption: "Track your child's progress" },
  { id: "cta", duration: 2, caption: null },
];

const FONT =
  process.platform === "darwin"
    ? "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
    : "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

function normalizeBaseUrl(raw) {
  const trimmed = raw.replace(/\/$/, "");
  try {
    const u = new URL(trimmed);
    if (u.hostname === "amynest.in") u.hostname = "www.amynest.in";
    return u.origin;
  } catch {
    return trimmed;
  }
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed with code ${result.status}`);
  }
}

function escapeDrawtext(text) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/,/g, "\\,");
}

function captionOverlay(caption, duration) {
  if (!caption) return "";
  const text = escapeDrawtext(caption);
  const end = Math.max(0.1, duration - 0.2).toFixed(2);
  return [
    "drawbox=x=0:y=h-200:w=iw:h=200:color=black@0.5:t=fill",
    `drawtext=fontfile='${FONT}':text='${text}':fontsize=44:fontcolor=white@0.95:x=(w-text_w)/2:y=h-130:enable='between(t\\,0.2\\,${end})'`,
  ].join(",");
}

async function dismissCountryPromptIfVisible(page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const yes = page.getByRole("button", { name: /Yes, that's right/i });
    if (!(await yes.isVisible({ timeout: 2_000 }).catch(() => false))) return;
    await yes.click({ force: true });
    await page.waitForTimeout(600);
  }
}

async function signIn(page) {
  await page.goto(`${BASE_URL}/sign-in`, { waitUntil: "networkidle", timeout: 120_000 });
  const emailInput = page.locator('input[type="email"]');
  if (!(await emailInput.isVisible({ timeout: 15_000 }).catch(() => false))) {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: 120_000 });
    await emailInput.waitFor({ state: "visible", timeout: 30_000 });
  }
  await emailInput.fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL(
    (url) => !url.pathname.includes("/sign-in") && !url.pathname.includes("/login"),
    { timeout: 120_000 },
  );
  await page
    .waitForFunction(
      () => (window).__amynestAppCoreReady === true,
      { timeout: 45_000 },
    )
    .catch(() => {});
  await dismissCountryPromptIfVisible(page);
  if (page.url().includes("/onboarding")) {
    await page
      .waitForURL((url) => !url.pathname.includes("/onboarding"), { timeout: 90_000 })
      .catch(() => {});
    await dismissCountryPromptIfVisible(page);
  }
}

async function recordSegment(browser, storageState, name, action) {
  const segDir = path.join(WORK_DIR, "raw", name);
  await mkdir(segDir, { recursive: true });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    isMobile: true,
    hasTouch: true,
    storageState,
    recordVideo: { dir: segDir, size: { width: WIDTH, height: HEIGHT } },
    locale: "en-US",
    colorScheme: "dark",
  });
  const page = await context.newPage();
  await action(page);
  await page.close();
  await context.close();

  const files = (await readdir(segDir)).filter((f) => f.endsWith(".webm"));
  if (!files.length) throw new Error(`No recording for segment "${name}"`);
  const src = path.join(segDir, files[0]);
  const dest = path.join(WORK_DIR, `${name}.webm`);
  await copyFile(src, dest);
  return dest;
}

async function recordAppSegments(browser, storageState) {
  console.log("Recording launch splash…");
  await recordSegment(browser, storageState, "launch", async (page) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "commit", timeout: 60_000 });
    await page.waitForSelector("#splash, [data-testid='dashboard-root'], main", {
      timeout: 20_000,
    }).catch(() => {});
    await page.waitForTimeout(2_200);
  });

  console.log("Recording personalization flow…");
  await recordSegment(browser, storageState, "personalize", async (page) => {
    await page.goto(`${BASE_URL}/children/new`, { waitUntil: "networkidle", timeout: 90_000 });
    await dismissCountryPromptIfVisible(page);
    await page.waitForTimeout(800);

    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await nameInput.click();
      await nameInput.fill("Aarav");
      await page.waitForTimeout(500);
    }

    const dobInput = page.locator('input[type="date"], input[name="dob"]').first();
    if (await dobInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await dobInput.click();
      await dobInput.fill("2019-06-15");
      await page.waitForTimeout(700);
    }

    await page.mouse.wheel(0, 280);
    await page.waitForTimeout(900);

    const schoolYes = page.getByRole("button", { name: /yes|school/i }).first();
    if (await schoolYes.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await schoolYes.click().catch(() => {});
      await page.waitForTimeout(600);
    }

    await page.mouse.wheel(0, 220);
    await page.waitForTimeout(1_500);
  });

  console.log("Recording AI learning interaction…");
  await recordSegment(browser, storageState, "learning", async (page) => {
    await page.goto(`${BASE_URL}/speech-coach`, { waitUntil: "networkidle", timeout: 90_000 });
    await dismissCountryPromptIfVisible(page);
    await page.waitForTimeout(1_200);

    const startBtn = page
      .getByRole("button", { name: /practice|start|listen|play|try/i })
      .first();
    if (await startBtn.isVisible({ timeout: 6_000 }).catch(() => false)) {
      await startBtn.click({ timeout: 4_000 }).catch(() => {});
      await page.waitForTimeout(1_000);
    }

    await page.mouse.wheel(0, 320);
    await page.waitForTimeout(900);

    const micBtn = page.locator('[data-testid*="mic"], button:has(svg)').filter({ hasText: /./ }).first();
    if (await micBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await micBtn.click({ timeout: 2_000 }).catch(() => {});
    }

    await page.waitForTimeout(1_800);
  });

  console.log("Recording progress insights…");
  await recordSegment(browser, storageState, "progress", async (page) => {
    await page.goto(`${BASE_URL}/insights`, { waitUntil: "networkidle", timeout: 90_000 });
    await dismissCountryPromptIfVisible(page);
    await page.waitForTimeout(1_000);
    await page.mouse.wheel(0, 420);
    await page.waitForTimeout(900);
    await page.mouse.wheel(0, 380);
    await page.waitForTimeout(900);
  });
}

function buildSceneClip(input, scene, output) {
  const { duration, caption } = scene;
  const vf = [
    `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase`,
    `crop=${WIDTH}:${HEIGHT}`,
    "setsar=1",
    `fade=t=in:st=0:d=0.25`,
    `fade=t=out:st=${Math.max(0, duration - 0.25).toFixed(2)}:d=0.25`,
    captionOverlay(caption, duration),
  ]
    .filter(Boolean)
    .join(",");

  run("ffmpeg", [
    "-y",
    "-i",
    input,
    "-t",
    String(duration),
    "-vf",
    vf,
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "medium",
    "-crf",
    "18",
    output,
  ]);
}

function buildCtaClip(output) {
  const headline = escapeDrawtext("Start your child's learning journey today");
  const brand = escapeDrawtext("AmyNest");
  const filter = [
    `color=c=0x0f0c29:s=${WIDTH}x${HEIGHT}:d=2:r=30`,
    `[bg]`,
    `[1:v]scale=260:-1[logo]`,
    `[bg][logo]overlay=(W-w)/2:H*0.28[tmp1]`,
    `[2:v]scale=180:-1[mascot]`,
    `[tmp1][mascot]overlay=(W-w)/2:H*0.46[tmp2]`,
    `[tmp2]drawtext=fontfile='${FONT}':text='${headline}':fontsize=40:fontcolor=white@0.92:x=(w-text_w)/2:y=H*0.68[tmp3]`,
    `[tmp3]drawtext=fontfile='${FONT}':text='${brand}':fontsize=72:fontcolor=0xE879F9:x=(w-text_w)/2:y=H*0.78,format=yuv420p[out]`,
  ].join(";");

  run("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=0x0f0c29:s=${WIDTH}x${HEIGHT}:d=2:r=30`,
    "-loop",
    "1",
    "-i",
    LOGO_PATH,
    "-loop",
    "1",
    "-i",
    MASCOT_PATH,
    "-filter_complex",
    filter,
    "-map",
    "[out]",
    "-t",
    "2",
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "medium",
    "-crf",
    "18",
    output,
  ]);
}

function concatClips(clips, output) {
  const listPath = path.join(WORK_DIR, "concat.txt");
  const listBody = clips.map((c) => `file '${c.replace(/'/g, "'\\''")}'`).join("\n");
  writeFileSync(listPath, listBody);

  run("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-t",
    "15",
    output,
  ]);
}

async function main() {
  spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  if (spawnSync("ffmpeg", ["-version"]).status !== 0) {
    throw new Error("ffmpeg is required. Install with: brew install ffmpeg");
  }

  await rm(WORK_DIR, { recursive: true, force: true });
  await mkdir(WORK_DIR, { recursive: true });
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const authContext = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    isMobile: true,
    hasTouch: true,
    locale: "en-US",
    colorScheme: "dark",
  });
  const authPage = await authContext.newPage();
  console.log(`Signing in to ${BASE_URL}…`);
  await signIn(authPage);
  const storageState = await authContext.storageState();
  await authContext.close();

  await recordAppSegments(browser, storageState);
  await browser.close();

  console.log("Compositing final video…");
  const builtClips = [];
  for (const scene of SCENES) {
    const out = path.join(WORK_DIR, `${scene.id}.mp4`);
    if (scene.id === "cta") {
      buildCtaClip(out);
    } else {
      buildSceneClip(path.join(WORK_DIR, `${scene.id}.webm`), scene, out);
    }
    builtClips.push(out);
  }

  concatClips(builtClips, FINAL_PATH);

  const probe = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration:stream=width,height",
      "-of",
      "default=noprint_wrappers=1",
      FINAL_PATH,
    ],
    { encoding: "utf8" },
  );
  console.log(`\n✓ App Store Preview saved: ${FINAL_PATH}`);
  console.log(probe.stdout.trim());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

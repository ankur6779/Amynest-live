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
const SKIP_RECORD = process.env.SKIP_RECORD === "1";

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

function assertFfmpeg() {
  if (spawnSync("ffmpeg", ["-version"]).status !== 0) {
    throw new Error("ffmpeg is required. Install with: brew install ffmpeg");
  }
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
    .waitForFunction(() => window.__amynestAppCoreReady === true, { timeout: 45_000 })
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
    await page
      .waitForSelector("#splash, [data-testid='dashboard-root'], main", { timeout: 20_000 })
      .catch(() => {});
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
    await page.mouse.wheel(0, 220);
    await page.waitForTimeout(1_500);
  });

  console.log("Recording AI learning interaction…");
  await recordSegment(browser, storageState, "learning", async (page) => {
    await page.goto(`${BASE_URL}/speech-coach`, { waitUntil: "networkidle", timeout: 90_000 });
    await dismissCountryPromptIfVisible(page);
    await page.waitForTimeout(1_200);

    const startBtn = page.getByRole("button", { name: /practice|start|listen|play|try/i }).first();
    if (await startBtn.isVisible({ timeout: 6_000 }).catch(() => false)) {
      await startBtn.click({ timeout: 4_000 }).catch(() => {});
      await page.waitForTimeout(1_000);
    }

    await page.mouse.wheel(0, 320);
    await page.waitForTimeout(900);
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

async function renderOverlayPngs(browser) {
  const overlayDir = path.join(WORK_DIR, "overlays");
  await mkdir(overlayDir, { recursive: true });

  const ctx = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  for (const scene of SCENES) {
    if (scene.id === "cta") {
      const html = `<!DOCTYPE html><html><head><style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{width:${WIDTH}px;height:${HEIGHT}px;background:linear-gradient(180deg,#1a1035 0%,#0f0c29 55%,#080612 100%);
          font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;padding:80px}
        .logo{height:72px;object-fit:contain}
        .mascot{width:160px;height:160px;border-radius:36px;box-shadow:0 0 60px rgba(168,85,247,.45)}
        .headline{font-size:42px;font-weight:700;text-align:center;line-height:1.25;max-width:900px;color:rgba(255,255,255,.95)}
        .brand{font-size:76px;font-weight:800;background:linear-gradient(120deg,#c084fc,#f472b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
      </style></head><body>
        <img class="logo" src="file://${LOGO_PATH}" alt="" />
        <img class="mascot" src="file://${MASCOT_PATH}" alt="" />
        <p class="headline">Start your child's learning journey today</p>
        <p class="brand">AmyNest</p>
      </body></html>`;
      await page.setContent(html, { waitUntil: "load" });
      await page.waitForTimeout(300);
      await page.screenshot({
        path: path.join(WORK_DIR, "cta.png"),
        type: "png",
      });
      continue;
    }

    const html = `<!DOCTYPE html><html><head><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{width:${WIDTH}px;height:${HEIGHT}px;background:transparent}
      .bar{position:absolute;left:0;right:0;bottom:0;height:200px;background:rgba(0,0,0,.52);display:flex;align-items:center;justify-content:center;padding:0 48px}
      .text{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;font-size:46px;font-weight:700;color:#fff;text-align:center;line-height:1.2;letter-spacing:-.02em}
    </style></head><body>
      <div class="bar"><p class="text">${scene.caption}</p></div>
    </body></html>`;
    await page.setContent(html, { waitUntil: "load" });
    await page.locator(".bar").screenshot({
      path: path.join(overlayDir, `${scene.id}-caption.png`),
      type: "png",
      omitBackground: true,
    });
  }

  await page.close();
  await ctx.close();
}

function buildSceneClip(input, scene, captionPng, output) {
  const { duration } = scene;
  const fadeOut = Math.max(0, duration - 0.25).toFixed(2);
  const vf = [
    `[0:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},setsar=1,fade=t=in:st=0:d=0.25,fade=t=out:st=${fadeOut}:d=0.25[v]`,
    `[1:v]scale=${WIDTH}:-1[caption]`,
    `[v][caption]overlay=0:H-h:format=auto,format=yuv420p`,
  ].join(";");

  run("ffmpeg", [
    "-y",
    "-i",
    input,
    "-loop",
    "1",
    "-i",
    captionPng,
    "-t",
    String(duration),
    "-filter_complex",
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
  run("ffmpeg", [
    "-y",
    "-loop",
    "1",
    "-i",
    path.join(WORK_DIR, "cta.png"),
    "-t",
    "2",
    "-vf",
    `scale=${WIDTH}:${HEIGHT},fade=t=in:st=0:d=0.3,fade=t=out:st=1.7:d=0.3,format=yuv420p`,
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
  assertFfmpeg();

  if (!SKIP_RECORD) {
    await rm(WORK_DIR, { recursive: true, force: true });
  }
  await mkdir(WORK_DIR, { recursive: true });
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  if (!SKIP_RECORD) {
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
  } else {
    console.log("SKIP_RECORD=1 — reusing existing .webm segments");
  }

  console.log("Rendering caption overlays…");
  await renderOverlayPngs(browser);
  await browser.close();

  console.log("Compositing final video…");
  const builtClips = [];
  for (const scene of SCENES) {
    const out = path.join(WORK_DIR, `${scene.id}.mp4`);
    if (scene.id === "cta") {
      buildCtaClip(out);
    } else {
      buildSceneClip(
        path.join(WORK_DIR, `${scene.id}.webm`),
        scene,
        path.join(WORK_DIR, "overlays", `${scene.id}-caption.png`),
        out,
      );
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

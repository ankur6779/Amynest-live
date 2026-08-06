/**
 * Capture premium-feel evidence for /begin first experience.
 * Layout/copy/logic unchanged — evidence of motion, light, materials.
 */
import { chromium, devices } from "@playwright/test";
import { mkdirSync, existsSync, rmSync, copyFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const BASE = process.env.FE_BASE_URL || "http://localhost:3000";
const OUT = process.env.FE_OUT || "/opt/cursor/artifacts/screenshots/first-experience-premium";

mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, "video-mobile"), { recursive: true });

async function clearFe(page) {
  await page.goto(`${BASE}/begin`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => {
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch {}
  });
  await page.goto(`${BASE}/begin`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="first-experience-root"]', { timeout: 30000 });
  // Let title settle / light breathe one frame cycle
  await page.waitForTimeout(500);
}

async function shot(page, name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log("shot", name);
}

async function runMobileFlow(recordVideo) {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    recordVideo: recordVideo
      ? { dir: join(OUT, "video-mobile"), size: { width: 390, height: 844 } }
      : undefined,
  });
  const page = await context.newPage();
  await clearFe(page);

  await shot(page, "mobile-01-welcome");
  // Capture living light over a short dwell
  await page.waitForTimeout(1200);
  await page.getByTestId("fe-welcome-continue").click();
  await page.waitForTimeout(450);
  await shot(page, "mobile-02-discovery-name");

  await page.getByTestId("fe-child-name").fill("Aria");
  await page.waitForTimeout(350);
  await shot(page, "mobile-02b-discovery-name-answered");
  await page.getByTestId("fe-name-continue").click();
  await page.waitForTimeout(450);
  await shot(page, "mobile-03-discovery-age");

  await page.getByTestId("fe-age-5-7").click();
  await page.waitForTimeout(350);
  await shot(page, "mobile-03b-discovery-age-answered");
  await page.getByTestId("fe-age-continue").click();
  await page.waitForTimeout(450);
  await shot(page, "mobile-04-discovery-today");

  await page.getByTestId("fe-today-home").click();
  await page.waitForTimeout(350);
  await shot(page, "mobile-04b-discovery-today-answered");
  await page.getByTestId("fe-today-continue").click();

  // Working: wait for first signal, then mid-assemble
  await page.waitForSelector(".fe-signal", { timeout: 10000 });
  await page.waitForTimeout(400);
  await shot(page, "mobile-05-working-assembling");
  await page.waitForSelector('[data-testid="fe-start-action"]', { timeout: 20000 });
  await page.waitForTimeout(700);
  await shot(page, "mobile-06-reveal");

  await page.getByTestId("fe-start-action").click();
  await page.waitForTimeout(450);
  await shot(page, "mobile-07-doing");

  await page.getByTestId("fe-mark-done").click();
  await page.waitForTimeout(700);
  await shot(page, "mobile-08-done-exhale");

  await page.getByTestId("fe-done-continue").click();
  await page.waitForTimeout(450);
  await shot(page, "mobile-09-memory");

  await page.getByTestId("fe-memory-continue").click();
  await page.waitForTimeout(450);
  await shot(page, "mobile-10-keep");

  const videoPath = recordVideo ? await page.video()?.path() : null;
  await context.close();
  await browser.close();
  return videoPath;
}

async function runDesktopShots() {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await clearFe(page);

  await shot(page, "desktop-01-welcome");
  await page.getByTestId("fe-welcome-continue").click();
  await page.waitForTimeout(450);
  await page.getByTestId("fe-child-name").fill("Aria");
  await page.waitForTimeout(300);
  await shot(page, "desktop-02-discovery-name");
  await page.getByTestId("fe-name-continue").click();
  await page.waitForTimeout(450);
  await page.getByTestId("fe-age-5-7").click();
  await page.waitForTimeout(300);
  await shot(page, "desktop-03-discovery-age");
  await page.getByTestId("fe-age-continue").click();
  await page.waitForTimeout(450);
  await page.getByTestId("fe-today-home").click();
  await page.waitForTimeout(300);
  await shot(page, "desktop-04-discovery-today");
  await page.getByTestId("fe-today-continue").click();
  await page.waitForSelector(".fe-signal", { timeout: 10000 });
  await page.waitForTimeout(900);
  await shot(page, "desktop-05-working");
  await page.waitForSelector('[data-testid="fe-start-action"]', { timeout: 20000 });
  await page.waitForTimeout(700);
  await shot(page, "desktop-06-reveal");
  await page.getByTestId("fe-start-action").click();
  await page.waitForTimeout(400);
  await shot(page, "desktop-07-doing");
  await page.getByTestId("fe-mark-done").click();
  await page.waitForTimeout(700);
  await shot(page, "desktop-08-done");
  await page.getByTestId("fe-done-continue").click();
  await page.waitForTimeout(400);
  await shot(page, "desktop-09-memory");
  await page.getByTestId("fe-memory-continue").click();
  await page.waitForTimeout(400);
  await shot(page, "desktop-10-keep");

  await context.close();
  await browser.close();
}

function toWebmAndGif(srcVideo) {
  if (!srcVideo || !existsSync(srcVideo)) {
    console.warn("no video source", srcVideo);
    return;
  }
  const webm = join(OUT, "walkthrough-mobile.webm");
  const gif = join(OUT, "walkthrough-mobile.gif");
  copyFileSync(srcVideo, webm);

  // Prefer ffmpeg if present for a compact gif
  const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" }).status === 0;
  if (hasFfmpeg) {
    spawnSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        webm,
        "-vf",
        "fps=10,scale=390:-1:flags=lanczos",
        "-loop",
        "0",
        gif,
      ],
      { stdio: "inherit" },
    );
  }
  console.log("video", webm, hasFfmpeg ? gif : "(gif skipped, no ffmpeg)");
}

const videoSrc = await runMobileFlow(true);
await runDesktopShots();
toWebmAndGif(videoSrc);
console.log("done", OUT);
console.log(readdirSync(OUT).join("\n"));

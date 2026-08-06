import { chromium, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.FOUNDER_REVIEW_BASE_URL || "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts/screenshots/first-experience-v3";
fs.mkdirSync(OUT, { recursive: true });

async function dismissSplash(page) {
  await page.evaluate(() => {
    const splash = document.getElementById("splash");
    if (splash) splash.remove();
  });
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log("wrote", file);
}

async function run(label, contextOptions) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...contextOptions,
    recordVideo: { dir: path.join(OUT, `video-${label}`), size: contextOptions.viewport || { width: 390, height: 844 } },
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/begin`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await dismissSplash(page);
  await page.waitForSelector('[data-testid="fe-welcome-continue"]', { timeout: 30000 });
  await shot(page, `${label}-01-welcome`);

  await page.click('[data-testid="fe-welcome-continue"]');
  await page.waitForSelector('[data-testid="fe-child-name"]');
  await shot(page, `${label}-02-discovery-name`);
  await page.fill('[data-testid="fe-child-name"]', "Aria");
  await page.click('[data-testid="fe-name-continue"]');

  await page.waitForSelector('[data-testid="fe-age-5-7"]');
  await shot(page, `${label}-03-discovery-age`);
  await page.click('[data-testid="fe-age-5-7"]');
  await page.click('[data-testid="fe-age-continue"]');

  await page.waitForSelector('[data-testid="fe-today-school"]');
  await shot(page, `${label}-04-discovery-today`);
  await page.click('[data-testid="fe-today-school"]');
  await page.click('[data-testid="fe-today-continue"]');

  await page.waitForSelector("text=Forming today’s next right thing");
  await page.waitForSelector("text=Using local time", { timeout: 10000 });
  await page.waitForTimeout(900);
  await shot(page, `${label}-05-working`);

  await page.waitForSelector('[data-testid="fe-start-action"]', { timeout: 20000 });
  await shot(page, `${label}-06-next-thing`);
  await page.click('[data-testid="fe-start-action"]');

  await page.waitForSelector('[data-testid="fe-mark-done"]');
  await shot(page, `${label}-07-doing`);
  await page.click('[data-testid="fe-mark-done"]');

  await page.waitForSelector('[data-testid="fe-done-continue"]');
  await shot(page, `${label}-08-done`);
  await page.click('[data-testid="fe-done-continue"]');

  await page.waitForSelector('[data-testid="fe-memory-continue"]');
  await shot(page, `${label}-09-memory`);
  await page.click('[data-testid="fe-memory-continue"]');

  await page.waitForSelector('[data-testid="fe-keep-account"]');
  await shot(page, `${label}-10-keep`);

  await page.click('[data-testid="fe-keep-account"]');
  await page.waitForURL(/sign-up/);
  await page.waitForTimeout(800);
  await shot(page, `${label}-11-signup`);

  await context.close();
  await browser.close();
}

await run("mobile", { ...devices["iPhone 14 Pro"] });
await run("desktop", { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

// Flatten first mobile video to artifacts root if present
const videoDir = path.join(OUT, "video-mobile");
if (fs.existsSync(videoDir)) {
  const videos = fs.readdirSync(videoDir).filter((f) => f.endsWith(".webm"));
  if (videos[0]) {
    fs.copyFileSync(path.join(videoDir, videos[0]), path.join(OUT, "walkthrough-mobile.webm"));
    console.log("wrote", path.join(OUT, "walkthrough-mobile.webm"));
  }
}
console.log("DONE", OUT);

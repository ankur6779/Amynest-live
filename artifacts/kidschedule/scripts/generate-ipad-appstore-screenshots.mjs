#!/usr/bin/env node
/**
 * Renders appstore-ipad.html slides at 2732×2048 (iPad 12.9" landscape).
 * Output: screenshots/ipad/appstore-ipad-NN-<slug>.jpg
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const outDir = path.resolve(__dirname, "../../../screenshots/ipad");
const WIDTH = 2732;
const HEIGHT = 2048;

const SLIDES = [
  { n: 1, slug: "hero" },
  { n: 2, slug: "ask-amy" },
  { n: 3, slug: "routines" },
  { n: 4, slug: "nutrition" },
  { n: 5, slug: "behavior" },
  { n: 6, slug: "spelling" },
  { n: 7, slug: "hub" },
  { n: 8, slug: "insights" },
  { n: 9, slug: "coach" },
  { n: 10, slug: "cta" },
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

for (const { n, slug } of SLIDES) {
  const url = pathToFileURL(path.join(publicDir, "appstore-ipad.html")).href + `?n=${n}`;
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const outPath = path.join(
    outDir,
    `appstore-ipad-${String(n).padStart(2, "0")}-${slug}.jpg`,
  );
  await page.locator(".slide.active").screenshot({
    path: outPath,
    type: "jpeg",
    quality: 92,
  });
  const size = await page.evaluate(() => {
    const el = document.querySelector(".slide.active");
    return el ? { w: el.offsetWidth, h: el.offsetHeight } : null;
  });
  console.log(`✓ ${path.basename(outPath)} (${size?.w}×${size?.h})`);
}

await browser.close();
console.log(`\nDone — ${SLIDES.length} iPad screenshots in ${outDir}`);

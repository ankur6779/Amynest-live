#!/usr/bin/env node
/**
 * Renders appstore-infant-parenting.html slides at 1242×2688 (iPhone App Store).
 * Output: screenshots/infant-parenting/ + public/promo/infant-parenting/
 */
import { chromium } from "@playwright/test";
import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const outDir = path.resolve(__dirname, "../../../screenshots/infant-parenting");
const promoDir = path.resolve(publicDir, "promo/infant-parenting");
const WIDTH = 1242;
const HEIGHT = 2688;

const SLIDES = [
  { n: 1, slug: "cry-insight", assetId: "appstore_cry_insight" },
  { n: 2, slug: "baby-today", assetId: "appstore_baby_today" },
  { n: 3, slug: "growth", assetId: "appstore_growth" },
  { n: 4, slug: "vaccines", assetId: "appstore_vaccines" },
  { n: 5, slug: "weekly-share", assetId: "appstore_weekly_share" },
];

await mkdir(outDir, { recursive: true });
await mkdir(promoDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

for (const { n, slug } of SLIDES) {
  const url =
    pathToFileURL(path.join(publicDir, "appstore-infant-parenting.html")).href + `?n=${n}`;
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const base = `appstore-${String(n).padStart(2, "0")}-${slug}.jpg`;
  const outPath = path.join(outDir, base);
  const promoPath = path.join(promoDir, base);
  await page.locator(".slide.active").screenshot({
    path: outPath,
    type: "jpeg",
    quality: 92,
  });
  await copyFile(outPath, promoPath);
  console.log(`✓ ${base}`);
}

await browser.close();
console.log(`\nDone — ${SLIDES.length} infant parenting screenshots`);
console.log(`  App Store: ${outDir}`);
console.log(`  Web promo: ${promoDir}`);

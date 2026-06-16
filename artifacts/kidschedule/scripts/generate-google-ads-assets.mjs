#!/usr/bin/env node
/**
 * Generate Google Ads image assets (20 images) + process videos from get-app promo.
 *
 * Usage: node scripts/generate-google-ads-assets.mjs
 *
 * Output: public/promo/google-ads/images/ + videos/ + index.json
 */
import { chromium } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const kidscheduleRoot = path.resolve(__dirname, "..");
const manifestPath = path.join(__dirname, "google-ads-assets-manifest.json");
const templatePath = path.join(kidscheduleRoot, "public/google-ads-asset-template.html");

/** Google Ads recommended sizes */
const FORMATS = {
  landscape: { width: 1200, height: 628, ratio: "1.91:1" },
  square: { width: 1200, height: 1200, ratio: "1:1" },
  portrait: { width: 960, height: 1200, ratio: "4:5" },
};

const SIZE_PRESETS = {
  landscape: {
    pad: 28,
    gapSm: 12,
    gapMd: 24,
    logo: 40,
    brandSize: 18,
    eyebrow: 11,
    h1: 34,
    sub: 15,
    phoneW: 200,
    phoneH: 410,
    ctaSize: 15,
    footerSize: 11,
  },
  square: {
    pad: 40,
    gapSm: 16,
    gapMd: 24,
    logo: 48,
    brandSize: 20,
    eyebrow: 12,
    h1: 38,
    sub: 17,
    phoneW: 260,
    phoneH: 540,
    ctaSize: 17,
    footerSize: 12,
  },
  portrait: {
    pad: 36,
    gapSm: 14,
    gapMd: 20,
    logo: 44,
    brandSize: 19,
    eyebrow: 11,
    h1: 36,
    sub: 16,
    phoneW: 240,
    phoneH: 500,
    ctaSize: 16,
    footerSize: 11,
  },
};

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const templateHtml = await readFile(templatePath, "utf8");
const outputRoot = path.resolve(kidscheduleRoot, manifest.outputDir);
const imagesDir = path.join(outputRoot, "images");
const videosDir = path.join(outputRoot, "videos");

const logoPath = path.resolve(kidscheduleRoot, manifest.defaults.logo);
const logoDataUrl = `data:image/png;base64,${Buffer.from(await readFile(logoPath)).toString("base64")}`;

/** @type {Map<string, string>} */
const screenshotCache = new Map();

async function loadScreenshot(ref) {
  if (!ref) return "";
  if (screenshotCache.has(ref)) return screenshotCache.get(ref);
  const rel = manifest.screenshotSources[ref];
  if (!rel) throw new Error(`Unknown screenshot ref: ${ref}`);
  const abs = path.resolve(kidscheduleRoot, rel);
  const buf = await readFile(abs);
  const ext = path.extname(abs).toLowerCase();
  const mime = ext === ".png" ? "image/png" : "image/jpeg";
  const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
  screenshotCache.set(ref, dataUrl);
  return dataUrl;
}

function buildConfig(asset) {
  const formatKey = asset.format;
  const format = FORMATS[formatKey];
  const sizes = { ...format, ...SIZE_PRESETS[formatKey] };

  return {
    layout: asset.layout || "feature",
    sizes,
    logoDataUrl,
    footer: manifest.defaults.footer,
    eyebrow: asset.eyebrow,
    headline: asset.headline,
    headlineAccent: asset.headlineAccent,
    subheadline: asset.subheadline,
    accent: asset.accent,
    screenshotDataUrl: asset._screenshotDataUrl || "",
    showCta: Boolean(asset.showCta),
  };
}

async function renderAsset(page, config) {
  await page.setViewportSize({ width: config.sizes.width, height: config.sizes.height });
  await page.setContent(templateHtml, { waitUntil: "domcontentloaded" });
  await page.evaluate((cfg) => {
    render(cfg);
  }, config);
  await page.waitForTimeout(200);
  return page.screenshot({ type: "png" });
}

/** @type {Array<Record<string, unknown>>} */
const index = [];

await mkdir(imagesDir, { recursive: true });
await mkdir(videosDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

for (const asset of manifest.assets) {
  const enriched = { ...asset };
  if (asset.screenshot) {
    enriched._screenshotDataUrl = await loadScreenshot(asset.screenshot);
  }

  const config = buildConfig(enriched);
  const outPath = path.join(imagesDir, asset.filename);
  const png = await renderAsset(page, config);
  await writeFile(outPath, png);

  const format = FORMATS[asset.format];
  console.log(`✓ images/${asset.filename} (${format.width}×${format.height}, ${format.ratio})`);
  index.push({
    type: "image",
    id: asset.id,
    filename: asset.filename,
    format: asset.format,
    width: format.width,
    height: format.height,
    ratio: format.ratio,
    path: path.relative(kidscheduleRoot, outPath),
  });
}

await browser.close();

// --- Videos from get-app demo ---
const sourceVideo = path.resolve(kidscheduleRoot, "public/promo/get-app/demo-15s.mp4");
const verticalOut = path.join(videosDir, "01-vertical-15s-9x16.mp4");
const horizontalOut = path.join(videosDir, "02-horizontal-15s-16x9.mp4");

function runFfmpeg(args) {
  const result = spawnSync("ffmpeg", ["-y", ...args], { encoding: "utf8" });
  if (result.status !== 0) {
    console.error(result.stderr);
    throw new Error(`ffmpeg failed: ${args.join(" ")}`);
  }
}

// Vertical 9:16 (1080×1920) — best for Discover/YouTube Shorts placements
runFfmpeg([
  "-i", sourceVideo,
  "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x07050f",
  "-c:v", "libx264", "-preset", "medium", "-crf", "23",
  "-c:a", "aac", "-b:a", "128k",
  "-movflags", "+faststart",
  verticalOut,
]);
console.log(`✓ videos/01-vertical-15s-9x16.mp4 (1080×1920, 9:16, ~15s)`);
index.push({
  type: "video",
  id: "video-vertical",
  filename: "01-vertical-15s-9x16.mp4",
  width: 1080,
  height: 1920,
  ratio: "9:16",
  durationSec: 15,
  path: path.relative(kidscheduleRoot, verticalOut),
});

// Horizontal 16:9 (1280×720) — Display & YouTube in-stream
runFfmpeg([
  "-i", sourceVideo,
  "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x07050f",
  "-c:v", "libx264", "-preset", "medium", "-crf", "23",
  "-c:a", "aac", "-b:a", "128k",
  "-movflags", "+faststart",
  horizontalOut,
]);
console.log(`✓ videos/02-horizontal-15s-16x9.mp4 (1280×720, 16:9, ~15s)`);
index.push({
  type: "video",
  id: "video-horizontal",
  filename: "02-horizontal-15s-16x9.mp4",
  width: 1280,
  height: 720,
  ratio: "16:9",
  durationSec: 15,
  path: path.relative(kidscheduleRoot, horizontalOut),
});

const copySuggestions = {
  headlines: [
    "AmyNest AI Parenting Coach",
    "Calm Daily Parenting Wins",
    "AI Routines For Your Child",
    "Free Infant Hub · 0–24 Mo",
    "Speech Coach For Kids",
  ],
  descriptions: [
    "Routines, speech, nutrition & infant care. Free on Google Play.",
    "Turn parenting chaos into calm. AI coach built for Indian families.",
    "Personalized plans for sleep, meals, tantrums & learning.",
    "Download free — privacy first, no ads shown to children.",
    "From newborn to school age. One app, whole family.",
  ],
  finalUrl: "https://www.amynest.in/get-app",
  playStoreUrl: "https://play.google.com/store/apps/details?id=com.amynest.app",
};

const indexPath = path.join(outputRoot, "index.json");
await writeFile(
  indexPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      campaign: "AmyNest AI — Google Ads (get-app)",
      copySuggestions,
      assets: index,
    },
    null,
    2,
  ),
);

console.log(`\nDone — ${index.filter((a) => a.type === "image").length} images + ${index.filter((a) => a.type === "video").length} videos`);
console.log(`Folder: ${path.relative(kidscheduleRoot, outputRoot)}/`);

#!/usr/bin/env node
/**
 * Generate Instagram Reel covers + carousel slides from app screenshots.
 *
 * Usage:
 *   node scripts/generate-social-assets.mjs
 *   node scripts/generate-social-assets.mjs --pack parenting-pain
 *   node scripts/generate-social-assets.mjs --from-input
 *
 * Output: public/promo/social/{reels,carousels}/ + index.json
 */
import { chromium } from "@playwright/test";
import { readFile, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const kidscheduleRoot = path.resolve(__dirname, "..");
const publicDir = path.join(kidscheduleRoot, "public");
const manifestPath = path.join(__dirname, "social-assets-manifest.json");
const templatePath = path.join(publicDir, "social-asset-template.html");
const templateHtml = await readFile(templatePath, "utf8");

const FORMATS = {
  portrait: { width: 1080, height: 1350 },
  square: { width: 1080, height: 1080 },
  reel: { width: 1080, height: 1920 },
};

const SIZE_PRESETS = {
  portrait: {
    pad: 48,
    gapSm: 20,
    gapMd: 28,
    logo: 52,
    brandSize: 22,
    pillSize: 11,
    eyebrow: 12,
    h1: 46,
    sub: 20,
    phoneW: 300,
    phoneH: 620,
    compareTitle: 20,
    compareItem: 16,
    ctaSize: 22,
    urlSize: 28,
    footerSize: 14,
  },
  square: {
    pad: 44,
    gapSm: 16,
    gapMd: 22,
    logo: 48,
    brandSize: 20,
    pillSize: 10,
    eyebrow: 11,
    h1: 40,
    sub: 18,
    phoneW: 250,
    phoneH: 520,
    compareTitle: 18,
    compareItem: 14,
    ctaSize: 20,
    urlSize: 24,
    footerSize: 13,
  },
  reel: {
    pad: 56,
    gapSm: 24,
    gapMd: 32,
    logo: 56,
    brandSize: 24,
    pillSize: 12,
    eyebrow: 13,
    h1: 52,
    sub: 22,
    phoneW: 340,
    phoneH: 700,
    compareTitle: 22,
    compareItem: 17,
    ctaSize: 24,
    urlSize: 32,
    footerSize: 15,
  },
};

const args = process.argv.slice(2);
const packFilter = args.includes("--pack") ? args[args.indexOf("--pack") + 1] : null;
const fromInputOnly = args.includes("--from-input");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const outputDir = path.resolve(kidscheduleRoot, manifest.outputDir);
const logoPath = path.resolve(kidscheduleRoot, manifest.defaults.logo);
const logoDataUrl = `data:image/png;base64,${Buffer.from(await readFile(logoPath)).toString("base64")}`;

/** @type {Map<string, string>} */
const screenshotCache = new Map();

async function loadScreenshot(ref) {
  if (!ref) return "";
  if (screenshotCache.has(ref)) return screenshotCache.get(ref);
  const rel = manifest.screenshotSources[ref];
  if (!rel) throw new Error(`Unknown screenshot ref: ${ref}`);
  const abs = path.resolve(__dirname, rel);
  const buf = await readFile(abs);
  const ext = path.extname(abs).toLowerCase();
  const mime = ext === ".png" ? "image/png" : "image/jpeg";
  const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
  screenshotCache.set(ref, dataUrl);
  return dataUrl;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildConfig(variant, formatKey, slide, index, total) {
  const format = FORMATS[formatKey] ?? FORMATS.portrait;
  const sizes = { ...format, ...SIZE_PRESETS[formatKey] ?? SIZE_PRESETS.portrait };

  return {
    variant,
    sizes,
    logoDataUrl,
    footer: manifest.defaults.footer,
    ctaUrl: manifest.defaults.ctaUrl,
    eyebrow: slide.eyebrow,
    headline: slide.headline,
    headlineAccent: slide.headlineAccent,
    subheadline: slide.subheadline,
    accent: slide.accent,
    screenshotDataUrl: slide._screenshotDataUrl || "",
    slideLabel: slide.slideLabel || (total ? `${index + 1} / ${total}` : ""),
    them: slide.them,
    us: slide.us,
    themTitle: slide.themTitle,
    usTitle: slide.usTitle,
    badge: slide.badge,
  };
}

async function renderAsset(page, config) {
  await page.setViewportSize({ width: config.sizes.width, height: config.sizes.height });
  await page.setContent(templateHtml, { waitUntil: "domcontentloaded" });
  await page.evaluate((cfg) => {
    window.SOCIAL_CONFIG = cfg;
    render(cfg);
  }, config);
  await page.waitForTimeout(250);
  return page.screenshot({ type: "png" });
}

async function writeAsset(page, outPath, config) {
  await mkdir(path.dirname(outPath), { recursive: true });
  const png = await renderAsset(page, config);
  await writeFile(outPath, png);
  return outPath;
}

function titleFromFilename(name) {
  return name
    .replace(/\.(png|jpe?g|webp)$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** @type {Array<Record<string, unknown>>} */
const index = [];

async function generateCarousels(page) {
  for (const pack of manifest.carouselPacks) {
    if (packFilter && pack.id !== packFilter) continue;

    const formatKey = pack.format === "square" ? "square" : "portrait";
    const packDir = path.join(outputDir, "carousels", pack.id);

    for (let i = 0; i < pack.slides.length; i++) {
      const slide = pack.slides[i];
      const slideNum = String(i + 1).padStart(2, "0");
      const slug = slide.variant === "marketing"
        ? slugify(slide.slideLabel || `slide-${i + 1}`)
        : slugify(slide.headlineAccent || slide.headline || slide.variant);
      const filename = `${slideNum}-${slug}.png`;
      const outPath = path.join(packDir, filename);

      const enriched = { ...slide };
      if (slide.screenshot) {
        enriched._screenshotDataUrl = await loadScreenshot(slide.screenshot);
      }

      const config = buildConfig(slide.variant, formatKey, enriched, i, pack.slides.length);
      await writeAsset(page, outPath, config);
      console.log(`✓ carousels/${pack.id}/${filename}`);
      index.push({
        type: "carousel",
        pack: pack.id,
        packName: pack.name,
        slide: i + 1,
        total: pack.slides.length,
        variant: slide.variant,
        path: path.relative(kidscheduleRoot, outPath),
        format: formatKey,
      });
    }
  }
}

async function generateReels(page) {
  for (const reel of manifest.reelCovers) {
    if (packFilter && reel.id !== packFilter) continue;

    const enriched = {
      ...reel,
      variant: "reel",
      _screenshotDataUrl: reel.screenshot ? await loadScreenshot(reel.screenshot) : "",
    };
    const outPath = path.join(outputDir, "reels", `${reel.id}.png`);
    const config = buildConfig("reel", "reel", enriched, 0, 0);
    await writeAsset(page, outPath, config);
    console.log(`✓ reels/${reel.id}.png`);
    index.push({
      type: "reel",
      id: reel.id,
      headline: `${reel.headline} ${reel.headlineAccent || ""}`.trim(),
      path: path.relative(kidscheduleRoot, outPath),
    });
  }
}

async function generateFromInputDir(page) {
  const cfg = manifest.autoFromInputDir;
  if (!cfg?.enabled) return;

  const inputDir = path.resolve(kidscheduleRoot, cfg.inputDir);
  let files;
  try {
    files = (await readdir(inputDir)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
  } catch {
    return;
  }
  if (files.length === 0) return;

  for (const file of files.sort()) {
    const abs = path.join(inputDir, file);
    const ext = path.extname(abs).toLowerCase();
    const mime = ext === ".png" ? "image/png" : "image/jpeg";
    const dataUrl = `data:${mime};base64,${Buffer.from(await readFile(abs)).toString("base64")}`;
    const base = slugify(path.basename(file, ext));
    const title = titleFromFilename(file);

    if (cfg.formats.includes("reel")) {
      const slide = {
        variant: "reel",
        eyebrow: cfg.defaultEyebrow,
        headline: title,
        headlineAccent: "",
        subheadline: "Personalized routines, learning & speech — free to start.",
        badge: cfg.defaultBadge,
        _screenshotDataUrl: dataUrl,
      };
      const outPath = path.join(outputDir, "reels", `auto-${base}.png`);
      await writeAsset(page, outPath, buildConfig("reel", "reel", slide, 0, 0));
      console.log(`✓ reels/auto-${base}.png (from ${file})`);
      index.push({ type: "reel", id: `auto-${base}`, source: file, path: path.relative(kidscheduleRoot, outPath), auto: true });
    }

    if (cfg.formats.includes("carousel-portrait")) {
      const slide = {
        variant: "feature",
        eyebrow: cfg.defaultEyebrow,
        headline: title,
        headlineAccent: "",
        subheadline: "See how AmyNest AI supports your child's daily growth.",
        _screenshotDataUrl: dataUrl,
        accent: "#a855f7",
      };
      const outPath = path.join(outputDir, "carousels", "auto-input", `${base}.png`);
      await writeAsset(page, outPath, buildConfig("feature", "portrait", slide, 0, 0));
      console.log(`✓ carousels/auto-input/${base}.png (from ${file})`);
      index.push({ type: "carousel", pack: "auto-input", source: file, path: path.relative(kidscheduleRoot, outPath), auto: true });
    }
  }
}

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

if (!fromInputOnly) {
  await generateCarousels(page);
  await generateReels(page);
}
await generateFromInputDir(page);

await browser.close();

const indexPath = path.join(outputDir, "index.json");
await writeFile(indexPath, JSON.stringify({ generatedAt: new Date().toISOString(), assets: index }, null, 2));
console.log(`\nDone — ${index.length} assets → ${path.relative(kidscheduleRoot, outputDir)}/`);
console.log(`Index: ${path.relative(kidscheduleRoot, indexPath)}`);

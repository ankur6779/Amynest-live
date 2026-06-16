#!/usr/bin/env node
/**
 * prune-ios-www.mjs
 *
 * Strips marketing mirrors, upload artifacts, and other dead weight from the
 * Capacitor iOS www/ bundle after copy-www.mjs. Does NOT modify kidschedule/public/.
 *
 * Protected (never removed):
 *   - discovery-worlds-audio/  (offline Discovery Worlds fallback)
 *   - infant-sleep-audio/
 *   - audio-pack/
 */
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const www = resolve(__dirname, "../www");

/** @type {readonly string[]} */
const REMOVE_PATHS = [
  // Runtime audit: no client references — GCS/API mirrors only
  "animal-world-audio",
  "world-visuals",

  // Client downloads via /api/phonics/workbook/download — not static www
  "phonics-mastery-15-sets.pdf",

  // Marketing / ASO (web routes exist in app but assets not needed in native bundle)
  "promo",
  "landing",

  // 3D disabled (ENABLE_LIVE_3D=false); portrait PNGs/WebP kept
  "amy-3d/amy.glb",

  // Store / SEO static pages
  "appstore.html",
  "appstore-ipad.html",
  "appstore-infant-parenting.html",
  "social-asset-template.html",
  "amynest-review-screenshot.html",
  "google-ads-asset-template.html",
  "robots.txt",
  "sitemap.xml",

  // App Store review / marketing screenshots (not referenced in src/)
  "amynest-review-info.png",
  "amynest-review-info-compact.png",
  "amynest-appstore-1024.png",
  "amynest-hero-logo.png",
  "amynest-tap-to-download.png",

  // Platform-specific / duplicate marketing
  "android-icons",

  // QA / upload manifests (scripts only)
  "discovery-worlds-visual-upload-manifest.json",
  "discovery-worlds-audio-qa.json",
  "discovery-worlds-audio-missing-manifest.json",
  "discovery-worlds-audio-by-world.json",
  "discovery-worlds-coverage.json",
  "discovery-worlds-launch-scorecard.json",
  "animal-world-real-photo-report.json",
  "animal-world-real-photo-coverage.json",
];

/** @type {readonly string[]} */
const PROTECTED_PATHS = [
  "discovery-worlds-audio",
  "infant-sleep-audio",
  "audio-pack",
];

function dirSizeBytes(root) {
  if (!existsSync(root)) return 0;
  let total = 0;
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const ent of readdirSync(current, { withFileTypes: true })) {
      const p = resolve(current, ent.name);
      if (ent.isDirectory()) stack.push(p);
      else if (ent.isFile()) total += statSync(p).size;
    }
  }
  return total;
}

function formatMb(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function assertProtected() {
  for (const rel of PROTECTED_PATHS) {
    const p = resolve(www, rel);
    if (!existsSync(p)) {
      console.error(`\n❌  Protected path missing after prune: ${rel}`);
      console.error("    Abort — bundle would break runtime features.\n");
      process.exit(1);
    }
  }
}

function prune() {
  if (!existsSync(www)) {
    console.error(`\n❌  www/ not found: ${www}\n`);
    process.exit(1);
  }

  const before = dirSizeBytes(www);
  console.log(`\n📦  iOS www prune — before: ${formatMb(before)}`);

  let removedCount = 0;
  let removedBytes = 0;

  for (const rel of REMOVE_PATHS) {
    const p = resolve(www, rel);
    if (!existsSync(p)) continue;
    const st = statSync(p);
    const size = st.isDirectory() ? dirSizeBytes(p) : st.size;
    rmSync(p, { recursive: true, force: true });
    removedBytes += size;
    removedCount += 1;
    console.log(`  ✂️  ${rel} (${formatMb(size)})`);
  }

  assertProtected();

  const after = dirSizeBytes(www);
  console.log(`\n✅  iOS www prune complete`);
  console.log(`    Removed: ${removedCount} paths, ${formatMb(removedBytes)} saved`);
  console.log(`    After:   ${formatMb(after)} (was ${formatMb(before)})\n`);

  return { before, after, removedBytes, removedCount };
}

prune();

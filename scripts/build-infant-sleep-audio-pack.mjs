#!/usr/bin/env node
/**
 * Build infant sleep audio pack — minimal valid MP3 placeholders for offline dev/CI.
 * Replace with production recordings before store release.
 *
 *   node scripts/build-infant-sleep-audio-pack.mjs [--force]
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const packRoot = join(repoRoot, "artifacts/kidschedule/public/infant-sleep-audio");
const catalogPath = join(repoRoot, "artifacts/kidschedule/src/data/infant-sleep-catalog.ts");
const poemsPath = join(repoRoot, "artifacts/kidschedule/src/data/infant-poems.ts");

const force = process.argv.includes("--force");

/** Smallest valid MPEG1 Layer 3 frame (silence-ish stub). */
const MINIMAL_MP3 = Buffer.from([
  0xff, 0xfb, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

function extractAssetPaths(fileContent) {
  const paths = new Set();
  const re = /assetPath:\s*"([^"]+\.mp3)"/g;
  let m;
  while ((m = re.exec(fileContent)) !== null) paths.add(m[1]);
  const poemRe = /infantSleepAssetUrl\("([^"]+\.mp3)"\)/g;
  while ((m = poemRe.exec(fileContent)) !== null) paths.add(m[1]);
  return [...paths];
}

function writeMp3(outPath, durationSec = 30) {
  if (!force && existsSync(outPath)) return;
  mkdirSync(dirname(outPath), { recursive: true });
  try {
    execSync(
      `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t ${durationSec} -q:a 9 -acodec libmp3lame "${outPath}"`,
      { stdio: "ignore" },
    );
  } catch {
    writeFileSync(outPath, MINIMAL_MP3);
  }
}

const catalogSrc = readFileSync(catalogPath, "utf8");
const poemsSrc = readFileSync(poemsPath, "utf8");
const assetPaths = extractAssetPaths(catalogSrc + poemsSrc);

for (const rel of assetPaths) {
  const out = join(packRoot, rel);
  const isStory = rel.includes("/stories/");
  const isLoop = rel.includes("white-noise");
  writeMp3(out, isStory ? 180 : isLoop ? 90 : 45);
}

const manifestItems = assetPaths.map((assetPath) => {
  const packId = assetPath.includes("extended-v1") ? "extended-v1" : "core-v1";
  const id = assetPath.replace(/^.*\//, "").replace(/\.mp3$/, "");
  return { id, assetPath, packId };
});

const manifest = {
  version: 1,
  packId: "core-v1",
  generatedAt: new Date().toISOString(),
  items: manifestItems,
  packs: {
    "core-v1": { label: "Core Sleep Pack", bundled: true, estimatedMb: 12 },
    "extended-v1": { label: "Extended Sleep Pack", bundled: false, estimatedMb: 8 },
  },
};

mkdirSync(packRoot, { recursive: true });
writeFileSync(join(packRoot, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Infant sleep pack: ${assetPaths.length} MP3 files under ${packRoot}`);

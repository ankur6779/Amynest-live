#!/usr/bin/env node
/**
 * Release gate: bundled audio-pack must not be stub tier and must have real distinct clips.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "artifacts/kidschedule/public/audio-pack",
);

const manifest = JSON.parse(readFileSync(join(packRoot, "manifest.json"), "utf8"));

if (manifest.tier === "stub") {
  console.error("FAIL: audio-pack manifest tier is stub — run pnpm run build:audio-pack --force");
  process.exit(1);
}

const hashes = new Map();
let mp3Count = 0;
for (const name of readdirSync(packRoot)) {
  const p = join(packRoot, name);
  if (!statSync(p).isDirectory()) continue;
  for (const fn of readdirSync(p)) {
    if (!fn.endsWith(".mp3")) continue;
    mp3Count += 1;
    const buf = readFileSync(join(p, fn));
    const h = createHash("sha256").update(buf).digest("hex");
    hashes.set(h, (hashes.get(h) ?? 0) + 1);
  }
}

const entryCount = Object.keys(manifest.entries ?? {}).length;
const unique = hashes.size;

if (mp3Count < 40 || entryCount < 40) {
  console.error(`FAIL: pack too small (${mp3Count} mp3, ${entryCount} manifest keys)`);
  process.exit(1);
}

if (unique < 30) {
  console.error(`FAIL: pack has only ${unique} unique clips across ${mp3Count} files`);
  process.exit(1);
}

console.log(
  `OK: audio-pack tier=${manifest.tier} mp3=${mp3Count} entries=${entryCount} unique=${unique}`,
);

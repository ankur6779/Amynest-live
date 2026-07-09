#!/usr/bin/env node
/**
 * Release gate: bundled audio-pack must be non-stub, unique, checksum-valid,
 * with no orphans / broken manifest refs / curriculum gaps.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "artifacts/kidschedule/public/audio-pack",
);

const CURRICULUM_MUST = [
  "sat", "fox", "mop", "top", "fin", "win", "lip", "zip", "kid", "lid",
  "pat", "hop", "pop", "jet",
  "try again", "great job!", "well done",
];

const errors = [];
const warnings = [];

function fail(msg) {
  errors.push(msg);
}

function warn(msg) {
  warnings.push(msg);
}

if (!existsSync(join(packRoot, "manifest.json"))) {
  console.error("FAIL: manifest.json missing");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(join(packRoot, "manifest.json"), "utf8"));

if (manifest.tier === "stub") {
  fail("audio-pack manifest tier is stub — run pnpm run build:audio-pack --force");
}

const entries = manifest.entries ?? {};
const entryCount = Object.keys(entries).length;
const hashes = new Map();
const fileToHash = new Map();
let mp3Count = 0;
let totalBytes = 0;
const onDisk = new Set();

for (const name of readdirSync(packRoot)) {
  const p = join(packRoot, name);
  if (!statSync(p).isDirectory()) continue;
  for (const fn of readdirSync(p)) {
    if (!fn.endsWith(".mp3")) continue;
    const rel = `${name}/${fn}`;
    onDisk.add(rel);
    mp3Count += 1;
    const buf = readFileSync(join(p, fn));
    totalBytes += buf.length;
    if (buf.length < 2000) {
      fail(`corrupt/placeholder clip too small: ${rel} (${buf.length} bytes)`);
    }
    const h = createHash("sha256").update(buf).digest("hex");
    fileToHash.set(rel, h);
    hashes.set(h, (hashes.get(h) ?? 0) + 1);
  }
}

const unique = hashes.size;
const maxDup = Math.max(0, ...hashes.values());

if (mp3Count < 40 || entryCount < 40) {
  fail(`pack too small (${mp3Count} mp3, ${entryCount} manifest keys)`);
}

if (manifest.tier === "core" && mp3Count < 100) {
  fail(`core pack too small (${mp3Count} mp3, need >= 100)`);
}

if (unique < 30) {
  fail(`pack has only ${unique} unique clips across ${mp3Count} files`);
}

if (maxDup > 5) {
  fail(`excessive duplicate content: maxDup=${maxDup} (possible stub pack)`);
}

// Broken manifest refs
for (const [key, rel] of Object.entries(entries)) {
  if (!onDisk.has(rel)) {
    fail(`manifest entry missing file: ${key} → ${rel}`);
  }
}

// Orphans
for (const rel of onDisk) {
  if (![...Object.values(entries)].includes(rel)) {
    warn(`orphan file not in manifest: ${rel}`);
  }
}

// Curriculum must-have keys present in pack (any category)
const packIds = new Set(
  Object.keys(entries).map((k) => k.split(":").slice(1).join(":").toLowerCase()),
);
const missingCurriculum = CURRICULUM_MUST.filter((w) => !packIds.has(w.toLowerCase()));
if (missingCurriculum.length > 0) {
  fail(`missing curriculum pack keys: ${missingCurriculum.join(", ")}`);
}

// Checksum manifest (optional field)
if (manifest.checksums) {
  for (const [rel, expected] of Object.entries(manifest.checksums)) {
    const actual = fileToHash.get(rel);
    if (!actual) fail(`checksum for missing file: ${rel}`);
    else if (actual !== expected) fail(`checksum mismatch: ${rel}`);
  }
}

// Version field
if (!manifest.version && !manifest.tier) {
  fail("manifest missing version/tier");
}

if (errors.length > 0) {
  console.error("FAIL: audio-pack validation");
  for (const e of errors) console.error(`  - ${e}`);
  for (const w of warnings) console.warn(`  ! ${w}`);
  process.exit(1);
}

console.log(
  `OK: audio-pack tier=${manifest.tier} mp3=${mp3Count} entries=${entryCount} unique=${unique} maxDup=${maxDup} bytes=${totalBytes}`,
);
for (const w of warnings) console.warn(`  ! ${w}`);

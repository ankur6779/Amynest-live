#!/usr/bin/env node
/**
 * One-time build: download static clips into kidschedule/public/audio-pack (no runtime network).
 *
 *   node scripts/build-local-audio-pack.mjs [--tier minimal|full] [--spelling-limit 500]
 *
 * minimal: letters + CVC_WORDS + coach warmup + spelling common (~80 files)
 * full: entire phonics catalog + top spelling words from seed banks
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const packRoot = join(repoRoot, "artifacts/kidschedule/public/audio-pack");
const staticMapPath = join(repoRoot, "artifacts/kidschedule/src/data/static-audio-map.json");

const tier = process.argv.includes("--tier")
  ? process.argv[process.argv.indexOf("--tier") + 1]
  : "minimal";
const spellingLimit = Number(
  process.argv.includes("--spelling-limit")
    ? process.argv[process.argv.indexOf("--spelling-limit") + 1]
    : tier === "full"
      ? 500
      : 60,
);

const phonicsMap = JSON.parse(readFileSync(staticMapPath, "utf8")).phonics ?? {};

const LETTER_ALIAS = {
  a: "a as in apple",
  e: "e as in egg",
  i: "i as in igloo",
  o: "o as in octopus",
  u: "u as in umbrella",
};

const CVC_WORDS = [
  "cat", "bat", "mat", "sat", "pat", "dog", "log", "fog", "pen", "hen", "ten",
  "sit", "hit", "cup", "sun", "hat", "rat", "pig", "bed", "bus",
];

const COACH_LINES = [
  "Good job!",
  "Try again",
  "Well done",
  "Listen carefully",
  "Great job!",
  "Your turn.",
  "Listen and repeat.",
  "Let's try that again.",
  "I'm listening.",
  "Can you say this?",
  "Say it with me.",
  "That was excellent.",
  "Nice try.",
  "Let's begin!",
  "Ready? Let's start!",
  "Take your time.",
];

const SPELLING_SEED = [
  "cat", "dog", "sun", "hat", "bat", "pig", "cup", "bus", "bed", "pen", "run", "fun",
  "hen", "ten", "red", "big", "log", "fog", "jam", "map", "tap", "sat", "mat", "rat",
];

function slug(s) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function gcsUrlForPhonicsKey(key) {
  return phonicsMap[key] ?? phonicsMap[LETTER_ALIAS[key] ?? ""] ?? null;
}

async function downloadToFile(gcsUrl, destPath) {
  if (existsSync(destPath)) return true;
  const res = await fetch(gcsUrl);
  if (!res.ok) return false;
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, buf);
  return true;
}

const entries = {};
let ok = 0;
let fail = 0;

async function addEntry(category, id, gcsUrl) {
  if (!gcsUrl) {
    fail += 1;
    console.warn(`skip missing gcs: ${category}:${id}`);
    return;
  }
  const file = `${category}/${slug(id)}.mp3`;
  const dest = join(packRoot, file);
  const rel = file;
  const got = await downloadToFile(gcsUrl, dest);
  if (!got) {
    fail += 1;
    console.warn(`download failed: ${category}:${id}`);
    return;
  }
  entries[`${category}:${id.trim().toLowerCase()}`] = rel;
  entries[`${category}:${id.trim()}`] = rel;
  ok += 1;
}

async function main() {
  mkdirSync(packRoot, { recursive: true });

  const letters =
    tier === "full"
      ? Object.keys(phonicsMap)
      : ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "r", "s", "t", "u", "v", "w", "y", "z", "sh", "ch", "th1", "ng"];

  for (const L of letters) {
    const phrase = LETTER_ALIAS[L] ?? L;
    await addEntry("phonics-letter", L, gcsUrlForPhonicsKey(phrase) ?? gcsUrlForPhonicsKey(L));
    if (LETTER_ALIAS[L]) {
      await addEntry("phonics-letter", LETTER_ALIAS[L], gcsUrlForPhonicsKey(LETTER_ALIAS[L]));
    }
  }

  const words = tier === "full" ? Object.keys(phonicsMap).filter((k) => k.length <= 5 && !k.includes(" ")) : CVC_WORDS;
  for (const w of words) {
    await addEntry("phonics-word", w, gcsUrlForPhonicsKey(w));
  }

  for (const line of COACH_LINES) {
    const fromDefault = JSON.parse(readFileSync(staticMapPath, "utf8")).default?.[line];
    await addEntry("coach", line, fromDefault ?? phonicsMap[line]);
  }

  const spellingWords = [...new Set([...SPELLING_SEED, ...CVC_WORDS])].slice(0, spellingLimit);
  for (const w of spellingWords) {
    const url =
      gcsUrlForPhonicsKey(w) ??
      JSON.parse(readFileSync(staticMapPath, "utf8")).default?.[w];
    await addEntry("spelling", w, url);
  }

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    tier,
    entries,
  };
  writeFileSync(join(packRoot, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`Pack: ${ok} ok, ${fail} failed, ${Object.keys(entries).length} manifest keys → ${packRoot}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
